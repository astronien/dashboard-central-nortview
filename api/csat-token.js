// CSAT token management — lets an admin refresh the CSAT access token
// from the dashboard Settings page (no redeploy needed) when it expires.
//
// GET  /api/csat-token          → { hasToken, updatedAt, updatedBy, source }
//                                  (never returns the token value itself)
// POST /api/csat-token          → save a new token
//                                  body: { token, updatedBy? }
//
// The token is stored in Turso (app_config) and read server-side by
// /api/csat. It is never sent back to browsers.

const {
  getAppConfig,
  setAppConfig,
  initTelegramSchema,
} = require("./_lib/tursoClient");

const CSAT_TOKEN_KEY = "csat_token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
};

// CSAT personal access tokens look like "12345|alphanumericstring"
const looksLikeToken = (t) => /^\d+\|[A-Za-z0-9]{20,}$/.test(String(t || "").trim());

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    await initTelegramSchema();
  } catch (e) {
    console.warn("[api/csat-token] schema init failed:", e.message);
  }

  if (req.method === "GET") {
    const cfg = await getAppConfig(CSAT_TOKEN_KEY);
    const hasDbToken = Boolean(cfg && cfg.value && cfg.value.trim());
    return res.status(200).json({
      hasToken: hasDbToken || Boolean((process.env.CSAT_TOKEN || "").trim()),
      source: hasDbToken ? "settings" : process.env.CSAT_TOKEN ? "env" : "none",
      updatedAt: cfg?.updatedAt ?? null,
      updatedBy: cfg?.updatedBy ?? null,
    });
  }

  if (req.method === "POST") {
    const token = String(req.body?.token ?? "").trim();
    const updatedBy = req.body?.updatedBy ? String(req.body.updatedBy) : null;
    if (!token) {
      return res.status(400).json({ ok: false, error: "กรุณากรอก token" });
    }
    if (!looksLikeToken(token)) {
      return res.status(400).json({
        ok: false,
        error: 'รูปแบบ token ไม่ถูกต้อง — ต้องเป็นรูปแบบ "เลข|ตัวอักษร" เช่น 21573|abcd...',
      });
    }
    await setAppConfig(CSAT_TOKEN_KEY, token, updatedBy);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
};
