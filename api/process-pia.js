/**
 * QStash Worker — processes 1 PIA → 3 screenshots via Microlink → sends to Telegram.
 *
 * Called by Upstash QStash at scheduled times (with delay).
 * Verifies QStash HMAC signature before processing.
 *
 * Uses Microlink.io (50 req/day free tier) instead of CF Worker.
 *
 * Free tier: 500 QStash messages/day.
 */

import { verifyQStashRequest } from "./_lib/qstash.js";
import { sendMessage, sendPhoto } from "./_lib/telegramBot.js";
import { getPiaListForBranch } from "./_lib/piaReportBuilder.js";
import { capturePiaSections } from "./_lib/microlink.js";

const WEB_BOT_TOKEN = process.env.WEB_BOT_TOKEN;
const BRANCH_DISPLAY = process.env.TELEGRAM_BRANCH_DISPLAY ?? "ID645 : Studio 7-Central-Westgate";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendMicrolinkError(chatId, rawMsg) {
  if (rawMsg.includes("429") || rawMsg.includes("rate") || rawMsg.includes("limit")) {
    return sendMessage(chatId,
      `❌ Microlink free tier หมดแล้ว (50 req/day)\n` +
      `⏰ รอ 1-2 นาทีแล้วลองใหม่ หรือลองพรุ่งนี้`,
    );
  }
  if (rawMsg.includes("500") || rawMsg.includes("Unable to")) {
    return sendMessage(chatId,
      `❌ สร้างรูปไม่สำเร็จ (เซิร์ฟเวอร์มีปัญหา)\n` +
      `⏰ รอ 30 วินาทีแล้วลองใหม่`,
    );
  }
  if (rawMsg.includes("EBRWSRTIMEOUT") || rawMsg.includes("timeout") || rawMsg.includes("Timeout") || rawMsg.includes("navigation timeout")) {
    return sendMessage(chatId,
      `❌ หน้าเว็บโหลดช้าเกินไป (timeout)\n` +
      `⏰ ลองอีกครั้งในอีก 1-2 นาที`,
    );
  }
  return sendMessage(chatId, `❌ สร้างรูปไม่สำเร็จ — ลองอีกครั้งใน 1 นาที`);
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

  // 2. Look up PIA
  const piaList = await getPiaListForBranch(branchId);
  const pia = piaList.find((p) => p.staffId === staffId);
  if (!pia) {
    await sendMessage(chatId, `❌ ไม่พบข้อมูล PIA (ID ${staffId})`);
    return res.status(200).json({ ok: true, skipped: true });
  }

  // 3. Build bot URL
  const url = `https://dashboard-central-nortview.vercel.app/?bot=1&token=${encodeURIComponent(WEB_BOT_TOKEN)}&staffId=${encodeURIComponent(staffId)}&branch=${encodeURIComponent(BRANCH_DISPLAY)}`;

  // 4. Capture 3 sections sequentially via Microlink
  //    (sequential to avoid free-tier concurrency limit)
  let sections = {};
  try {
    sections = await capturePiaSections(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[process-pia] ${staffId} capturePiaSections failed:`, msg);
    await sendMicrolinkError(chatId, msg);
    return res.status(200).json({ ok: false, error: e.message });
  }

  // 5. Send whatever sections succeeded
  const validSections = Object.entries(sections).filter(([, buf]) => buf);
  if (validSections.length === 0) {
    await sendMicrolinkError(chatId, "ไม่สามารถสร้างรูปได้ (Microlink ไม่ตอบ)");
    return res.status(200).json({ ok: false, error: "all sections failed" });
  }

  // 6. Send photos
  let count = 0;
  try {
    if (sections.kpi) {
      await sendPhoto(chatId, sections.kpi, `📊 KPI Overview - ${pia.name} (${pia.staffId})`);
      count++;
      await sleep(400);
    }
    if (sections.wonder) {
      await sendPhoto(chatId, sections.wonder, `🏆 7 Wonders - ${pia.name}`);
      count++;
      await sleep(400);
    }
    if (sections.category) {
      await sendPhoto(chatId, sections.category, `📈 Category Detail - ${pia.name}`);
      count++;
    }
  } catch (e) {
    console.error(`[process-pia] sendPhoto failed:`, e);
    return res.status(200).json({ ok: false, error: e.message });
  }

  if (count > 0 && count < 3) {
    await sendMessage(chatId, `⚠️ ส่งรายงาน ${pia.name} (ID ${pia.staffId}) ${count}/3 รูป (บางส่วนไม่สำเร็จ)`);
  } else if (count === 3) {
    await sendMessage(chatId, `✅ ส่งรายงาน ${pia.name} (ID ${pia.staffId}) 3 รูปเรียบร้อย`);
  }
  return res.status(200).json({ ok: true, staffId, count });
}
