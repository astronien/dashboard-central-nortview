/**
 * Turso (libSQL) client setup.
 *
 * Reads VITE_TURSO_DATABASE_URL + VITE_TURSO_AUTH_TOKEN from .env.
 * Works in both Vite browser/runtime and Node scripts (tsx).
 */
import { createClient, type Client } from "@libsql/client";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pia')),
  name TEXT NOT NULL,
  branch TEXT,
  officer_id TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_officer_id ON users(officer_id);

-- KPI Presets — single row per preset, identified by ID
CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uploaded files (4 sales + 1 cat master) — chunked to handle large
-- spreadsheets. One (kind, chunk_index) row per data chunk; the rows
-- are concatenated in chunk_index order to reconstruct the file.
-- Replacing an upload = DELETE all rows for that kind, then INSERT new.
CREATE TABLE IF NOT EXISTS upload_chunks (
  kind TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  data TEXT NOT NULL,
  file_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (kind, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_upload_chunks_kind ON upload_chunks(kind);

-- Small key/value store for app-wide settings that must follow the user
-- across devices (e.g. the Trade In branch mapping).
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


`;

/**
 * Read a config value, with priority:
 *   1. `import.meta.env.VITE_*`  (Vite browser, statically replaced at build)
 *   2. `process.env.*`           (Node script / tsx)
 *
 * IMPORTANT: Vite can only inline env vars at build time if they appear
 * as a literal `import.meta.env.VITE_*` access. We pass the key name
 * through `import.meta.env[key]` indirectly so this helper still works
 * in plain Node, but the actual values used in the browser are read
 * via the literal accessors below.
 */
function getTursoUrl(): string | undefined {
  let fromVite: string | undefined;
  try {
    // Vite: statically replaced at build time
    fromVite = import.meta.env.VITE_TURSO_DATABASE_URL as string | undefined;
  } catch {
    fromVite = undefined;
  }
  if (fromVite && !fromVite.includes("your-database")) return fromVite;
  // Node: read from process.env (loaded via dotenv)
  if (typeof process !== "undefined" && process.env?.VITE_TURSO_DATABASE_URL) {
    return process.env.VITE_TURSO_DATABASE_URL;
  }
  return fromVite; // may be undefined or placeholder
}

function getTursoToken(): string | undefined {
  let fromVite: string | undefined;
  try {
    fromVite = import.meta.env.VITE_TURSO_AUTH_TOKEN as string | undefined;
  } catch {
    fromVite = undefined;
  }
  if (fromVite && fromVite !== "your-turso-auth-token") return fromVite;
  if (typeof process !== "undefined" && process.env?.VITE_TURSO_AUTH_TOKEN) {
    return process.env.VITE_TURSO_AUTH_TOKEN;
  }
  return fromVite;
}

let _client: Client | null = null;

export function getTursoClient(): Client {
  if (_client) return _client;
  const url = getTursoUrl();
  const authToken = getTursoToken();
  if (!url || !authToken || url.includes("your-database") || authToken === "your-turso-auth-token") {
    throw new Error(
      "Turso is not configured. Set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env",
    );
  }
  _client = createClient({ url, authToken });
  return _client;
}

export function isTursoConfigured(): boolean {
  const url = getTursoUrl();
  const authToken = getTursoToken();
  return Boolean(
    url &&
      authToken &&
      !url.includes("your-database") &&
      authToken !== "your-turso-auth-token",
  );
}

export async function initSchema(): Promise<void> {
  const client = getTursoClient();
  // libSQL doesn't run multiple statements in one execute by default.
  // Strip line comments first so a chunk that's only a comment doesn't
  // get sent to the server as an empty statement.
  const cleaned = SCHEMA_SQL.replace(/^\s*--.*$/gm, "");
  for (const stmt of cleaned.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
}

export type { Client };
