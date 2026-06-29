/**
 * CommonJS-compatible Turso client wrapper for LINE Bot API endpoints.
 *
 * Reads Vercel env vars (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN — without
 * the VITE_ prefix because these run in Node, not the browser).
 *
 * This is a duplicate of the client-side lib in src/lib/auth/tursoClient.ts
 * but kept here to avoid pulling in the Vite client-only code.
 */

const { createClient } = require("@libsql/client");

let _client = null;

function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Vercel.",
    );
  }
  return { url, authToken };
}

function getTursoClient() {
  if (_client) return _client;
  const { url, authToken } = getTursoConfig();
  _client = createClient({ url, authToken });
  return _client;
}

// Schema for LINE Bot tables — kept here so we don't pull in the
// client-side bundle (which has the larger users/presets schema).
const LINE_BOT_SCHEMA_SQL = `
-- Original upload_chunks (may exist from client-side initSchema)
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

-- Migrations for existing upload_chunks (add columns if missing)
-- ALTER TABLE in SQLite doesn't support IF NOT EXISTS, so we use a
-- try/catch dance via a helper. Simpler: just run ALTER and ignore
-- "duplicate column" errors.

CREATE TABLE IF NOT EXISTS line_user_allowlist (
  line_user_id   TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL,
  role           TEXT NOT NULL CHECK(role IN ('BSM', 'Asst.BSM')),
  branch_id      TEXT NOT NULL,
  added_by       TEXT NOT NULL,
  added_at       TEXT NOT NULL DEFAULT (datetime('now')),
  is_active      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_allowlist_role ON line_user_allowlist(role, is_active);

CREATE TABLE IF NOT EXISTS upload_audit_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id        TEXT,
  branch_id           TEXT NOT NULL,
  kind                TEXT NOT NULL,
  file_name           TEXT,
  file_size           INTEGER,
  file_data           BLOB,
  row_count           INTEGER,
  target_total        REAL,
  actual_total        REAL,
  branch_id_detected  TEXT,
  status              TEXT NOT NULL CHECK(status IN ('success', 'error')),
  error_message       TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON upload_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON upload_audit_log(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON upload_audit_log(line_user_id, created_at DESC);

-- Telegram bot: store chat IDs of users who have messaged the bot.
-- Used by /api/telegram-report to find the most recent chat to send
-- screenshots to (triggered by the web app "ส่งไป Telegram" button).
CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id     TEXT PRIMARY KEY,
  username    TEXT,
  first_name  TEXT,
  last_seen   TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Migrations to run separately (because ALTER TABLE doesn't support
// IF NOT EXISTS in older SQLite versions — wrap each in try/catch).
const MIGRATIONS = [
  "ALTER TABLE upload_chunks ADD COLUMN branch_id TEXT",
  "ALTER TABLE upload_chunks ADD COLUMN line_user_id TEXT",
  "ALTER TABLE upload_chunks ADD COLUMN upload_audit_id INTEGER REFERENCES upload_audit_log(id)",
];

async function initLineBotSchema() {
  const client = getTursoClient();
  const cleaned = LINE_BOT_SCHEMA_SQL.replace(/^\s*--.*$/gm, "");
  for (const stmt of cleaned.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
  // Run migrations (idempotent — duplicate column errors are ignored)
  for (const migration of MIGRATIONS) {
    try {
      await client.execute(migration);
    } catch (e) {
      // Ignore "duplicate column" errors
      if (!String(e).includes("duplicate column") && !String(e).includes("already exists")) {
        throw e;
      }
    }
  }
}

module.exports = {
  getTursoClient,
  getTursoConfig,
  initLineBotSchema,
  upsertTelegramChat,
  getMostRecentTelegramChatId,
};

/**
 * Upsert a Telegram chat (chat_id + username + first_name) so the web
 * app can later find the most recent chat to send screenshots to.
 */
async function upsertTelegramChat({ chatId, username, firstName }) {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO telegram_chats (chat_id, username, first_name, last_seen)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(chat_id) DO UPDATE SET
            username = excluded.username,
            first_name = excluded.first_name,
            last_seen = datetime('now')`,
    args: [String(chatId), username ?? null, firstName ?? null],
  });
}

/**
 * Return the most recently active Telegram chat_id, or null if none.
 * (Waits until initLineBotSchema has been run at least once.)
 */
async function getMostRecentTelegramChatId() {
  const client = getTursoClient();
  try {
    const result = await client.execute(
      `SELECT chat_id FROM telegram_chats ORDER BY last_seen DESC LIMIT 1`,
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].chat_id;
  } catch {
    // Table might not exist yet on first run
    return null;
  }
}
