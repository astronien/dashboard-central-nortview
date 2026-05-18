export const UPLOAD_KINDS = [
  "target",
  "current",
  "lastMonth",
  "lastYear",
  "categoryMaster",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const KIND_TABLE: Record<UploadKind, string> = {
  target: "upload_target",
  current: "upload_current",
  lastMonth: "upload_last_month",
  lastYear: "upload_last_year",
  categoryMaster: "upload_category_master",
};

export const isUploadKind = (value: string): value is UploadKind =>
  (UPLOAD_KINDS as readonly string[]).includes(value);

const TABLE_DDL: Record<UploadKind, string> = {
  target: `
    CREATE TABLE IF NOT EXISTS upload_target (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  current: `
    CREATE TABLE IF NOT EXISTS upload_current (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  lastMonth: `
    CREATE TABLE IF NOT EXISTS upload_last_month (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  lastYear: `
    CREATE TABLE IF NOT EXISTS upload_last_year (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  categoryMaster: `
    CREATE TABLE IF NOT EXISTS upload_category_master (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      file_name TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
};

let schemaReady: Promise<void> | null = null;

export const ensureSchema = async (
  execute: (sql: string) => Promise<unknown>,
) => {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const kind of UPLOAD_KINDS) {
        await execute(TABLE_DDL[kind]);
      }
    })();
  }
  await schemaReady;
};
