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
// หลักออกแบบ: ภาษาพูด ไม่ใช้ตัวย่อ, จัดกลุ่มตามสถานะ, บอก "ต้องทำอะไร" ชัดๆ

const RULE_TEXT = "กติกา: ขาย iPhone ทุก 4 เครื่อง ต้องมีอย่างน้อย 1 บิลที่แนบ Cover+ / UFUND / SIM หรือ Acc 3 ชิ้น";

/** URL รูปพนักงาน (จากหน้า Staff Profile) — LINE ต้องเป็น https + JPEG/PNG */
function photoUrlOf(snap, r) {
  const base = String(snap?.dashboardUrl ?? "");
  if (!r.photoId || !/^https:\/\//.test(base)) return null;
  const v = r.photoVer ? `&v=${r.photoVer}` : "";
  return `${base}/api/staff-photos?resource=image&id=${encodeURIComponent(r.photoId)}${v}`;
}

/** header การ์ดรายคน: รูป + ชื่อ */
function personHeader(snap, r) {
  const url = photoUrlOf(snap, r);
  const textBox = {
    type: "box",
    layout: "vertical",
    justifyContent: "center",
    flex: 1,
    contents: [
      txt(r.name, { color: "#FFFFFF", weight: "bold", size: "lg" }),
      txt(`${fmtDate(snap.date)} · ${subTitle(snap)}`, { color: C.brandSub, size: "xs" }),
    ],
  };
  if (!url) return header(r.name, `${fmtDate(snap.date)} · ${subTitle(snap)}`);
  return {
    type: "box",
    layout: "horizontal",
    backgroundColor: C.brand,
    paddingAll: "14px",
    spacing: "md",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "72px",
        height: "96px",
        cornerRadius: "12px",
        backgroundColor: "#D1FAE5",
        flex: 0,
        contents: [
          { type: "image", url, size: "full", aspectRatio: "3:4", aspectMode: "fit", gravity: "top" },
        ],
      },
      textBox,
    ],
  };
}

/** เครื่องที่เท่าไหร่ของก้อน 4 ปัจจุบัน (1–4) */
function blockPos(r) {
  if (r.iphone <= 0) return 0;
  const m = r.iphone % 4;
  return m === 0 ? 4 : m;
}

/** ประโยคสั้นๆ อธิบายสถานะของคนนั้น */
function personSentence(r) {
  if (r.status === "red") {
    const missing = Math.max(1, r.required - r.credited);
    return r.credited === 0
      ? `ขาย iPhone ${r.iphone} เครื่อง · ยังไม่มีบิลแนบเลย`
      : `ขาย iPhone ${r.iphone} เครื่อง · แนบแล้ว ${r.credited} บิล ขาดอีก ${missing}`;
  }
  if (r.status === "yellow") {
    return `ขาย iPhone ${r.iphone} เครื่อง · เครื่องถัดไปต้องแนบให้ได้`;
  }
  if (r.iphone === 0) return "ยังไม่มียอด iPhone";
  return `ขาย iPhone ${r.iphone} เครื่อง · แนบแล้ว ${r.credited} บิล`;
}

function sectionTitle(text, color) {
  return txt(text, { weight: "bold", size: "sm", color, margin: "lg" });
}

function personRow(r, color, bg) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: bg,
    cornerRadius: "8px",
    paddingAll: "10px",
    margin: "sm",
    contents: [
      txt(r.name, { weight: "bold", size: "sm", color: "#111827" }),
      txt(personSentence(r), { size: "xs", color }),
    ],
  };
}

function greenRow(r) {
  return {
    type: "box",
    layout: "horizontal",
    margin: "sm",
    paddingStart: "4px",
    contents: [
      txt(firstName(r.name), { size: "sm", flex: 4, wrap: false }),
      txt(r.iphone ? `iPhone ${r.iphone} · แนบ ${r.credited} ✓` : "–", {
        size: "xs",
        color: C.muted,
        align: "end",
        flex: 6,
      }),
    ],
  };
}

function banner(text, color, bg) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: bg,
    cornerRadius: "10px",
    paddingAll: "12px",
    contents: [txt(text, { weight: "bold", size: "md", color })],
  };
}

function summaryBubble(snap) {
  const rows = snap.rows ?? [];
  const reds = rows.filter((r) => r.status === "red").sort((a, b) => b.iphone - a.iphone);
  const yellows = rows.filter((r) => r.status === "yellow").sort((a, b) => b.iphone - a.iphone);
  const greens = rows.filter((r) => r.status === "green").sort((a, b) => b.iphone - a.iphone);

  const headline = reds.length
    ? banner(`⚠️ ${reds.length} คน ต้องส่งลูกค้า iPhone ให้เพื่อน`, C.red, C.redBg)
    : yellows.length
      ? banner(`👀 ${yellows.length} คน ใกล้ครบ 4 เครื่อง ต้องแนบให้ได้`, C.yellow, C.yellowBg)
      : banner("✅ ทุกคนแนบครบตามกติกา", C.green, C.greenBg);

  const contents = [...staleNotice(snap), headline];
  if (reds.length) {
    contents.push(sectionTitle("🔴 ต้องส่งต่อ — ลูกค้า iPhone คนถัดไปให้เพื่อนรับ", C.red));
    reds.forEach((r) => contents.push(personRow(r, C.red, C.redBg)));
  }
  if (yellows.length) {
    contents.push(sectionTitle("🟡 ระวัง — ขายไป 3 เครื่องแล้ว ยังไม่มีบิลแนบ", C.yellow));
    yellows.forEach((r) => contents.push(personRow(r, C.yellow, C.yellowBg)));
  }
  if (greens.length) {
    contents.push(sectionTitle("🟢 ปกติ", C.green));
    greens.forEach((r) => contents.push(greenRow(r)));
  }
  contents.push({ type: "separator", color: C.line, margin: "lg" });
  contents.push(txt(RULE_TEXT, { size: "xxs", color: C.muted, margin: "md" }));

  return {
    type: "bubble",
    size: "mega",
    header: header("สรุป Attach วันนี้", `${fmtDate(snap.date)} · ${subTitle(snap)}`),
    body: { type: "box", layout: "vertical", spacing: "none", contents },
    footer: footer(snap),
  };
}

/** แถบ 4 ช่อง แสดงว่าก้อนนี้ขายไปกี่เครื่องแล้ว */
function blockBar(r, color) {
  const pos = blockPos(r);
  const cells = [1, 2, 3, 4].map((i) => ({
    type: "box",
    layout: "vertical",
    height: "10px",
    cornerRadius: "4px",
    backgroundColor: i <= pos ? color : C.line,
    contents: [],
    flex: 1,
  }));
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      txt(`ก้อนนี้ขายไปแล้ว ${pos} / 4 เครื่อง`, { size: "xs", color: C.muted }),
      { type: "box", layout: "horizontal", spacing: "xs", contents: cells },
    ],
  };
}

function checkLine(label, n) {
  const ok = n > 0;
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      txt(`${ok ? "✅" : "▫️"} ${label}`, { size: "sm", flex: 6, color: ok ? "#111827" : C.muted }),
      txt(ok ? `${n} บิล` : "–", { size: "sm", align: "end", flex: 3, color: ok ? C.green : C.muted, weight: ok ? "bold" : "regular" }),
    ],
  };
}

function personBubble(snap, r) {
  const s = statusInfo(r);
  const title =
    r.status === "red" ? "🔴 ต้องส่งต่อ" : r.status === "yellow" ? "🟡 ระวัง" : "🟢 ผ่าน";
  const advice =
    r.status === "red"
      ? "ลูกค้า iPhone คนถัดไป ให้เพื่อนรับก่อน จนกว่าจะแนบได้"
      : r.status === "yellow"
        ? "เครื่องถัดไปต้องแนบ Cover+ / UFUND / SIM หรือ Acc 3 ชิ้นให้ได้"
        : r.iphone > 0
          ? "แนบครบตามกติกาแล้ว 👍"
          : "ยังไม่มียอด iPhone วันนี้";

  return {
    type: "bubble",
    size: "mega",
    header: personHeader(snap, r),
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
          cornerRadius: "10px",
          paddingAll: "12px",
          spacing: "xs",
          contents: [
            txt(title, { weight: "bold", size: "lg", color: s.color }),
            txt(advice, { size: "sm", color: s.color }),
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "box",
              layout: "vertical",
              contents: [
                txt(String(r.iphone), { size: "xxl", weight: "bold", align: "center" }),
                txt("iPhone ที่ขาย", { size: "xxs", color: C.muted, align: "center" }),
              ],
            },
            {
              type: "box",
              layout: "vertical",
              contents: [
                txt(String(r.credited), { size: "xxl", weight: "bold", align: "center", color: s.color }),
                txt("บิลที่แนบได้", { size: "xxs", color: C.muted, align: "center" }),
              ],
            },
            {
              type: "box",
              layout: "vertical",
              contents: [
                txt(String(r.required), { size: "xxl", weight: "bold", align: "center" }),
                txt("ต้องมีอย่างน้อย", { size: "xxs", color: C.muted, align: "center" }),
              ],
            },
          ],
        },
        ...(r.iphone > 0 ? [blockBar(r, s.color)] : []),
        { type: "separator", color: C.line },
        txt("สิ่งที่แนบได้ในบิล iPhone วันนี้", { size: "xs", weight: "bold", color: C.muted }),
        checkLine("Cover+", r.cover),
        checkLine("UFUND PERSONAL", r.ufund),
        checkLine("SIM", r.sim),
        checkLine("Acc 3 ชิ้นขึ้นไป", r.qualified),
        { type: "separator", color: C.line },
        txt(RULE_TEXT, { size: "xxs", color: C.muted }),
      ],
    },
    footer: footer(snap),
  };
}

function nextBubble(snap) {
  const all = snap.rows ?? [];
  const ranked = all
    .filter((r) => r.status !== "red")
    .map((r) => ({ r, slack: r.credited * 4 - r.iphone }))
    .sort((a, b) => b.slack - a.slack || a.r.iphone - b.r.iphone)
    .map((x) => x.r);
  const first = ranked[0];
  const rest = ranked.slice(1, 3);
  const reds = all.filter((r) => r.status === "red");

  const contents = [...staleNotice(snap)];
  if (first) {
    contents.push({
      type: "box",
      layout: "vertical",
      backgroundColor: C.greenBg,
      cornerRadius: "10px",
      paddingAll: "14px",
      spacing: "xs",
      contents: [
        txt("แนะนำให้รับ", { size: "xs", color: C.green }),
        txt(first.name, { size: "xl", weight: "bold", color: C.green }),
        txt(personSentence(first), { size: "xs", color: C.muted }),
      ],
    });
  } else {
    contents.push(banner("ทุกคนยังแนบไม่ครบ — ต้องแนบให้ได้ก่อน", C.red, C.redBg));
  }
  if (rest.length) {
    contents.push(sectionTitle("ถัดไป", C.muted));
    rest.forEach((r, i) => {
      contents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          txt(`${i + 2}. ${firstName(r.name)}`, { size: "sm", flex: 5, wrap: false }),
          txt(`iPhone ${r.iphone} · แนบ ${r.credited}`, { size: "xs", color: C.muted, align: "end", flex: 5 }),
        ],
      });
    });
  }
  if (reds.length) {
    contents.push({ type: "separator", color: C.line, margin: "lg" });
    contents.push(sectionTitle("🔴 งดรับ iPhone ไว้ก่อน (ยังแนบไม่ครบ)", C.red));
    contents.push(txt(reds.map((r) => firstName(r.name)).join(", "), { size: "sm", color: C.red }));
  }
  contents.push(
    txt("เรียงจากคนที่แนบไว้เผื่อมากสุด → น้อยสุด", { size: "xxs", color: C.muted, margin: "lg" }),
  );

  return {
    type: "bubble",
    size: "mega",
    header: header("ลูกค้า iPhone คนถัดไป", `${fmtDate(snap.date)} · ${subTitle(snap)}`),
    body: { type: "box", layout: "vertical", spacing: "none", contents },
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
        txt("พิมพ์ในกลุ่ม หรือกดปุ่มด้านล่าง", { size: "sm", weight: "bold" }),
        txt("• เช็ค — ดูว่าใครต้องส่งต่อ / ใครต้องระวัง", { size: "sm" }),
        txt("• เช็ค ชื่อ — ดูละเอียดรายคน", { size: "sm" }),
        txt("• ใครรับต่อ — ลูกค้า iPhone คนถัดไปควรให้ใครรับ", { size: "sm" }),
        { type: "separator", color: C.line, margin: "md" },
        txt(RULE_TEXT, { size: "xxs", color: C.muted, margin: "md" }),
        txt("ข้อมูลอัปเดตเมื่อเปิดหน้า Dashboard หลังอัปไฟล์ขาย", { size: "xxs", color: C.muted }),
      ],
    },
  };
}

/** ปุ่มลัดใต้ข้อความ (Quick Reply) — กดแล้วส่งคำสั่งให้เลย ไม่ต้องพิมพ์ */
function quickReply(snap) {
  const items = [
    { label: "📋 เช็ค", text: "เช็ค" },
    { label: "👉 ใครรับต่อ", text: "ใครรับต่อ" },
  ];
  const people = [...(snap?.rows ?? [])]
    .filter((r) => r.iphone > 0 || r.status !== "green")
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || b.iphone - a.iphone);
  people.slice(0, 11).forEach((r) => {
    const fn = firstName(r.name);
    const icon = r.status === "red" ? "🔴" : r.status === "yellow" ? "🟡" : "🟢";
    items.push({ label: `${icon} ${fn}`.slice(0, 20), text: `เช็ค ${fn}` });
  });
  return {
    items: items.map((i) => ({ type: "action", action: { type: "message", label: i.label, text: i.text } })),
  };
}

// ── command routing ────────────────────────────────────────────────────────

async function buildReply(text) {
  const t = String(text ?? "").trim();
  if (/^(help|วิธีใช้|คำสั่ง)$/i.test(t)) {
    const snap = await loadSnapshot().catch(() => null);
    return [{ ...flex("วิธีใช้ Attach Bot", helpBubble()), quickReply: quickReply(snap) }];
  }

  const isNext = /^(ใครรับต่อ|คิวต่อไป|ส่งต่อใคร|next)$/i.test(t);
  const check = /^(เช็ค|เช็ก|เชค|check)\s*(.*)$/i.exec(t);
  if (!isNext && !check) return null; // ข้อความอื่น → เงียบ

  const snap = await loadSnapshot();
  if (!snap || !Array.isArray(snap.rows)) {
    return [{ type: "text", text: "ยังไม่มีข้อมูล — เปิดหน้า Dashboard หลังอัปไฟล์ขายก่อนนะ" }];
  }
  const qr = quickReply(snap);

  if (isNext) {
    return [{ ...flex("ลูกค้า iPhone คนถัดไปควรให้ใครรับ", nextBubble(snap)), quickReply: qr }];
  }

  const q = norm(check[2]);
  if (q) {
    const hits = snap.rows.filter((r) => norm(r.name).includes(q));
    if (hits.length === 1) {
      const r = hits[0];
      const st = r.status === "red" ? "ต้องส่งต่อ" : r.status === "yellow" ? "ระวัง" : "ผ่าน";
      return [{ ...flex(`${r.name}: ${st}`, personBubble(snap, r)), quickReply: qr }];
    }
    if (hits.length > 1) {
      return [
        {
          type: "text",
          text: `เจอหลายคน: ${hits.map((r) => r.name).join(", ")} — พิมพ์ชื่อให้ชัดขึ้นอีกนิด`,
          quickReply: qr,
        },
      ];
    }
    return [{ type: "text", text: `ไม่พบชื่อ "${check[2].trim()}" ในข้อมูลวันที่ ${fmtDate(snap.date)}`, quickReply: qr }];
  }

  const reds = snap.rows.filter((r) => r.status === "red").length;
  const yellows = snap.rows.filter((r) => r.status === "yellow").length;
  const alt = reds
    ? `⚠️ ${reds} คนต้องส่งต่อ${yellows ? ` · ${yellows} คนต้องระวัง` : ""}`
    : yellows
      ? `👀 ${yellows} คนต้องระวัง`
      : "✅ ทุกคนแนบครบตามกติกา";
  return [{ ...flex(alt, summaryBubble(snap)), quickReply: qr }];
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
        photoId: String(r.photoId ?? "").slice(0, 60),
        photoVer: String(r.photoVer ?? "").replace(/\D/g, "").slice(0, 14),
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
        await replyMessage(ev.replyToken, await buildReply("help"));
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
