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

  // 3. Cap web app via worker — try 3 sections first, fallback to 1
  const url = `https://dashboard-central-nortview.vercel.app/?bot=1&token=${encodeURIComponent(WEB_BOT_TOKEN)}&staffId=${encodeURIComponent(staffId)}&branch=${encodeURIComponent(BRANCH_DISPLAY)}`;
  const workerToken = process.env.WORKER_BOT_TOKEN ?? "pia-bot-secret";

  // Try 3 sections
  let sections = {};
  let usedFallback = false;
  try {
    const res = await fetch(`${WORKER_URL}/screenshot-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        token: workerToken,
        urlsBySection: {
          kpi: url + "&view=sales",
          wonder: url + "&view=csat",
          category: url + "&view=today",
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Worker failed: ${res.status} ${errText}`);
    }
    const json = await res.json();
    for (const [k, v] of Object.entries(json.results ?? {})) {
      sections[k] = Buffer.from(v, "base64");
    }
    if (Object.keys(sections).length < 3) {
      throw new Error(`only ${Object.keys(sections).length} sections`);
    }
  } catch (e) {
    console.log(`[process-pia] 3-section failed for ${staffId}:`, e.message);
    // Fallback to 1 image
    usedFallback = true;
    try {
      const res = await fetch(`${WORKER_URL}/screenshot-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          token: workerToken,
          sections: ["all"],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Worker failed: ${res.status} ${errText}`);
      }
      const json = await res.json();
      if (json.results?.all) {
        sections.all = Buffer.from(json.results.all, "base64");
      }
    } catch (e2) {
      console.error(`[process-pia] fallback failed for ${staffId}:`, e2);
      await sendMessage(chatId, `❌ ${pia.name}: สร้างรูปไม่สำเร็จ — ${e2 instanceof Error ? e2.message : String(e2)}`);
      return res.status(200).json({ ok: false, error: e2.message });
    }
  }

  // 4. Send photos
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
    if (sections.all) {
      await sendPhoto(chatId, sections.all, `📊 ${pia.name} (ID ${pia.staffId}) - รายงานเต็ม`);
    }
  } catch (e) {
    console.error(`[process-pia] sendPhoto failed for ${staffId}:`, e);
    return res.status(200).json({ ok: false, error: e.message });
  }

  const count = Object.keys(sections).length;
  await sendMessage(chatId, `✅ ส่งรายงาน ${pia.name} (ID ${pia.staffId}) ${count} รูปเรียบร้อย`);
  return res.status(200).json({ ok: true, staffId, count, fallback: usedFallback });
}
