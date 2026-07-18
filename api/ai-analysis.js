// AI polish for the daily analysis — multi-provider.
//
// The rule-based engine (src/lib/dailyAnalysis.ts) produces accurate but
// terse text. This endpoint asks an LLM to rewrite it as a natural, warm
// Thai coaching report WITHOUT inventing numbers or facts.
//
// Providers: anthropic (Claude), gemini (Google), openai (ChatGPT).
// The provider + API key + model are configured by an admin in the
// Settings page (stored server-side in Turso app_config), or via env
// vars as a fallback. Keys are never returned to the browser.
//
//   POST /api/ai-analysis                 body: { text, dateLabel }
//     → { ok, text, provider, model } or { ok:false, code, error }
//   GET  /api/ai-analysis?resource=config
//     → { provider, hasKey, model, source, updatedAt, updatedBy }
//   POST /api/ai-analysis?resource=config body: { provider, apiKey, model?, updatedBy? }
//     → { ok }

const {
  getAppConfig,
  setAppConfig,
  initTelegramSchema,
} = require("./_lib/tursoClient");

const AI_CONFIG_KEY = "ai_config";

const PROVIDERS = ["anthropic", "gemini", "openai"];
const DEFAULT_MODEL = {
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-1.5-flash",
  openai: "gpt-4o-mini",
};
// Thai is token-heavy and a full multi-staff report is long — give the
// model plenty of room so it doesn't get cut off mid-report.
const MAX_TOKENS = 8000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const applyCors = (res) =>
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

const SYSTEM = `คุณเป็น "พี่หัวหน้า" ของร้าน iStudio/Studio7 ที่คุยกับน้อง ๆ ในทีมขายแบบพี่น้องกันเอง เขียนสรุปผลงานประจำวันเป็นภาษาไทย
- น้ำเสียง: อบอุ่น เป็นกันเอง เหมือนพี่คุยกับน้องในไลน์กลุ่มหลังปิดร้าน — เรียกทุกคนว่า "น้อง" ตามด้วยชื่อ (เช่น "น้องอารีญา") ใช้สรรพนามแทนตัวเองว่า "พี่"
- ให้กำลังใจก่อน แล้วค่อยบอกจุดที่ต้องปรับ พูดตรงแต่ไม่กดดัน มีมุกเบา ๆ / อิโมจิได้บ้างพอประมาณ (เช่น 💪🔥👏) แต่อย่าเยอะเกิน
- ชมของจริงเมื่อทำได้ดี ("เก่งมากน้อง...") และเวลาเตือนให้ใช้โทนชวนทำ ("ลองแบบนี้ดูนะ", "พรุ่งนี้พี่ว่าเราลุย ... กัน")
- ห้ามแต่งตัวเลข ชื่อ หรือข้อเท็จจริงใหม่ ใช้เฉพาะข้อมูลที่ได้รับเท่านั้น
- เขียนให้อ่านลื่นเป็นย่อหน้าคุย ๆ ไม่ใช่ bullet ดิบ ๆ
- โครงสร้าง: (1) ทักทายทีม + ภาพรวมวันนี้สั้น ๆ (2) ราย "น้อง" แต่ละคน — ชมจุดเด่น, จุดที่อยากให้ปรับ, พรุ่งนี้ลองทำอะไร (3) คนที่สถานการณ์หนัก พี่ช่วยวางแผนแก้ให้เป็นข้อ ๆ ที่ทำได้จริง แล้วปิดท้ายด้วยการให้กำลังใจทั้งทีม
- สำคัญ: ต้องพูดถึงน้องทุกคนที่อยู่ในข้อมูล ห้ามข้ามหรือสรุปรวบคน
- คำศัพท์: UFUND = สินเชื่อบุคคลสำหรับลูกค้าที่ไม่มีบัตรเครดิต; COVER+/AC+ = ประกันเครื่อง; CSAT = ความพึงพอใจลูกค้า`;

// ── config resolution ──────────────────────────────────────────────────
async function resolveAiConfig() {
  try {
    const cfg = await getAppConfig(AI_CONFIG_KEY);
    if (cfg && cfg.value) {
      const p = JSON.parse(cfg.value);
      if (p && p.apiKey && PROVIDERS.includes(p.provider)) {
        return {
          provider: p.provider,
          apiKey: String(p.apiKey),
          model: p.model || DEFAULT_MODEL[p.provider],
          source: "settings",
          updatedAt: cfg.updatedAt,
          updatedBy: cfg.updatedBy,
        };
      }
    }
  } catch (e) {
    console.warn("[ai-analysis] could not read config from DB:", e.message);
  }
  // env fallbacks
  if (process.env.ANTHROPIC_API_KEY)
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL.anthropic,
      source: "env",
    };
  if (process.env.GEMINI_API_KEY)
    return {
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL.gemini,
      source: "env",
    };
  if (process.env.OPENAI_API_KEY)
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL.openai,
      source: "env",
    };
  return null;
}

// ── provider calls (return text or throw) ──────────────────────────────
async function callAnthropic(apiKey, model, userMsg) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.error?.message || `Anthropic ${r.status}`);
  return (json?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function callGemini(apiKey, model, userMsg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.7 },
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.error?.message || `Gemini ${r.status}`);
  const cand = json?.candidates?.[0];
  // Prompt/response blocked → surface a clear reason instead of empty text
  if (!cand || (cand.finishReason && cand.finishReason === "SAFETY")) {
    throw new Error("Gemini ปฏิเสธคำขอ (SAFETY) — ลองใหม่หรือเปลี่ยนโมเดล");
  }
  const parts = cand?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("\n")
    .trim();
}

async function callOpenAI(apiKey, model, userMsg) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.error?.message || `OpenAI ${r.status}`);
  return (json?.choices?.[0]?.message?.content || "").trim();
}

async function generate(cfg, userMsg) {
  switch (cfg.provider) {
    case "gemini":
      return callGemini(cfg.apiKey, cfg.model, userMsg);
    case "openai":
      return callOpenAI(cfg.apiKey, cfg.model, userMsg);
    case "anthropic":
    default:
      return callAnthropic(cfg.apiKey, cfg.model, userMsg);
  }
}

// ── config sub-handler ─────────────────────────────────────────────────
async function handleConfigResource(req, res) {
  try {
    await initTelegramSchema();
  } catch (e) {
    console.warn("[ai-analysis] schema init failed:", e.message);
  }

  if (req.method === "GET") {
    const cfg = await resolveAiConfig();
    return res.status(200).json({
      provider: cfg?.provider ?? "anthropic",
      hasKey: Boolean(cfg),
      model: cfg?.model ?? "",
      source: cfg?.source ?? "none",
      updatedAt: cfg?.updatedAt ?? null,
      updatedBy: cfg?.updatedBy ?? null,
      defaultModels: DEFAULT_MODEL,
    });
  }

  if (req.method === "POST") {
    const provider = String(req.body?.provider ?? "").trim();
    const apiKey = String(req.body?.apiKey ?? "").trim();
    const model = String(req.body?.model ?? "").trim();
    const updatedBy = req.body?.updatedBy ? String(req.body.updatedBy) : null;
    if (!PROVIDERS.includes(provider)) {
      return res
        .status(400)
        .json({ ok: false, error: "provider ต้องเป็น anthropic, gemini หรือ openai" });
    }
    if (!apiKey) {
      return res.status(400).json({ ok: false, error: "กรุณากรอก API key" });
    }
    await setAppConfig(
      AI_CONFIG_KEY,
      JSON.stringify({ provider, apiKey, model: model || DEFAULT_MODEL[provider] }),
      updatedBy,
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// ── main handler ───────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.query.resource === "config") {
    return handleConfigResource(req, res);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const cfg = await resolveAiConfig();
  if (!cfg) {
    return res.status(200).json({
      ok: false,
      code: "no_key",
      error:
        "ยังไม่ได้ตั้งค่า AI — ไปที่ Settings เพื่อเลือกค่าย (Claude/Gemini/ChatGPT) และใส่ API key",
    });
  }

  const text = String(req.body?.text ?? "").trim();
  const dateLabel = String(req.body?.dateLabel ?? "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

  try {
    const userMsg = `นี่คือบทวิเคราะห์รายวันจากระบบ (ข้อมูลจริง ห้ามแก้ตัวเลข)${
      dateLabel ? ` วันที่ ${dateLabel}` : ""
    }:\n\n${text}\n\nช่วยเรียบเรียงใหม่ให้เป็นบทวิเคราะห์ที่อ่านเป็นธรรมชาติตามแนวทางด้านบน`;

    const out = await generate(cfg, userMsg);
    if (!out) {
      return res
        .status(200)
        .json({ ok: false, code: "empty", error: "AI ไม่ได้ส่งข้อความกลับมา" });
    }
    return res
      .status(200)
      .json({ ok: true, text: out, provider: cfg.provider, model: cfg.model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ai-analysis] failed:", msg);
    return res.status(200).json({ ok: false, code: "api_error", error: msg });
  }
};
