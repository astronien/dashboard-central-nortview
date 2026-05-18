import { createClient, type Client } from "@libsql/client";
import {
  KIND_TABLE,
  UPLOAD_KINDS,
  ensureSchema,
  type UploadKind,
} from "./schema";

export type RawRow = Record<string, string | number | undefined>;

export type UploadPayload = Record<UploadKind, RawRow[]>;

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

export const loadAllUploads = async (): Promise<UploadPayload> => {
  const db = await initDb();
  const payload = emptyPayload();

  for (const kind of UPLOAD_KINDS) {
    const table = KIND_TABLE[kind];
    const result = await db.execute({
      sql: `SELECT rows_json FROM ${table} WHERE id = 1`,
      args: [],
    });

    if (!result.rows.length) continue;

    const raw = result.rows[0].rows_json;
    if (typeof raw !== "string" || !raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        payload[kind] = parsed as RawRow[];
      }
    } catch {
      payload[kind] = [];
    }
  }

  return payload;
};

export const saveAllUploads = async (payload: UploadPayload) => {
  const db = await initDb();
  const statements = UPLOAD_KINDS.flatMap((kind) => {
    const table = KIND_TABLE[kind];
    const rows = payload[kind] ?? [];

    if (!rows.length) {
      return [{ sql: `DELETE FROM ${table}`, args: [] as never[] }];
    }

    return [
      { sql: `DELETE FROM ${table}`, args: [] as never[] },
      {
        sql: `INSERT INTO ${table} (id, file_name, rows_json, row_count) VALUES (1, ?, ?, ?)`,
        args: ["uploaded-data", JSON.stringify(rows), rows.length],
      },
    ];
  });

  await db.batch(statements, "write");
};

export const clearUploadKind = async (kind: UploadKind) => {
  const db = await initDb();
  const table = KIND_TABLE[kind];
  await db.execute(`DELETE FROM ${table}`);
};
