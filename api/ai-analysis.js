// AI polish for the daily analysis.
//
// The rule-based engine (src/lib/dailyAnalysis.ts) produces accurate but
// terse text. This endpoint asks Claude to rewrite it as a natural, warm
// Thai coaching report WITHOUT inventing any numbers or facts — it only
// rephrases the material it's given.
//
// POST /api/ai-analysis   body: { text, dateLabel }
//   → { ok, text }  (natural-language Thai) or { ok:false, code, error }
//
// Requires ANTHROPIC_API_KEY in the Vercel env. Model is configurable via
// ANTHROPIC_MODEL (defaults to a Haiku model — cheap and fine for
// rewriting).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const applyCors = (res) =>
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

const SYSTEM = `คุณเป็นหัวหน้าทีมขายร้าน iStudio/Studio7 ที่เขียนบทวิเคราะห์ผลงานทีมประจำวันเป็นภาษาไทย
- น้ำเสียงเป็นกันเอง ให้กำลังใจ แต่ตรงไปตรงมาแบบมืออาชีพ
- ห้ามแต่งตัวเลข ชื่อ หรือข้อเท็จจริงใหม่ ใช้เฉพาะข้อมูลที่ได้รับเท่านั้น
- เขียนให้อ่านลื่น เป็นย่อหน้า/หัวข้อสั้น ๆ ไม่ใช่แค่ bullet ดิบ ๆ
- โครงสร้าง: (1) ภาพรวมทีมสั้น ๆ (2) รายคน — จุดเด่น, จุดที่ต้องพัฒนา, สิ่งที่ควรทำพรุ่งนี้ (3) คนที่วิกฤติ เน้นแผนแก้ไขที่ทำได้จริง
- คำศัพท์: UFUND = สินเชื่อบุคคลสำหรับลูกค้าที่ไม่มีบัตรเครดิต; COVER+/AC+ = ประกันเครื่อง; CSAT = ความพึงพอใจลูกค้า
- กระชับ ไม่เยิ่นเย้อ`;

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      code: "no_key",
      error:
        "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel — ระบบจะใช้บทวิเคราะห์แบบกฎเกณฑ์แทน",
    });
  }

  const text = String(req.body?.text ?? "").trim();
  const dateLabel = String(req.body?.dateLabel ?? "").trim();
  if (!text) {
    return res.status(400).json({ ok: false, error: "Missing text" });
  }

  try {
    const userMsg = `นี่คือบทวิเคราะห์รายวันจากระบบ (ข้อมูลจริง ห้ามแก้ตัวเลข)${
      dateLabel ? ` วันที่ ${dateLabel}` : ""
    }:\n\n${text}\n\nช่วยเรียบเรียงใหม่ให้เป็นบทวิเคราะห์ที่อ่านเป็นธรรมชาติตามแนวทางด้านบน`;

    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const json = await r.json().catch(() => null);
    if (!r.ok) {
      const msg =
        json?.error?.message || `Anthropic API ${r.status}`;
      console.error("[ai-analysis] API error:", msg);
      return res.status(200).json({ ok: false, code: "api_error", error: msg });
    }

    const out = Array.isArray(json?.content)
      ? json.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim()
      : "";

    if (!out) {
      return res
        .status(200)
        .json({ ok: false, code: "empty", error: "AI ไม่ได้ส่งข้อความกลับมา" });
    }
    return res.status(200).json({ ok: true, text: out, model: MODEL });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ai-analysis] failed:", msg);
    return res.status(200).json({ ok: false, code: "error", error: msg });
  }
};
