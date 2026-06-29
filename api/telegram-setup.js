/**
 * GET-only helper to check & set the Telegram webhook.
 *
 * Visit this URL in a browser (or curl) to see webhook status.
 *   GET /api/telegram-setup
 *   GET /api/telegram-setup?set=1  → set webhook to production URL
 *   GET /api/telegram-setup?delete=1  → delete webhook (switch to polling)
 */
import { setWebhook } from "./_lib/telegramBot.js";
import { getMostRecentTelegramChatId } from "./_lib/tursoClient.js";

const WEBHOOK_URL = "https://dashboard-central-nortview.vercel.app/api/telegram";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).send("Use GET\n");
  }

  const lines = [];

  if (req.query.delete === "1") {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    const j = await r.json();
    lines.push(`deleteWebhook: ${JSON.stringify(j)}`);
  }

  if (req.query.set === "1") {
    const r = await setWebhook(WEBHOOK_URL);
    lines.push(`setWebhook → ${WEBHOOK_URL}: ${JSON.stringify(r)}`);
  }

  // Check current webhook status
  const info = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  const infoJson = await info.json();
  lines.push(`\ngetWebhookInfo:\n${JSON.stringify(infoJson, null, 2)}`);

  // Check telegram_chats in Turso
  const chatId = await getMostRecentTelegramChatId();
  lines.push(`\ntelegram_chats most recent: ${chatId ?? "NONE — no chat stored"}`);

  return res.status(200).send(lines.join("\n") + "\n");
}