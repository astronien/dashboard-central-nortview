/**
 * QStash Worker — processes 1 PIA → 3 screenshots from web → sends to Telegram.
 *
 * Called by Upstash QStash at scheduled times (with delay).
 * Verifies QStash HMAC signature before processing.
 *
 * Captures 3 sections of the web dashboard (KPI / 7 Wonders / Category)
 * via a single browser session and sends them as 3 separate photos.
 *
 * Free tier: 500 QStash messages/day.
 */

import { verifyQStashRequest } from "./_lib/qstash.js";
import { sendMessage, sendPhoto } from "./_lib/telegramBot.js";
import { getPiaListForBranch } from "./_lib/piaReportBuilder.js";

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const WEB_BOT_TOKEN = process.env.WEB_BOT_TOKEN;
const BRANCH_DISPLAY = process.env.TELEGRAM_BRANCH_DISPLAY ?? "ID645 : Studio 7-Central-Westgate";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  // 3. Cap 3 sections of the web app via the worker
  let sections;
  try {
    const url = `https://dashboard-central-nortview.vercel.app/?bot=1&token=${encodeURIComponent(WEB_BOT_TOKEN)}&staffId=${encodeURIComponent(staffId)}&branch=${encodeURIComponent(BRANCH_DISPLAY)}`;
    const res = await fetch(`${WORKER_URL}/screenshot-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        token: process.env.WORKER_BOT_TOKEN ?? "pia-bot-secret",
        sections: ["kpi", "wonder", "category"],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Worker failed: ${res.status} ${errText}`);
    }
    const json = await res.json();
    sections = {};
    for (const [k, v] of Object.entries(json.results ?? {})) {
      sections[k] = Buffer.from(v, "base64");
    }
  } catch (e) {
    console.error(`[process-pia] capUrl failed for ${staffId}:`, e);
    await sendMessage(chatId, `❌ ${pia.name}: สร้างรูปไม่สำเร็จ — ${e instanceof Error ? e.message : String(e)}`);
    return res.status(200).json({ ok: false, error: e.message });
  }

  // 4. Send 3 photos
  try {
    if (sections.kpi) {
      await sendPhoto(chatId, sections.kpi, `📊 KPI Overview - ${pia.name} (${pia.staffId})`);
      await sleep(400);
    }
    if (sections.wonder) {
      await sendPhoto(chatId, sections.wonder, `🏆 7 Wonders - ${pia.name}`);
      await sleep(400);
    }
    if (sections.category) {
      await sendPhoto(chatId, sections.category, `📈 Category Detail - ${pia.name}`);
    }
  } catch (e) {
    console.error(`[process-pia] sendPhoto failed for ${staffId}:`, e);
    return res.status(200).json({ ok: false, error: e.message });
  }

  return res.status(200).json({ ok: true, staffId });
}
