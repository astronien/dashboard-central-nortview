/**
 * LINE bot (Reply API only — ฟรี ไม่กินโควต้า push)
 *
 * Routed from api/health.js via vercel.json rewrite:
 *   POST /api/line-webhook                    → LINE webhook (ตรวจลายเซ็น)
 *   PUT  /api/line-webhook?resource=snapshot  → หน้าเว็บบันทึกผลตาราง Attach รายวัน
 *   GET  /api/line-webhook?resource=snapshot  → ดู snapshot (debug)
 *
 * คำสั่งในกลุ่ม:
 *   เช็ค / เช็ก / check      → การ์ดสรุปทุกคน (แดง/เหลือง/เขียว)
 *   เช็ค <ชื่อ>              → การ์ดรายคน
 *   ใครรับต่อ / คิวต่อไป      → แนะนำคนรับลูกค้าคนต่อไป
 *   help / วิธีใช้            → วิธีใช้
 *
 * Env: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN
 */
const crypto = require("crypto");
const { getAppConfig, setAppConfig, initTelegramSchema } = require("./tursoClient");

const SNAPSHOT_KEY = "line_attach_snapshot";

const C = {
  brand: "#0B3D2E",
  brandSub: "#A7F3D0",
  red: "#E11D48",
  redBg: "#FFE4E6",
  yellow: "#B45309",
  yellowBg: "#FEF3C7",
  green: "#059669",
  greenBg: "#ECFDF5",
  muted: "#64748B",
  line: "#E2E8F0",
};

// ── helpers ────────────────────────────────────────────────────────────────

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === "string") return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString("utf8"));
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function verifySignature(raw, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  const r = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error("[lineBot] reply failed", r.status, text);
  }
}

async function loadSnapshot() {
  await initTelegramSchema();
  const cfg = await getAppConfig(SNAPSHOT_KEY);
  if (!cfg || !cfg.value) return null;
  try {
    const snap = JSON.parse(cfg.value);
    snap.updatedAt = cfg.updated_at ?? snap.updatedAt;
    return snap;
  } catch {
    return null;
  }
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const firstName = (s) => String(s ?? "").trim().split(/\s+/)[0] || String(s ?? "");

function bangkokYmd(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function fmtDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(ymd ?? "-");
}

function fmtTime(sqlUtc) {
  // app_config.updated_at = "YYYY-MM-DD HH:MM:SS" (UTC)
  const d = new Date(String(sqlUtc ?? "").replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  return `${String(bkk.getUTCHours()).padStart(2, "0")}:${String(bkk.getUTCMinutes()).padStart(2, "0")}`;
}

const STATUS_ORDER = { red: 0, yellow: 1, green: 2 };

function statusInfo(r) {
  if (r.status === "red") {
    return { color: C.red, bg: C.redBg, icon: "🔴", label: "ต้องส่งต่อ — ครบ 4 เครื่องแต่ยังไม่มีบิลแนบ" };
  }
  if (r.status === "yellow") {
    return { color: C.yellow, bg: C.yellowBg, icon: "🟡", label: "ระวัง — อีก 1 เครื่องครบ 4 ยังไม่มีบิลแนบ" };
  }
  return { color: C.green, bg: C.greenBg, icon: "🟢", label: "ปกติ" };
}

const txt = (text, extra = {}) => ({ type: "text", text: String(text), wrap: true, ...extra });

function header(title, sub) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: C.brand,
    paddingAll: "16px",
    contents: [
      txt(title, { color: "#FFFFFF", weight: "bold", size: "md" }),
      ...(sub ? [txt(sub, { color: C.brandSub, size: "xs" })] : []),
    ],
  };
}

function footer(snap) {
  const url = snap && /^https:\/\//.test(snap.dashboardUrl ?? "") ? snap.dashboardUrl : null;
  if (!url) return undefined;
  return {
    type: "box",
    layout: "vertical",
    contents: [
      {
        type: "button",
        style: "primary",
        color: C.brand,
        height: "sm",
        action: { type: "uri", label: "เปิด Dashboard", uri: url },
      },
    ],
  };
}

function staleNotice(snap) {
  if (!snap || snap.date === bangkokYmd()) return [];
  return [
    {
      type: "box",
      layout: "vertical",
      backgroundColor: "#F1F5F9",
      cornerRadius: "8px",
      paddingAll: "8px",
      contents: [
        txt(`ข้อมูลล่าสุดเป็นของวันที่ ${fmtDate(snap.date)} — ยังไม่ได้อัปไฟล์ขายวันนี้`, {
          size: "xxs",
          color: C.muted,
        }),
      ],
    },
  ];
}

function subTitle(snap) {
  const t = fmtTime(snap.updatedAt);
  return [snap.branch, t ? `อัปเดต ${t}` : ""].filter(Boolean).join(" · ");
}

function flex(altText, bubble) {
  return { type: "flex", altText, contents: bubble };
}

// ── bubbles ────────────────────────────────────────────────────────────────

function summaryBubble(snap) {
  const rows = [...(snap.rows ?? [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || b.iphone - a.iphone,
  );
  const count = (s) => rows.filter((r) => r.status === s).length;

  const staffRows = rows.map((r) => {
    const s = statusInfo(r);
    const attachText = r.required > 0 ? `แนบ ${r.credited}/${r.required}` : `แนบ ${r.credited}`;
    const line = {
      type: "box",
      layout: "horizontal",
      contents: [
        txt(`${s.icon} ${firstName(r.name)}`, { weight: r.status === "green" ? "regular" : "bold", size: "sm", flex: 4, wrap: false }),
        txt(`iPhone ${r.iphone}`, { size: "sm", flex: 3, align: "end", color: C.muted }),
        txt(attachText, { size: "sm", flex: 3, align: "end", color: s.color, weight: "bold" }),
      ],
    };
    if (r.status === "green") {
      return { type: "box", layout: "vertical", paddingStart: "10px", paddingEnd: "10px", contents: [line] };
    }
    return {
      type: "box",
      layout: "vertical",
      backgroundColor: s.bg,
      cornerRadius: "8px",
      paddingAll: "10px",
      spacing: "xs",
      contents: [line, txt(s.label, { size: "xxs", color: s.color, weight: "bold" })],
    };
  });

  return {
    type: "bubble",
    size: "mega",
    header: header(`Attach Alert · ${fmtDate(snap.date)}`, subTitle(snap)),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        ...staleNotice(snap),
        {
          type: "box",
          layout: "horizontal",
          contents: [
            txt(`🔴 ${count("red")}`, { weight: "bold", color: C.red, align: "center" }),
            txt(`🟡 ${count("yellow")}`, { weight: "bold", color: C.yellow, align: "center" }),
            txt(`🟢 ${count("green")}`, { weight: "bold", color: C.green, align: "center" }),
          ],
        },
        { type: "separator", color: C.line },
        ...(staffRows.length ? staffRows : [txt("ยังไม่มีข้อมูลพนักงาน", { size: "sm", color: C.muted })]),
        { type: "separator", color: C.line },
        txt("กติกา: iPhone ทุก 4 เครื่องต้องมีบิลแนบ Cover / UFUND / SIM / Acc ≥3 ชิ้น อย่างน้อย 1 บิล", {
          size: "xxs",
          color: C.muted,
        }),
      ],
    },
    footer: footer(snap),
  };
}

function statLine(label, value, color) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      txt(label, { size: "sm", color: C.muted, flex: 5 }),
      txt(String(value), { size: "sm", weight: "bold", align: "end", flex: 3, ...(color ? { color } : {}) }),
    ],
  };
}

function personBubble(snap, r) {
  const s = statusInfo(r);
  const pass = r.iphoneBills > 0 ? `${((r.qualified / r.iphoneBills) * 100).toFixed(0)}%` : "–";
  const nextBlock = r.required + 1;
  const toNext = nextBlock * 4 - r.iphone;
  return {
    type: "bubble",
    size: "mega",
    header: header(r.name, `${fmtDate(snap.date)} · ${subTitle(snap)}`),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        ...staleNotice(snap),
        {
          type: "box",
          layout: "vertical",
          backgroundColor: s.bg,
          cornerRadius: "8px",
          paddingAll: "10px",
          contents: [txt(`${s.icon} ${s.label}`, { size: "sm", weight: "bold", color: s.color })],
        },
        statLine("iPhone (เครื่อง)", r.iphone),
        statLine("บิล iPhone", r.iphoneBills),
        statLine("บิลที่แนบได้ / ต้องมี", `${r.credited} / ${r.required}`, s.color),
        { type: "separator", color: C.line },
        statLine("บิลมี Cover+", r.cover),
        statLine("บิลมี UFUND PERSONAL", r.ufund),
        statLine("บิลมี SIM", r.sim),
        statLine("บิล Acc ≥3 ชิ้น", `${r.qualified} (${pass})`),
        { type: "separator", color: C.line },
        txt(
          r.credited >= nextBlock
            ? "แนบล่วงหน้าไว้แล้ว ✅"
            : `อีก ${toNext} เครื่องจะครบก้อนถัดไป — ต้องมีบิลแนบเพิ่ม ${nextBlock - r.credited} บิล`,
          { size: "xs", color: C.muted },
        ),
      ],
    },
    footer: footer(snap),
  };
}

function nextBubble(snap) {
  const rows = (snap.rows ?? []).filter((r) => r.status !== "red");
  // คะแนน = เครดิตที่เหลือ (บิลแนบ×4 − iPhone) มากสุดก่อน, เสมอกัน → iPhone น้อยกว่า
  const scored = rows
    .map((r) => ({ r, slack: r.credited * 4 - r.iphone }))
    .sort((a, b) => b.slack - a.slack || a.r.iphone - b.r.iphone);
  const top = scored.slice(0, 3);
  const reds = (snap.rows ?? []).filter((r) => r.status === "red");
  return {
    type: "bubble",
    size: "mega",
    header: header("ใครรับลูกค้าคนต่อไป", `${fmtDate(snap.date)} · ${subTitle(snap)}`),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        ...staleNotice(snap),
        ...(top.length
          ? top.map(({ r }, i) => ({
              type: "box",
              layout: "horizontal",
              backgroundColor: i === 0 ? C.greenBg : "#FFFFFF",
              cornerRadius: "8px",
              paddingAll: "10px",
              contents: [
                txt(`${i + 1}. ${firstName(r.name)}`, { weight: "bold", size: "sm", flex: 5, color: i === 0 ? C.green : "#111827" }),
                txt(`iPhone ${r.iphone} · แนบ ${r.credited}`, { size: "xs", align: "end", color: C.muted, flex: 5 }),
              ],
            }))
          : [txt("ทุกคนติดแดง — ต้องแนบให้ได้ก่อน", { size: "sm", color: C.red })]),
        ...(reds.length
          ? [
              { type: "separator", color: C.line },
              txt(`🔴 พักรับ iPhone ก่อน: ${reds.map((r) => firstName(r.name)).join(", ")}`, {
                size: "xs",
                color: C.red,
                weight: "bold",
              }),
            ]
          : []),
      ],
    },
    footer: footer(snap),
  };
}

function helpBubble() {
  return {
    type: "bubble",
    header: header("Attach Bot — วิธีใช้"),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        txt("พิมพ์ในกลุ่ม:", { size: "sm", weight: "bold" }),
        txt("• เช็ค — สรุปทุกคน 🔴🟡🟢", { size: "sm" }),
        txt("• เช็ค ชื่อ — ดูรายคน", { size: "sm" }),
        txt("• ใครรับต่อ — แนะนำคนรับลูกค้าคนถัดไป", { size: "sm" }),
        { type: "separator", color: C.line, margin: "md" },
        txt("ข้อมูลอัปเดตเมื่อเปิดหน้า Dashboard หลังอัปไฟล์ขาย", { size: "xxs", color: C.muted, margin: "md" }),
      ],
    },
  };
}

// ── command routing ────────────────────────────────────────────────────────

async function buildReply(text) {
  const t = String(text ?? "").trim();
  if (/^(help|วิธีใช้|คำสั่ง)$/i.test(t)) return [flex("วิธีใช้ Attach Bot", helpBubble())];

  const isNext = /^(ใครรับต่อ|คิวต่อไป|ส่งต่อใคร|next)$/i.test(t);
  const check = /^(เช็ค|เช็ก|เชค|check)\s*(.*)$/i.exec(t);
  if (!isNext && !check) return null; // ข้อความอื่น → เงียบ

  const snap = await loadSnapshot();
  if (!snap || !Array.isArray(snap.rows)) {
    return [{ type: "text", text: "ยังไม่มีข้อมูล — เปิดหน้า Dashboard หลังอัปไฟล์ขายก่อนนะ" }];
  }

  if (isNext) return [flex("ใครรับลูกค้าคนต่อไป", nextBubble(snap))];

  const q = norm(check[2]);
  if (q) {
    const hits = snap.rows.filter((r) => norm(r.name).includes(q));
    if (hits.length === 1) return [flex(`สถานะ ${hits[0].name}`, personBubble(snap, hits[0]))];
    if (hits.length > 1) {
      return [
        {
          type: "text",
          text: `เจอหลายคน: ${hits.map((r) => r.name).join(", ")} — พิมพ์ชื่อให้ชัดขึ้นอีกนิด`,
        },
      ];
    }
    return [{ type: "text", text: `ไม่พบชื่อ "${check[2].trim()}" ในข้อมูลวันที่ ${fmtDate(snap.date)}` }];
  }

  const reds = snap.rows.filter((r) => r.status === "red").length;
  const yellows = snap.rows.filter((r) => r.status === "yellow").length;
  return [flex(`Attach Alert ${fmtDate(snap.date)} · 🔴${reds} 🟡${yellows}`, summaryBubble(snap))];
}

// ── handlers ───────────────────────────────────────────────────────────────

async function handleSnapshot(req, res) {
  await initTelegramSchema();
  if (req.method === "GET") {
    const snap = await loadSnapshot();
    return res.status(200).json({ ok: true, snapshot: snap });
  }
  if (req.method === "PUT" || req.method === "POST") {
    const raw = await readRawBody(req);
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
    if (!body || !Array.isArray(body.rows) || !body.date) {
      return res.status(400).json({ ok: false, error: "Expect { date, rows[] }" });
    }
    const clean = {
      date: String(body.date).slice(0, 10),
      branch: String(body.branch ?? "").slice(0, 80),
      excludeIphone18: Boolean(body.excludeIphone18),
      dashboardUrl: String(body.dashboardUrl ?? "").slice(0, 200),
      rows: body.rows.slice(0, 40).map((r) => ({
        name: String(r.name ?? "").slice(0, 80),
        totalBaht: Number(r.totalBaht) || 0,
        iphone: Number(r.iphone) || 0,
        iphoneBills: Number(r.iphoneBills) || 0,
        credited: Number(r.credited) || 0,
        required: Number(r.required) || 0,
        qualified: Number(r.qualified) || 0,
        cover: Number(r.cover) || 0,
        ufund: Number(r.ufund) || 0,
        sim: Number(r.sim) || 0,
        status: ["red", "yellow", "green"].includes(r.status) ? r.status : "green",
      })),
    };
    await setAppConfig(SNAPSHOT_KEY, JSON.stringify(clean), "dashboard");
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

async function handleWebhook(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "line-webhook" });
  }
  if (req.method !== "POST") return res.status(405).end();

  const raw = await readRawBody(req);
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!verifySignature(raw, req.headers["x-line-signature"], secret)) {
    console.warn("[lineBot] bad signature");
    return res.status(401).json({ ok: false });
  }

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return res.status(400).end();
  }

  for (const ev of body.events ?? []) {
    try {
      if (!ev.replyToken) continue;
      if (ev.type === "join") {
        await replyMessage(ev.replyToken, [flex("วิธีใช้ Attach Bot", helpBubble())]);
        continue;
      }
      if (ev.type === "message" && ev.message?.type === "text") {
        const messages = await buildReply(ev.message.text);
        if (messages) await replyMessage(ev.replyToken, messages);
      }
    } catch (e) {
      console.error("[lineBot] event failed", e);
    }
  }
  return res.status(200).json({ ok: true });
}

async function handleLine(req, res) {
  try {
    if (req.query?.resource === "snapshot") return await handleSnapshot(req, res);
    return await handleWebhook(req, res);
  } catch (e) {
    console.error("[lineBot]", e);
    // ตอบ 200 ให้ LINE เสมอ (ไม่งั้นจะ retry / แจ้ง error ใน console)
    return res.status(200).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}

module.exports = { handleLine, buildReply, verifySignature };
