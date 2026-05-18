import { createClient, type Client } from "@libsql/client/web";
import { getTursoConfig } from "./env";
import {
  KIND_TABLE,
  UPLOAD_KINDS,
  ensureSchema,
  type UploadKind,
} from "./schema";
import { compressJson, tryDecompressJson } from "./compress";

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
  if (!client) {
    const { url, authToken } = getTursoConfig();
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

const parseStoredRows = (encoded: string): RawRow[] => {
  const decompressed = tryDecompressJson<RawRow[]>(encoded);
  if (Array.isArray(decompressed)) return decompressed;

  try {
    const parsed = JSON.parse(encoded) as unknown;
    return Array.isArray(parsed) ? (parsed as RawRow[]) : [];
  } catch {
    return [];
  }
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

    const rows = parseStoredRows(raw);
    if (rows.length) await saveUploadKind(kind, rows);
    return rows;
  }

  const rows: RawRow[] = [];
  for (const entry of result.rows) {
    const encoded = entry.rows_json;
    if (typeof encoded !== "string" || !encoded) continue;
    rows.push(...parseStoredRows(encoded));
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

  await db.execute(`DELETE FROM ${KIND_TABLE[kind]}`);
};

export const saveUploadKind = async (kind: UploadKind, rows: RawRow[]) => {
  const db = await initDb();
  const table = chunkTable(kind);
  const chunks = splitRows(rows);

  await db.execute(`DELETE FROM ${table}`);
  await db.execute(`DELETE FROM ${KIND_TABLE[kind]}`);

  if (!chunks.length) return;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    await db.execute({
      sql: `INSERT INTO ${table} (chunk_index, rows_json, row_count) VALUES (?, ?, ?)`,
      args: [chunkIndex, compressJson(chunk), chunk.length],
    });
  }
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
