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

// Category target overrides: per-branch per-category custom targets.
// Used to override the auto-derived target from the target Excel for
// quantity categories (AC+, COVER+, SIM) which don't have specific
// columns in the target Excel. Managed from the Settings page.
const CATEGORY_TARGET_OVERRIDES_SQL = `
CREATE TABLE IF NOT EXISTS category_target_overrides (
  branch_id   TEXT NOT NULL,
  category    TEXT NOT NULL,
  target      REAL NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT,
  PRIMARY KEY (branch_id, category)
);
CREATE INDEX IF NOT EXISTS idx_cto_branch ON category_target_overrides(branch_id);
`;

// App config key/value store. Used to hold the CSAT access token so an
// admin can refresh it from the Settings page (no redeploy needed) when
// the old one expires. Server-side only — the token value is never
// returned to browsers.
const APP_CONFIG_SQL = `
CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT
);
`;

async function initTelegramSchema() {
  const client = getTursoClient();
  for (const stmt of TELEGRAM_SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
  for (const stmt of CATEGORY_TARGET_OVERRIDES_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
  for (const stmt of APP_CONFIG_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
}

/** Read a raw app_config value (or null). */
async function getAppConfig(key) {
  const client = getTursoClient();
  try {
    const result = await client.execute({
      sql: `SELECT value, updated_at, updated_by FROM app_config WHERE key = ?`,
      args: [String(key)],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      value: row.value == null ? null : String(row.value),
      updatedAt: row.updated_at == null ? null : String(row.updated_at),
      updatedBy: row.updated_by == null ? null : String(row.updated_by),
    };
  } catch (e) {
    console.error("[tursoClient] getAppConfig failed:", e);
    return null;
  }
}

/** Upsert an app_config value. */
async function setAppConfig(key, value, updatedBy) {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO app_config (key, value, updated_at, updated_by)
          VALUES (?, ?, datetime('now'), ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now'),
            updated_by = excluded.updated_by`,
    args: [String(key), value == null ? null : String(value), updatedBy ?? null],
  });
}

module.exports = {
  getTursoClient,
  getTursoConfig,
  initTelegramSchema,
  upsertTelegramChat,
  getMostRecentTelegramChatId,
  upsertCategoryTargetOverride,
  getCategoryTargetOverrides,
  deleteCategoryTargetOverride,
  getAppConfig,
  setAppConfig,
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

/**
 * Upsert a per-branch per-category target override.
 */
async function upsertCategoryTargetOverride({ branchId, category, target, updatedBy }) {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO category_target_overrides (branch_id, category, target, updated_at, updated_by)
          VALUES (?, ?, ?, datetime('now'), ?)
          ON CONFLICT(branch_id, category) DO UPDATE SET
            target = excluded.target,
            updated_at = datetime('now'),
            updated_by = excluded.updated_by`,
    args: [String(branchId), String(category), Number(target), updatedBy ?? null],
  });
}

/**
 * Return all category target overrides for a branch.
 * Shape: { "AC+": 150, "COVER+": 300, "SIM": 20, ... }
 */
async function getCategoryTargetOverrides(branchId) {
  const client = getTursoClient();
  try {
    const result = await client.execute({
      sql: `SELECT category, target, updated_at, updated_by
            FROM category_target_overrides
            WHERE branch_id = ?
            ORDER BY category`,
      args: [String(branchId)],
    });
    const map = {};
    for (const row of result.rows) {
      map[row.category] = {
        target: Number(row.target),
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      };
    }
    return map;
  } catch {
    return {};
  }
}

async function deleteCategoryTargetOverride({ branchId, category }) {
  const client = getTursoClient();
  await client.execute({
    sql: `DELETE FROM category_target_overrides WHERE branch_id = ? AND category = ?`,
    args: [String(branchId), String(category)],
  });
}
