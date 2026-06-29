/**
 * QStash Worker — processes 1 PIA → screenshot from web → sends to Telegram.
 *
 * Called by Upstash QStash at scheduled times (with delay).
 * Verifies QStash HMAC signature before processing.
 *
 * Uses the new /screenshot-url flow: render the web app dashboard, then
 * send the screenshot to Telegram. This guarantees the data shown in
 * Telegram matches exactly what the user sees in the browser.
 *
 * Free tier: 500 QStash messages/day.
 */

import { verifyQStashRequest } from "./_lib/qstash.js";
import { sendMessage, sendPhoto } from "./_lib/telegramBot.js";
import { getPiaListForBranch } from "./_lib/piaReportBuilder.js";

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const WEB_BOT_TOKEN = process.env.WEB_BOT_TOKEN;
const BRANCH_DISPLAY = process.env.TELEGRAM_BRANCH_DISPLAY ?? "ID645 : Studio 7-Central-Westgate";

export default async function handler(req, res) {
  // 1. Verify QStash signature
  const signature = req.headers["upstash-signature"];
  if (!signature) {
    return res.status(401).json({ error: "Missing QStash signature" });
  }

  const bodyStr = JSON.stringify(req.body ?? {});
  const isValid = await verifyQStashRequest(signature, bodyStr);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid QStash signature" });
  }

  const { staffId, branchId, chatId } = req.body ?? {};
  if (!staffId || !branchId || !chatId) {
    return res.status(400).json({ error: "Missing staffId/branchId/chatId" });
  }

  // 2. Look up the PIA's display name
  const piaList = await getPiaListForBranch(branchId);
  const pia = piaList.find((p) => p.staffId === staffId);
  if (!pia) {
    await sendMessage(chatId, `❌ ไม่พบข้อมูล PIA (ID ${staffId})`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // 3. Cap the web app page via the worker
  let png;
  try {
    const url = `https://dashboard-central-nortview.vercel.app/?bot=1&token=${encodeURIComponent(WEB_BOT_TOKEN)}&staffId=${encodeURIComponent(staffId)}&branch=${encodeURIComponent(BRANCH_DISPLAY)}`;
    const res = await fetch(`${WORKER_URL}/screenshot-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, token: process.env.WORKER_BOT_TOKEN ?? "pia-bot-secret" }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Worker failed: ${res.status} ${errText}`);
    }
    png = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`[process-pia] capUrl failed for ${staffId}:`, e);
    await sendMessage(chatId, `❌ ${pia.name}: สร้างรูปไม่สำเร็จ — ${e instanceof Error ? e.message : String(e)}`);
    return res.status(200).json({ ok: false, error: e.message });
  }

  // 4. Send the photo
  try {
    await sendPhoto(chatId, png, `📊 ${pia.name} (ID ${pia.staffId})`);
  } catch (e) {
    console.error(`[process-pia] sendPhoto failed for ${staffId}:`, e);
    return res.status(200).json({ ok: false, error: e.message });
  }

  return res.status(200).json({ ok: true, staffId });
}
