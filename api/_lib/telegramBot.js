/**
 * Telegram Bot API helpers.
 *
 * Wraps fetch() calls to api.telegram.org/bot{TOKEN}.
 * - sendMessage: text message
 * - sendPhoto: photo with optional caption (Buffer, no upload needed)
 * - answerCallbackQuery: ack button press
 * - setWebhook: register webhook URL
 */

const TELEGRAM_API = "https://api.telegram.org/bot";

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return token;
}

function baseUrl() {
  return `${TELEGRAM_API}${getToken()}`;
}

export async function sendMessage(chatId, text, options = {}) {
  const res = await fetch(`${baseUrl()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...options }),
  });
  return res.json();
}

export async function sendPhoto(chatId, photoBuffer, caption) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("photo", new Blob([photoBuffer], { type: "image/png" }), "report.png");
  if (caption) form.append("caption", caption);

  const res = await fetch(`${baseUrl()}/sendPhoto`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

/**
 * Send an image as a Telegram document (no compression).
 * Use this for high-resolution screenshots where sendPhoto would compress.
 * Telegram shows the image inline as a preview but lets users open the
 * uncompressed original by tapping.
 */
export async function sendDocument(chatId, fileBuffer, filename, caption) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new Blob([fileBuffer], { type: "image/png" }), filename || "report.png");
  if (caption) form.append("caption", caption);

  const res = await fetch(`${baseUrl()}/sendDocument`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  const res = await fetch(`${baseUrl()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
  return res.json();
}

export async function setWebhook(url) {
  const res = await fetch(`${baseUrl()}/setWebhook?url=${encodeURIComponent(url)}`);
  return res.json();
}

export async function getFile(fileId) {
  const res = await fetch(`${baseUrl()}/getFile?file_id=${fileId}`);
  return res.json();
}

export async function downloadFile(filePath) {
  const res = await fetch(`https://api.telegram.org/file/bot${getToken()}/${filePath}`);
  return Buffer.from(await res.arrayBuffer());
}
