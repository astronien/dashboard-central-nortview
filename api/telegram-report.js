/**
 * Web app → Telegram report sender.
 *
 * Called by the "ส่งไป Telegram" button in StaffSection. The web app
 * captures 3 views (KPI / 7 Wonders / Today) via html2canvas, converts
 * each to PNG, then POSTs them here. This endpoint forwards them to
 * Telegram via sendDocument (uncompressed).
 *
 * Body (JSON):
 *   { staffId, images: [{ name, base64, caption }] }
 *
 * No QStash, no external screenshot service — just image forwarding.
 */
import { sendDocument, sendMessage } from "./_lib/telegramBot.js";
import { getMostRecentTelegramChatId, initTelegramSchema } from "./_lib/tursoClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { staffId, images, text } = req.body ?? {};

  // Ensure telegram_chats table exists
  try { await initTelegramSchema(); } catch (e) {
    console.error("[telegram-report] schema init failed:", e);
  }

  // Find the most recently active Telegram chat
  const chatId = await getMostRecentTelegramChatId();
  if (!chatId) {
    return res.status(404).json({
      error: "ยังไม่มี Telegram chat ในระบบ — ส่ง /start ไปที่บอทก่อน",
    });
  }

  // Text mode: send the daily analysis as chunked messages (Telegram caps
  // a message at 4096 chars).
  if (typeof text === "string" && text.trim()) {
    try {
      const chunks = [];
      let rest = text.trim();
      while (rest.length > 3800) {
        let cut = rest.lastIndexOf("\n", 3800);
        if (cut < 1000) cut = 3800;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      chunks.push(rest);
      for (const c of chunks) await sendMessage(chatId, c);
      return res.status(200).json({ ok: true, sent: chunks.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[telegram-report] sendMessage failed:", msg);
      return res.status(500).json({ ok: false, error: msg });
    }
  }

  if (!staffId) {
    return res.status(400).json({ error: "Missing staffId" });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "Missing images" });
  }

  // Send each image as an uncompressed document (Telegram renders PNG inline)
  let count = 0;
  const errors = [];
  for (const img of images) {
    try {
      const buf = Buffer.from(img.base64, "base64");
      const filename = img.name || `report-${staffId}.jpeg`;
      const caption = img.caption || "";
      // Determine MIME type from filename extension
      const mime = filename.endsWith(".png") ? "image/png" : "image/jpeg";
      await sendDocument(chatId, buf, filename, caption, mime);
      count++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[telegram-report] sendDocument failed:", msg);
      errors.push(msg);
    }
  }

  if (count === 0) {
    return res.status(500).json({ error: "ส่งรูปไม่สำเร็จ — ลองอีกครั้ง" });
  }

  // Send a small summary message
  try {
    await sendMessage(chatId, `✅ ส่งรายงาน ${count}/${images.length} รูปเรียบร้อย`);
  } catch {}

  return res.status(200).json({ ok: true, count, errors });
}