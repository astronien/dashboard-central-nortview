/**
 * PIA Report Generation Endpoint
 *
 * Receives { userId, staffId, branchId, accessToken } and:
 *   1. Builds PIA report data from Turso
 *   2. Generates 3 PNGs (sequential) via Cloudflare Worker
 *   3. Uploads to R2
 *   4. Multicasts 3 images + confirmation text to LINE user
 *
 * Called via fire-and-forget fetch from the webhook handler.
 * Vercel serverless will keep this endpoint running until completion.
 */

import { buildPiaReport } from "./_lib/piaReportBuilder.js";
import { uploadToR2 } from "./_lib/imageStorage.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Internal auth — require a shared secret
  const auth = req.headers.authorization;
  const expected = `Bearer ${process.env.REPORT_INTERNAL_SECRET ?? "pia-secret"}`;
  if (auth !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId, staffId, branchId } = req.body || {};
  if (!userId || !staffId || !branchId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Acknowledge immediately so caller knows we received it
  res.status(202).json({ accepted: true, staffId });

  // Process in background (don't await — Vercel will keep this handler alive
  // until the promise resolves because we already sent a response)
  process
    .generateAndSend(userId, staffId, branchId)
    .catch((e) => console.error("[pia-report-generate] failed:", e));
}

async function generateAndSend(userId, staffId, branchId) {
  // Get access token from env (LINE channel access token)
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[pia-report-generate] missing LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  // 1. Build PIA data
  const pia = await buildPiaReport(staffId, branchId);
  if (!pia) {
    await pushText(userId, `❌ ไม่พบข้อมูล PIA (ID ${staffId})`, accessToken);
    return;
  }

  const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
  if (!workerUrl) {
    await pushText(userId, "❌ CLOUDFLARE_WORKER_URL ยังไม่ได้ตั้งค่า", accessToken);
    return;
  }

  // 2. Generate 3 PNGs (sequential to avoid 429)
  let kpiBuf, wonderBuf, categoryBuf;
  try {
    kpiBuf = await generatePng(workerUrl, "kpi", pia);
    await sleep(500);
    wonderBuf = await generatePng(workerUrl, "wonder", pia);
    await sleep(500);
    categoryBuf = await generatePng(workerUrl, "category", pia);
  } catch (e) {
    console.error("[pia-report-generate] generatePng failed:", e);
    await pushText(
      userId,
      `❌ สร้างรูปไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`,
      accessToken,
    );
    return;
  }

  // 3. Upload to R2
  const ts = Date.now();
  const [kpiUrl, wonderUrl, categoryUrl] = await Promise.all([
    uploadToR2(kpiBuf, `${staffId}-${ts}-kpi.png`),
    uploadToR2(wonderBuf, `${staffId}-${ts}-wonder.png`),
    uploadToR2(categoryBuf, `${staffId}-${ts}-category.png`),
  ]);

  // 4. Multicast 3 images
  await fetch("https://api.line.me/v2/bot/message/multicast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: [userId],
      messages: [
        { type: "image", originalContentUrl: kpiUrl, previewImageUrl: kpiUrl },
        { type: "image", originalContentUrl: wonderUrl, previewImageUrl: wonderUrl },
        { type: "image", originalContentUrl: categoryUrl, previewImageUrl: categoryUrl },
      ],
    }),
  });

  await pushText(
    userId,
    `✅ ส่งรายงาน ${pia.name} (ID ${pia.staffId}) เรียบร้อย`,
    accessToken,
  );
}

async function generatePng(workerUrl, template, data) {
  const res = await fetch(`${workerUrl}/screenshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template, data }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Worker ${template} failed: ${res.status} ${errText}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function pushText(userId, text, accessToken) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
