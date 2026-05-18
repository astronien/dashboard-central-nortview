import { createClient, type Client } from "@libsql/client";
import {
  KIND_TABLE,
  UPLOAD_KINDS,
  ensureSchema,
  type UploadKind,
} from "./schema";
import { compressJson, decompressJson } from "./compress";

export type RawRow = Record<string, string | number | undefined>;
export type UploadPayload = Record<UploadKind, RawRow[]>;

const CHUNK_ROW_LIMIT = 1500;

const emptyPayload = (): UploadPayload => ({
  target: [],
  current: [],
  lastMonth: [],
  lastYear: [],
  categoryMaster: [],
});

let client: Client | null = null;

export const getDb = (): Client => {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables.",
    );
  }

  if (!client) {
    client = createClient({ url, authToken });
  }

  return client;
};

const initDb = async () => {
  const db = getDb();
  await ensureSchema((sql) => db.execute(sql));
  return db;
};

const chunkTable = (kind: UploadKind) => `${KIND_TABLE[kind]}_chunks`;

const splitRows = (rows: RawRow[]) => {
  const chunks: RawRow[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_ROW_LIMIT) {
    chunks.push(rows.slice(i, i + CHUNK_ROW_LIMIT));
  }
  return chunks.length ? chunks : [];
};

export const loadUploadKind = async (kind: UploadKind): Promise<RawRow[]> => {
  const db = await initDb();
  const table = chunkTable(kind);
  const result = await db.execute({
    sql: `SELECT rows_json FROM ${table} ORDER BY chunk_index ASC`,
    args: [],
  });

  if (!result.rows.length) {
    const legacy = await db.execute({
      sql: `SELECT rows_json FROM ${KIND_TABLE[kind]} WHERE id = 1`,
      args: [],
    });
    if (!legacy.rows.length) return [];

    const raw = legacy.rows[0].rows_json;
    if (typeof raw !== "string" || !raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      const rows = parsed as RawRow[];
      await saveUploadKind(kind, rows);
      return rows;
    } catch {
      return [];
    }
  }

  const rows: RawRow[] = [];
  for (const entry of result.rows) {
    const encoded = entry.rows_json;
    if (typeof encoded !== "string" || !encoded) continue;
    const parsed = decompressJson<RawRow[]>(encoded);
    if (Array.isArray(parsed)) rows.push(...parsed);
  }

  return rows;
};

export const loadAllUploads = async (): Promise<UploadPayload> => {
  const payload = emptyPayload();
  for (const kind of UPLOAD_KINDS) {
    payload[kind] = await loadUploadKind(kind);
  }
  return payload;
};

export const saveUploadKindChunk = async (
  kind: UploadKind,
  chunkIndex: number,
  chunkCount: number,
  rows: RawRow[],
) => {
  const db = await initDb();
  const table = chunkTable(kind);

  if (chunkIndex === 0) {
    await db.execute(`DELETE FROM ${table}`);
  }

  await db.execute({
    sql: `INSERT INTO ${table} (chunk_index, rows_json, row_count) VALUES (?, ?, ?)`,
    args: [chunkIndex, compressJson(rows), rows.length],
  });

  if (chunkIndex !== chunkCount - 1) return;

  const legacyTable = KIND_TABLE[kind];
  await db.execute(`DELETE FROM ${legacyTable}`);
};

export const saveUploadKind = async (kind: UploadKind, rows: RawRow[]) => {
  const db = await initDb();
  const table = chunkTable(kind);
  const chunks = splitRows(rows);

  await db.execute(`DELETE FROM ${table}`);
  await db.execute(`DELETE FROM ${KIND_TABLE[kind]}`);

  if (!chunks.length) return;

  const statements = chunks.map((chunk, chunkIndex) => ({
    sql: `INSERT INTO ${table} (chunk_index, rows_json, row_count) VALUES (?, ?, ?)`,
    args: [chunkIndex, compressJson(chunk), chunk.length],
  }));

  await db.batch(statements, "write");
};

export const saveAllUploads = async (payload: UploadPayload) => {
  for (const kind of UPLOAD_KINDS) {
    await saveUploadKind(kind, payload[kind] ?? []);
  }
};

export const clearUploadKind = async (kind: UploadKind) => {
  const db = await initDb();
  await db.execute(`DELETE FROM ${chunkTable(kind)}`);
  await db.execute(`DELETE FROM ${KIND_TABLE[kind]}`);
};
