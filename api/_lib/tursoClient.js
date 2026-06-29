/**
 * Turso client wrapper.
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

// Telegram bot: store chat IDs of users who have messaged the bot.
// Used by /api/telegram-report to find the most recent chat to send
// screenshots to (triggered by the web app "ส่งไป Telegram" button).
const TELEGRAM_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id     TEXT PRIMARY KEY,
  username    TEXT,
  first_name  TEXT,
  last_seen   TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

async function initTelegramSchema() {
  const client = getTursoClient();
  for (const stmt of TELEGRAM_SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
}

module.exports = {
  getTursoClient,
  getTursoConfig,
  initTelegramSchema,
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
    return null;
  }
}
