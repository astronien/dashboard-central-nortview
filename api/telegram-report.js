/**
 * Web app → Telegram report trigger.
 *
 * Called by the "ส่งไป Telegram" button in StaffSection.
 * POST { staffId } → looks up most recent Telegram chat_id from Turso
 * → schedules QStash job → process-pia.js captures 3 screenshots
 * → sends to that chat.
 *
 * No 60s timeout issue (schedules QStash, returns immediately).
 */
import { schedulePiaJob } from "./_lib/qstash.js";
import { getMostRecentTelegramChatId } from "./_lib/tursoClient.js";

const BRANCH_ID = process.env.TELEGRAM_BRANCH_ID ?? "645";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { staffId } = req.body ?? {};
  if (!staffId) {
    return res.status(400).json({ error: "Missing staffId" });
  }

  // Find the most recently active Telegram chat
  const chatId = await getMostRecentTelegramChatId();
  if (!chatId) {
    return res.status(404).json({
      error: "ยังไม่มี Telegram chat ในระบบ — ส่ง /start ไปที่บอทก่อน",
    });
  }

  // Schedule the QStash job (process-pia.js will do the captures + sendPhoto)
  try {
    await schedulePiaJob({ staffId, branchId: BRANCH_ID, chatId, delay: 0 });
    return res.status(200).json({ ok: true, chatId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telegram-report] schedulePiaJob failed:", msg);
    return res.status(500).json({ error: "ส่งไม่สำเร็จ (QStash error)" });
  }
}