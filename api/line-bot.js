/**
 * LINE Bot endpoints — consolidated.
 *
 * Routes:
 *   POST   /api/line-bot                  — webhook (LINE event)
 *   GET    /api/line-bot/users            — list allowlist
 *   POST   /api/line-bot/users            — add user
 *   PATCH  /api/line-bot/users?userId=…   — update user
 *   DELETE /api/line-bot/users?userId=…   — remove user
 *   GET    /api/line-bot/last-modified    — last upload timestamp (for polling)
 *   POST   /api/line-bot/cron/cleanup     — audit cleanup (called by Vercel cron)
 *
 * Webhook flow:
 *   1. Verify LINE signature
 *   2. Parse event (file or text message)
 *   3. Authorize user via allowlist
 *   4. Download file via Content API
 *   5. Detect branch from file
 *   6. Forward to processUpload (DELETE + INSERT transaction)
 *   7. Reply with text or Flex Message
 *
 * Required Vercel env vars:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *   LINE_CHANNEL_SECRET
 *   CRON_SECRET  (for the cron endpoint)
 */

import { processUpload } from "./_lib/uploadProcessor.js";
import {
  verifyLineSignature,
  getLineContent,
} from "./_lib/lineAuth.js";
import { detectBranchFromRows } from "./_lib/branchDetector.js";
import { buildReplyMessage, buildErrorFlex } from "./_lib/lineMessage.js";
import { getTursoClient } from "./_lib/tursoClient.js";
import * as XLSX from "xlsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-line-signature, Authorization",
};

function applyCors(res) {
  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
}

// ============================================================
//  ALLOWLIST (used by webhook)
// ============================================================

async function isAuthorizedUser(lineUserId) {
  try {
    const client = getTursoClient();
    const res = await client.execute({
      sql: "SELECT role, branch_id, display_name FROM line_user_allowlist WHERE line_user_id = ? AND is_active = 1",
      args: [lineUserId],
    });
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return { role: String(r.role), branchId: String(r.branch_id), displayName: String(r.display_name) };
  } catch (e) {
    console.error("[line-bot] allowlist check failed:", e);
    return null;
  }
}

// ============================================================
//  BRANCH DETECTION
// ============================================================

async function detectBranchFromExcel(buf) {
  try {
    const workbook = XLSX.read(buf, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { branchId: null, error: "ไฟล์ Excel ไม่มี sheet", allBranches: [] };
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    return detectBranchFromRows(rows);
  } catch (e) {
    return { branchId: null, error: `อ่านไฟล์ไม่ได้: ${e.message}`, allBranches: [] };
  }
}

// ============================================================
//  REPLY VIA LINE REPLY API
// ============================================================

async function replyToLine(replyToken, messages, accessToken) {
  if (!replyToken || !messages) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ replyToken, messages: Array.isArray(messages) ? messages : [messages] }),
    });
  } catch (e) {
    console.error("[line-bot] replyToLine failed:", e);
  }
}

// ============================================================
//  WEBHOOK HANDLER
// ============================================================

async function handleWebhookEvent(event, accessToken) {
  if (event.type !== "message" || event.message.type !== "file") return;

  const messageId = event.message.id;
  const fileName = event.message.fileName || "upload.xlsx";
  const fileSize = event.message.fileSize || 0;
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  if (fileSize > 10 * 1024 * 1024) {
    await replyToLine(
      replyToken,
      buildErrorFlex(`ไฟล์ใหญ่เกินไป (${(fileSize / 1024 / 1024).toFixed(1)}MB) — กรุณาแยกไฟล์หรือลดขนาด`),
      accessToken,
    );
    return;
  }

  const user = await isAuthorizedUser(userId);
  if (!user) {
    await replyToLine(
      replyToken,
      buildErrorFlex("คุณไม่มีสิทธิ์อัปโหลดไฟล์ กรุณาติดต่อ Admin"),
      accessToken,
    );
    return;
  }

  const buf = await getLineContent(messageId, accessToken);
  if (!buf) {
    await replyToLine(
      replyToken,
      buildErrorFlex("ดาวน์โหลดไฟล์จาก LINE ไม่สำเร็จ กรุณาลองใหม่"),
      accessToken,
    );
    return;
  }

  const branchResult = await detectBranchFromExcel(buf);
  if (branchResult.error) {
    await replyToLine(replyToken, buildErrorFlex(branchResult.error), accessToken);
    return;
  }

  const fileBase64 = buf.toString("base64");
  const result = await processUpload({
    fileBase64,
    fileName,
    kind: "current",
    branchId: branchResult.branchId,
    source: "line",
    lineUserId: userId,
    displayName: user.displayName,
  });

  if (!result.ok) {
    await replyToLine(replyToken, buildErrorFlex(result.error), accessToken);
    return;
  }

  const achPct = result.targetTotal ? (result.actualTotal / result.targetTotal) * 100 : 0;
  const messages = buildReplyMessage({
    fileName,
    rows: result.rows,
    branchId: result.branch,
    targetTotal: result.targetTotal,
    actualTotal: result.actualTotal,
    achPct,
    topOfficers: result.topOfficers || [],
  });
  await replyToLine(replyToken, messages, accessToken);
}

// ============================================================
//  USER MANAGEMENT (admin)
// ============================================================

async function handleUsers(req, res, userId) {
  const client = getTursoClient();
  const method = req.method;

  if (!userId && method === "GET") {
    const result = await client.execute({
      sql: "SELECT line_user_id, display_name, role, branch_id, added_by, added_at, is_active FROM line_user_allowlist ORDER BY added_at DESC",
    });
    return res.status(200).json({
      users: result.rows.map((r) => ({
        lineUserId: String(r.line_user_id),
        displayName: String(r.display_name),
        role: String(r.role),
        branchId: String(r.branch_id),
        addedBy: String(r.added_by),
        addedAt: String(r.added_at),
        isActive: Number(r.is_active) === 1,
      })),
    });
  }

  if (!userId && method === "POST") {
    const { lineUserId, displayName, role, branchId, addedBy } = req.body || {};
    if (!lineUserId || !displayName || !role || !branchId || !addedBy) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }
    if (role !== "BSM" && role !== "Asst.BSM") {
      return res.status(400).json({ error: "role ต้องเป็น BSM หรือ Asst.BSM" });
    }
    try {
      await client.execute({
        sql: `INSERT INTO line_user_allowlist
          (line_user_id, display_name, role, branch_id, added_by, added_at, is_active)
          VALUES (?, ?, ?, ?, ?, datetime('now'), 1)`,
        args: [lineUserId, displayName, role, branchId, addedBy],
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      if (String(e).includes("UNIQUE") || String(e).includes("PRIMARY KEY")) {
        return res.status(409).json({ error: "LINE user นี้อยู่ใน allowlist แล้ว" });
      }
      throw e;
    }
  }

  if (userId && method === "PATCH") {
    const { displayName, role, branchId, isActive } = req.body || {};
    const fields = [];
    const args = [];
    if (displayName !== undefined) { fields.push("display_name = ?"); args.push(displayName); }
    if (role !== undefined) {
      if (role !== "BSM" && role !== "Asst.BSM") {
        return res.status(400).json({ error: "role ต้องเป็น BSM หรือ Asst.BSM" });
      }
      fields.push("role = ?"); args.push(role);
    }
    if (branchId !== undefined) { fields.push("branch_id = ?"); args.push(branchId); }
    if (isActive !== undefined) { fields.push("is_active = ?"); args.push(isActive ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    args.push(userId);
    await client.execute({
      sql: `UPDATE line_user_allowlist SET ${fields.join(", ")} WHERE line_user_id = ?`,
      args,
    });
    return res.status(200).json({ ok: true });
  }

  if (userId && method === "DELETE") {
    await client.execute({
      sql: "DELETE FROM line_user_allowlist WHERE line_user_id = ?",
      args: [userId],
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ============================================================
//  LAST-MODIFIED (for polling)
// ============================================================

async function handleLastModified(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT MAX(updated_at) AS lastModified, kind, branch_id FROM upload_chunks WHERE line_user_id IS NOT NULL GROUP BY kind, branch_id ORDER BY MAX(updated_at) DESC LIMIT 1",
    });
    if (result.rows.length === 0 || !result.rows[0].lastModified) {
      return res.status(200).json({ lastModified: null, latestKind: null, latestBranch: null });
    }
    const row = result.rows[0];
    return res.status(200).json({
      lastModified: String(row.lastModified),
      latestKind: row.kind ? String(row.kind) : null,
      latestBranch: row.branch_id ? String(row.branch_id) : null,
    });
  } catch (e) {
    console.error("[line-bot/last-modified]", e);
    return res.status(200).json({ lastModified: null, error: String(e?.message ?? e) });
  }
}

// ============================================================
//  AUDIT CLEANUP (cron)
// ============================================================

async function handleCronCleanup(req, res) {
  const auth = req.headers.authorization;
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (expected !== "Bearer " && auth !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const client = getTursoClient();
    const strip = await client.execute({
      sql: "UPDATE upload_audit_log SET file_data = NULL WHERE created_at < datetime('now', '-30 days') AND created_at >= datetime('now', '-90 days') AND file_data IS NOT NULL",
    });
    const del = await client.execute({
      sql: "DELETE FROM upload_audit_log WHERE created_at < datetime('now', '-90 days')",
    });
    return res.status(200).json({
      ok: true,
      stripped: Number(strip.rowsAffected ?? 0),
      deleted: Number(del.rowsAffected ?? 0),
      ranAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[line-bot/cron-cleanup]", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

// ============================================================
//  MAIN DISPATCHER
// ============================================================

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const url = req.url || "";
  // Match sub-paths: /api/line-bot/users, /api/line-bot/last-modified, /api/line-bot/cron/cleanup
  // Note: vercel rewrites /api/line-bot/users/:id to /api/line-bot?userId=…
  const userId = req.query?.userId ?? null;

  // 1. Webhook: POST /api/line-bot (no query.userId)
  if (!userId && req.method === "POST" && !url.includes("/users") && !url.includes("/cron/")) {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelSecret || !accessToken) {
      console.error("[line-bot] missing env vars");
      return res.status(500).json({ error: "Server misconfigured" });
    }
    const signature = req.headers["x-line-signature"];
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const events = body.events || [];
    for (const event of events) {
      try {
        await handleWebhookEvent(event, accessToken);
      } catch (e) {
        console.error("[line-bot] event error:", e);
      }
    }
    return res.status(200).json({ ok: true });
  }

  // 2. Users: GET/POST/PATCH/DELETE /api/line-bot/users or /api/line-bot?userId=…
  if (url.includes("/users") || userId) {
    return handleUsers(req, res, userId);
  }

  // 3. Last-modified: GET /api/line-bot/last-modified
  if (url.includes("/last-modified")) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    return handleLastModified(req, res);
  }

  // 4. Cron cleanup: /api/line-bot?route=cron/cleanup (GET from Vercel cron)
  if (url.includes("cron/cleanup") || req.query?.route === "cron/cleanup") {
    return handleCronCleanup(req, res);
  }

  // Default: return a small README so GET /api/line-bot isn't 404
  return res.status(200).json({
    service: "line-bot",
    routes: [
      "POST   /api/line-bot                (webhook)",
      "GET    /api/line-bot/users          (list allowlist)",
      "POST   /api/line-bot/users          (add user)",
      "PATCH  /api/line-bot/users?userId=… (update user)",
      "DELETE /api/line-bot/users?userId=… (remove user)",
      "GET    /api/line-bot/last-modified  (polling)",
      "POST   /api/line-bot/cron/cleanup   (audit cleanup)",
    ],
  });
}
