/**
 * Cloud storage — Turso-backed persistence for KPI presets and uploaded
 * Excel files. Replaces the IndexedDB-based storage so data is shared
 * across devices and survives browser data clears.
 *
 * Schema lives in tursoClient.ts SCHEMA_SQL. The browser hits Turso
 * directly via libSQL's HTTP transport; no API server needed.
 */
import { getTursoClient, initSchema } from "./auth/tursoClient";

// Run schema migration once on module load. CREATE TABLE IF NOT EXISTS
// is idempotent so this is safe to call on every page load.
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((e) => {
      // Reset so a future call can retry (e.g. if Turso was temporarily down)
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}
// Fire-and-forget: don't block module load, but ensure the call kicks off
ensureSchema().catch((e) => console.warn("[cloudStorage] initSchema failed:", e));

export type RawRow = Record<string, string | number | undefined>;
export type UploadKind =
  | "target"
  | "current"
  | "today"
  | "lastMonth"
  | "lastYear"
  | "categoryMaster";

/** Per-kind chunk size for upload data — ~500KB JSON per chunk keeps
 *  each HTTP request comfortably below the libSQL gateway limit. */
const UPLOAD_CHUNK_SIZE = 500_000; // bytes
const UPLOAD_ROWS_PER_CHUNK = 1500; // ~333 bytes/row × 1500 = 500KB

export type UploadState = Record<UploadKind, RawRow[]>;
export type UploadMeta = Record<UploadKind, { rowCount: number; fileName?: string; updatedAt?: string }>;

const UPLOAD_KINDS: UploadKind[] = [
  "target",
  "current",
  "today",
  "lastMonth",
  "lastYear",
  "categoryMaster",
];

export const hasUploadData = (state: UploadState) =>
  Object.values(state).some((rows) => rows.length > 0);

/* ============================================================
 *  PRESETS
 * ============================================================ */

type PresetRow = { id: string; data: string };

export async function cloudListPresets<T>(): Promise<T[]> {
  const client = getTursoClient();
  const result = await client.execute("SELECT id, data FROM presets");
  return (result.rows as unknown as PresetRow[]).map((r) => JSON.parse(r.data) as T);
}

export async function cloudGetPreset<T>(id: string): Promise<T | null> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT data FROM presets WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0] as unknown as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as T) : null;
}

export async function cloudUpsertPreset<T extends { id: string }>(preset: T): Promise<void> {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO presets (id, data, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`,
    args: [preset.id, JSON.stringify(preset)],
  });
}

export async function cloudUpsertAllPresets<T extends { id: string }>(presets: T[]): Promise<void> {
  const client = getTursoClient();
  // Wrap in a transaction so partial failure doesn't leave inconsistent data
  const tx = await client.transaction("write");
  try {
    await tx.execute({ sql: "DELETE FROM presets", args: [] });
    for (const p of presets) {
      await tx.execute({
        sql: "INSERT INTO presets (id, data, updated_at) VALUES (?, ?, datetime('now'))",
        args: [p.id, JSON.stringify(p)],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function cloudDeletePreset(id: string): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql: "DELETE FROM presets WHERE id = ?", args: [id] });
}

export async function cloudDeleteAllPresets(): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql: "DELETE FROM presets" });
}

/* ============================================================
 *  UPLOADS — chunked storage for large Excel files
 * ============================================================ */

type UploadChunkRow = {
  kind: string;
  chunk_index: number;
  row_count: number;
  data: string;
  file_name: string | null;
  updated_at: string;
};

/**
 * Replace the upload for `kind` with new rows. Deletes any existing
 * chunks for that kind first (handles re-upload: e.g. upload current
 * 1-3 then current 1-4 — the second call wipes the first).
 */
export async function cloudSetUpload(
  kind: UploadKind,
  rows: RawRow[],
  fileName?: string,
): Promise<void> {
  const client = getTursoClient();
  const tx = await client.transaction("write");
  try {
    // Wipe existing chunks for this kind
    await tx.execute({ sql: "DELETE FROM upload_chunks WHERE kind = ?", args: [kind] });

    if (rows.length === 0) {
      await tx.commit();
      return;
    }

    // Split into chunks
    const chunks: { index: number; rows: RawRow[] }[] = [];
    for (let i = 0; i < rows.length; i += UPLOAD_ROWS_PER_CHUNK) {
      chunks.push({ index: chunks.length, rows: rows.slice(i, i + UPLOAD_ROWS_PER_CHUNK) });
    }

    for (const c of chunks) {
      const data = JSON.stringify(c.rows);
      // Sanity check: if a single chunk is still too big, throw
      if (data.length > UPLOAD_CHUNK_SIZE * 2) {
        throw new Error(
          `Chunk ${c.index} for ${kind} is ${data.length} bytes (limit ~${UPLOAD_CHUNK_SIZE}). ` +
            `Row at index ${c.index * UPLOAD_ROWS_PER_CHUNK} may be too large.`,
        );
      }
      await tx.execute({
        sql: `INSERT INTO upload_chunks (kind, chunk_index, row_count, data, file_name, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        args: [kind, c.index, c.rows.length, data, fileName ?? null],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function cloudGetUploadKind(
  kind: UploadKind,
): Promise<{ rows: RawRow[]; fileName?: string; updatedAt?: string } | null> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT chunk_index, row_count, data, file_name, updated_at FROM upload_chunks WHERE kind = ? ORDER BY chunk_index",
    args: [kind],
  });
  const rows = result.rows as unknown as UploadChunkRow[];
  if (rows.length === 0) return null;
  const allRows: RawRow[] = [];
  let fileName: string | undefined;
  let updatedAt: string | undefined;
  for (const r of rows) {
    const chunk = JSON.parse(r.data) as RawRow[];
    allRows.push(...chunk);
    if (r.file_name) fileName = r.file_name;
    if (r.updated_at) updatedAt = r.updated_at;
  }
  return { rows: allRows, fileName, updatedAt };
}

/** Fetch all uploads (returns null if no data at all) */
export async function cloudFetchUploads(): Promise<UploadState | null> {
  const state: UploadState = {
    target: [],
    current: [],
    today: [],
    lastMonth: [],
    lastYear: [],
    categoryMaster: [],
  };
  let any = false;
  for (const kind of UPLOAD_KINDS) {
    const result = await cloudGetUploadKind(kind);
    if (result && result.rows.length > 0) {
      state[kind] = result.rows;
      any = true;
    }
  }
  return any ? state : null;
}

/** Delete a single kind's upload (used by "remove file" button) */
export async function cloudDeleteUpload(kind: UploadKind): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql: "DELETE FROM upload_chunks WHERE kind = ?", args: [kind] });
}

/** Delete every upload (used by "clear all" button) */
export async function cloudClearAllUploads(): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql: "DELETE FROM upload_chunks" });
}

/** Lightweight metadata for the Reports page UI (avoids loading full rows) */
export async function cloudFetchUploadMeta(): Promise<UploadMeta> {
  const client = getTursoClient();
  const result = await client.execute(
    "SELECT kind, file_name, updated_at, SUM(row_count) AS total_rows FROM upload_chunks GROUP BY kind",
  );
  const meta: UploadMeta = {
    target: { rowCount: 0 },
    current: { rowCount: 0 },
    today: { rowCount: 0 },
    lastMonth: { rowCount: 0 },
    lastYear: { rowCount: 0 },
    categoryMaster: { rowCount: 0 },
  };
  for (const r of result.rows as unknown as Array<{
    kind: string;
    file_name: string | null;
    updated_at: string;
    total_rows: number | string;
  }>) {
    const kind = r.kind as UploadKind;
    if (kind in meta) {
      meta[kind] = {
        rowCount: Number(r.total_rows) || 0,
        fileName: r.file_name ?? undefined,
        updatedAt: r.updated_at,
      };
    }
  }
  return meta;
}
