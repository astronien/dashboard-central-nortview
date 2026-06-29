/**
 * QStash Worker — processes 1 PIA → 3 images → sends to Telegram.
 *
 * Called by Upstash QStash at scheduled times (with delay).
 * Verifies QStash HMAC signature before processing.
 *
 * Free tier: 500 QStash messages/day.
 */

import { verifyQStashRequest } from "./_lib/qstash.js";
import { sendMessage, sendPhoto } from "./_lib/telegramBot.js";
import { buildPiaReport } from "./_lib/piaReportBuilder.js";

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;

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

  // 2. Build PIA data
  const pia = await buildPiaReport(staffId, branchId);
  if (!pia) {
    await sendMessage(chatId, `❌ ไม่พบข้อมูล PIA (ID ${staffId})`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // 3. Generate 3 PNGs
  let kpi, wonder, category;
  try {
    const result = await generateAllPngs(WORKER_URL, pia);
    kpi = result.kpi;
    wonder = result.wonder;
    category = result.category;
  } catch (e) {
    console.error(`[process-pia] generate failed for ${staffId}:`, e);
    await sendMessage(chatId, `❌ ${pia.name}: สร้างรูปไม่สำเร็จ`);
    return res.status(200).json({ ok: false, error: e.message });
  }

  // 4. Send 3 photos
  try {
    await sendPhoto(chatId, kpi, `📊 KPI - ${pia.name} (${pia.staffId})`);
    await sleep(500);
    await sendPhoto(chatId, wonder, `🏆 7 Wonders - ${pia.name}`);
    await sleep(500);
    await sendPhoto(chatId, category, `📈 Category - ${pia.name}`);
  } catch (e) {
    console.error(`[process-pia] sendPhoto failed for ${staffId}:`, e);
    return res.status(200).json({ ok: false, error: e.message });
  }

  return res.status(200).json({ ok: true, staffId });
}

async function generateAllPngs(workerUrl, data) {
  if (!workerUrl) throw new Error("CLOUDFLARE_WORKER_URL not set");
  const res = await fetch(`${workerUrl}/screenshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templates: ["kpi", "wonder", "category"],
      data,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Worker failed: ${res.status} ${errText}`);
  }
  const json = await res.json();
  if (!json.results) throw new Error("Worker returned no results");
  return {
    kpi: Buffer.from(json.results.kpi, "base64"),
    wonder: Buffer.from(json.results.wonder, "base64"),
    category: Buffer.from(json.results.category, "base64"),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
