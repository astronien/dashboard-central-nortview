/**
 * Telegram Bot Webhook
 *
 * Single endpoint handling:
 *   /start, /help          → welcome + help
 *   /start report_<id>     → deep link from web app button (triggers /report <id>)
 *   /report                → PIA list (inline keyboard)
 *   /report <staffId>      → 3 photos in 15s
 *   /report all            → schedule 13 PIAs via QStash (5 min)
 *   document (xlsx)        → upload to Turso
 *   callback_query         → button press handler
 *
 * No 1s reply timeout (vs LINE). No R2 needed (send Buffer directly).
 */

import * as XLSX from "xlsx";
import {
  sendMessage,
  answerCallbackQuery,
  getFile,
  downloadFile,
} from "./_lib/telegramBot.js";
import {
  getPiaListForBranch,
} from "./_lib/piaReportBuilder.js";
import { schedulePiaJob } from "./_lib/qstash.js";
import { processUpload } from "./_lib/uploadProcessor.js";
import { detectBranchFromRows } from "./_lib/branchDetector.js";
import { upsertTelegramChat, initLineBotSchema } from "./_lib/tursoClient.js";

const BRANCH_ID = process.env.TELEGRAM_BRANCH_ID ?? "645";
const BRANCH_DISPLAY = process.env.TELEGRAM_BRANCH_DISPLAY ?? "ID645 : Studio 7-Central-Westgate";
const DELAY_BETWEEN_PIAS_SEC = 25;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end();

  const update = req.body;
  if (!update) return res.status(200).json({ ok: true });

  // Ensure telegram_chats table exists (idempotent)
  try { await initLineBotSchema(); } catch (e) {
    console.error("[telegram] schema init failed:", e);
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (e) {
    console.error("[telegram] error:", e);
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (chatId) {
      await sendMessage(chatId, `❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return res.status(200).json({ ok: true });
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = String(msg.text ?? "").trim();

  // Store chat_id for web app "ส่งไป Telegram" button (fire-and-forget)
  if (msg.chat?.type === "private") {
    upsertTelegramChat({
      chatId,
      username: msg.from?.username ?? null,
      firstName: msg.from?.first_name ?? null,
    }).catch((e) => console.error("[telegram] upsertTelegramChat failed:", e));
  }

  if (!text && !msg.document) return;

  // /start handles both plain start and deep link payloads:
  //   /start                    → welcome help
  //   /start report_<staffId>   → trigger report (from web app button)
  if (text === "/help" || text === "/start") {
    return sendMessage(chatId,
      "🤖 PIA Report Bot\n\n" +
      "Commands:\n" +
      "/report — เลือก PIA ที่ต้องการ\n" +
      "/report <staffId> — ขอ PIA โดยตรง (เช่น /report 23510)\n" +
      "/report all — ส่งทุก PIA (39 รูป, รอ ~5 นาที)\n\n" +
      "📎 ส่งไฟล์ Excel (.xlsx) เพื่ออัปโหลดข้อมูลยอดขาย"
    );
  }

  // Deep link from web app: /start report_<staffId>
  if (text.startsWith("/start ")) {
    const payload = text.replace(/^\/start\s+/, "").trim();
    if (payload.startsWith("report_")) {
      const staffId = payload.replace(/^report_/, "").trim();
      if (staffId) {
        return handleDirectPiaReport(chatId, staffId);
      }
    }
    // Unknown /start payload — fall through to help
    return sendMessage(chatId,
      "🤖 PIA Report Bot\n\n" +
      "Commands:\n" +
      "/report — เลือก PIA ที่ต้องการ\n" +
      "/report <staffId> — ขอ PIA โดยตรง (เช่น /report 23510)\n" +
      "/report all — ส่งทุก PIA (39 รูป, รอ ~5 นาที)\n\n" +
      "📎 ส่งไฟล์ Excel (.xlsx) เพื่ออัปโหลดข้อมูลยอดขาย"
    );
  }

  const lower = text.toLowerCase();
  if (lower === "/report" || lower === "report") {
    return handleReportMenu(chatId);
  }

  if (lower.startsWith("/report ") || lower.startsWith("report ")) {
    const query = text.replace(/^\/?report\s+/i, "").trim();
    if (query.toLowerCase() === "all") {
      return handleReportAll(chatId);
    }
    if (query) {
      return handleDirectPiaReport(chatId, query);
    }
    return handleReportMenu(chatId);
  }

  if (msg.document) {
    return handleFileUpload(msg);
  }

  return sendMessage(chatId, "พิมพ์ /report เพื่อดูรายงาน PIA หรือ /help");
}

async function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const data = cb.data ?? "";

  await answerCallbackQuery(cb.id);

  if (data.startsWith("report_pia:")) {
    const staffId = data.slice("report_pia:".length);
    return handleDirectPiaReport(chatId, staffId);
  }
  if (data === "report_more") {
    return handleReportMore(chatId);
  }
  if (data === "report_all") {
    return handleReportAll(chatId);
  }
}

async function handleReportMenu(chatId) {
  const piaList = await getPiaListForBranch(BRANCH_ID);
  if (piaList.length === 0) {
    return sendMessage(chatId, "❌ ไม่พบ PIA ในสาขานี้ (อัปโหลด Target ก่อน)");
  }

  const first12 = piaList.slice(0, 12);
  const remaining = piaList.slice(12);

  const buttons = first12.map((pia) => [{
    text: `${pia.staffId} ${pia.name}`.slice(0, 30),
    callback_data: `report_pia:${pia.staffId}`,
  }]);

  if (remaining.length > 0) {
    buttons.push([{
      text: `📄 ดูเพิ่มเติม (${remaining.length})`,
      callback_data: "report_more",
    }]);
  }
  if (piaList.length > 1) {
    buttons.push([{
      text: `📊 ส่งทุกคน (${piaList.length} PIAs, ~${Math.ceil(piaList.length * DELAY_BETWEEN_PIAS_SEC / 60)} นาที)`,
      callback_data: "report_all",
    }]);
  }

  return sendMessage(chatId,
    `📊 PIA ในสาขา (${piaList.length} คน):`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function handleReportMore(chatId) {
  const piaList = await getPiaListForBranch(BRANCH_ID);
  const remaining = piaList.slice(12);

  if (remaining.length === 0) {
    return sendMessage(chatId, "ไม่มี PIA เพิ่มเติม");
  }

  const buttons = remaining.map((pia) => [{
    text: `${pia.staffId} ${pia.name}`.slice(0, 30),
    callback_data: `report_pia:${pia.staffId}`,
  }]);

  return sendMessage(chatId,
    `📊 PIA เพิ่มเติม (${remaining.length} คน):`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function handleReportAll(chatId) {
  const piaList = await getPiaListForBranch(BRANCH_ID);
  if (piaList.length === 0) {
    return sendMessage(chatId, "❌ ไม่พบ PIA");
  }

  const totalMin = Math.ceil(piaList.length * DELAY_BETWEEN_PIAS_SEC / 60);
  await sendMessage(chatId,
    `📊 กำลังส่ง ${piaList.length} PIAs (รอ ~${totalMin} นาที)\n` +
    `แต่ละคนจะได้รับ 3 รูป ทุก ๆ ${DELAY_BETWEEN_PIAS_SEC} วินาที`
  );

  for (let i = 0; i < piaList.length; i++) {
    const pia = piaList[i];
    try {
      await schedulePiaJob({
        staffId: pia.staffId,
        branchId: BRANCH_ID,
        chatId,
        delay: i * DELAY_BETWEEN_PIAS_SEC,
      });
    } catch (e) {
      console.error(`[telegram] schedulePiaJob ${pia.staffId} failed:`, e);
    }
  }
}

async function handleDirectPiaReport(chatId, staffId) {
  const piaList = await getPiaListForBranch(BRANCH_ID);
  const pia = piaList.find((p) => p.staffId === staffId);

  if (!pia) {
    return sendMessage(chatId, `❌ ไม่พบ PIA (ID ${staffId})`);
  }

  // Schedule via QStash — the capture takes ~45-55s which is too long
  // for the Vercel 60s webhook limit. QStash calls process-pia.js which
  // does the 3 captures + sendPhoto. Webhook returns immediately.
  try {
    await schedulePiaJob({ staffId, branchId: BRANCH_ID, chatId, delay: 0 });
    return sendMessage(chatId,
      `📊 กำลังสร้างรายงาน ${pia.name} (ID ${staffId})...\n` +
      `⏳ รอประมาณ 1 นาที รูปจะส่งมาในแชตอัตโนมัติ`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[bot] schedulePiaJob ${staffId} failed:`, msg);
    return sendMessage(chatId, `❌ ไม่สามารถสร้างรายงานได้ (QStash error) — ลองอีกครั้ง`);
  }
}

async function handleFileUpload(msg) {
  const chatId = msg.chat.id;
  const doc = msg.document;

  if (!doc.file_name?.match(/\.xlsx?$/i)) {
    return sendMessage(chatId, "❌ กรุณาส่งไฟล์ .xlsx เท่านั้น");
  }
  if (doc.file_size > 10 * 1024 * 1024) {
    return sendMessage(chatId, `❌ ไฟล์ใหญ่เกิน 10MB (${(doc.file_size / 1024 / 1024).toFixed(1)}MB)`);
  }

  await sendMessage(chatId, "📊 กำลังดาวน์โหลดและประมวลผล...");

  let buf;
  try {
    const fileInfo = await getFile(doc.file_id);
    if (!fileInfo.ok) {
      return sendMessage(chatId, `❌ ดาวน์โหลดไฟล์ไม่สำเร็จ: ${fileInfo.description}`);
    }
    buf = await downloadFile(fileInfo.result.file_path);
  } catch (e) {
    return sendMessage(chatId, `❌ ดาวน์โหลดไฟล์ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
  }

  const branchResult = await detectBranchFromExcel(buf);
  if (branchResult.error) {
    return sendMessage(chatId, `❌ ${branchResult.error}`);
  }

  try {
    const result = await processUpload({
      fileBase64: buf.toString("base64"),
      fileName: doc.file_name,
      kind: "current",
      branchId: branchResult.branchId,
      source: "telegram",
      lineUserId: String(chatId),
      displayName: msg.from?.first_name ?? null,
    });

    if (!result.ok) {
      return sendMessage(chatId, `❌ ${result.error}`);
    }

    return sendMessage(chatId,
      `✅ อัปโหลดสำเร็จ!\n` +
      `📁 ไฟล์: ${doc.file_name}\n` +
      `👥 ${result.rows.toLocaleString()} แถว\n` +
      `💰 ยอดรวม: ฿${(result.actualTotal ?? 0).toLocaleString()}`
    );
  } catch (e) {
    return sendMessage(chatId, `❌ ประมวลผลไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function detectBranchFromExcel(buf) {
  try {
    const workbook = XLSX.read(buf, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { branchId: null, error: "ไฟล์ Excel ไม่มี sheet" };
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    return detectBranchFromRows(rows);
  } catch (e) {
    return { branchId: null, error: `อ่านไฟล์ไม่ได้: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
