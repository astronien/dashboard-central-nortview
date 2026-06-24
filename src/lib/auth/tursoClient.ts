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
`;

function readEnvVar(key: string): string | undefined {
  // 1) Vite browser/runtime — only defined when bundled by Vite
  try {
    const meta = (import.meta as ImportMeta & { env?: Record<string, string> });
    if (meta.env && typeof meta.env[key] === "string") {
      return meta.env[key];
    }
  } catch {
    // import.meta.env not available (e.g. plain Node)
  }
  // 2) Plain Node — read from process.env (loaded by dotenv in scripts)
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

let _client: Client | null = null;

export function getTursoClient(): Client {
  if (_client) return _client;
  const url = readEnvVar("VITE_TURSO_DATABASE_URL");
  const authToken = readEnvVar("VITE_TURSO_AUTH_TOKEN");
  if (!url || !authToken || url.includes("your-database")) {
    throw new Error(
      "Turso is not configured. Set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env",
    );
  }
  _client = createClient({ url, authToken });
  return _client;
}

export function isTursoConfigured(): boolean {
  const url = readEnvVar("VITE_TURSO_DATABASE_URL");
  const authToken = readEnvVar("VITE_TURSO_AUTH_TOKEN");
  return Boolean(url && authToken && !url.includes("your-database"));
}

export async function initSchema(): Promise<void> {
  const client = getTursoClient();
  // libSQL doesn't run multiple statements in one execute by default
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
}

export type { Client };
