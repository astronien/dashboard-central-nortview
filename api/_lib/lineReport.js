/**
 * LINE "report รายวัน" — รูปรีพอทที่หน้า Dashboard แคปไว้อัตโนมัติ
 *
 * หน้าเว็บ (เบราว์เซอร์) แคปรูป Home 2 รูป + Staff Profile รายคน แล้วอัปโหลด
 * มาเก็บที่นี่ทีละรูป → bot ตอบกลับด้วยรูปเหล่านี้ผ่าน Reply API (ฟรี)
 *
 * Endpoints (ผ่าน /api/line-webhook → api/health.js?line=1):
 *   GET  ?resource=report-meta                  → { meta }
 *   PUT  ?resource=report-begin  { date, sig }  → ล้างรูปเก่า เริ่มชุดใหม่
 *   PUT  ?resource=report-image  { seq, kind, name, w, h, data, preview }
 *   PUT  ?resource=report-done   { date, sig, count }
 *   GET  ?resource=report-file&id=<id>[&p=1]    → ไฟล์ JPEG (p=1 = preview)
 */
const crypto = require("crypto");
const { getTursoClient, getAppConfig, setAppConfig, initTelegramSchema } = require("./tursoClient");

const META_KEY = "line_report_meta";

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await initTelegramSchema();
  await getTursoClient().execute(`
    CREATE TABLE IF NOT EXISTS line_report_images (
      id TEXT PRIMARY KEY,
      report_date TEXT,
      seq INTEGER,
      kind TEXT,
      name TEXT,
      w INTEGER,
      h INTEGER,
      data TEXT,
      preview TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  tableReady = true;
}

async function loadMeta() {
  await ensureTable();
  const cfg = await getAppConfig(META_KEY);
  if (!cfg || !cfg.value) return null;
  try {
    const meta = JSON.parse(cfg.value);
    meta.updatedAt = cfg.updated_at ?? meta.updatedAt;
    return meta;
  } catch {
    return null;
  }
}

async function saveMeta(meta) {
  await setAppConfig(META_KEY, JSON.stringify(meta), "dashboard");
}

const JPEG_RE = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i;

// ── handlers ───────────────────────────────────────────────────────────────

async function handleReport(req, res, readJson) {
  const resource = String(req.query?.resource ?? "");
  await ensureTable();
  const db = getTursoClient();

  if (resource === "report-meta") {
    return res.status(200).json({ ok: true, meta: await loadMeta() });
  }

  if (resource === "report-file") {
    const id = String(req.query?.id ?? "");
    const wantPreview = String(req.query?.p ?? "") === "1";
    if (!id) return res.status(400).end();
    const r = await db.execute({
      sql: "SELECT data, preview FROM line_report_images WHERE id = ? LIMIT 1",
      args: [id],
    });
    const row = r.rows?.[0];
    const dataUrl = String((wantPreview && row?.preview) || row?.data || "");
    const m = JPEG_RE.exec(dataUrl);
    if (!m) return res.status(404).end();
    const buf = Buffer.from(m[2], "base64");
    res.setHeader("Content-Type", m[1].toLowerCase() === "png" ? "image/png" : "image/jpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    return res.status(200).end(buf);
  }

  if (req.method !== "PUT" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const body = await readJson(req);

  if (resource === "report-begin") {
    const date = String(body.date ?? "").slice(0, 10);
    const sig = String(body.sig ?? "").slice(0, 200);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok: false, error: "bad date" });
    await db.execute("DELETE FROM line_report_images");
    await saveMeta({
      date,
      sig,
      branch: String(body.branch ?? "").slice(0, 80),
      status: "uploading",
      startedAt: new Date().toISOString(),
      images: [],
    });
    return res.status(200).json({ ok: true });
  }

  if (resource === "report-image") {
    const data = String(body.data ?? "");
    const preview = String(body.preview ?? "");
    if (!JPEG_RE.test(data)) return res.status(400).json({ ok: false, error: "bad image" });
    const meta = (await loadMeta()) ?? { images: [] };
    const id = `${Number(body.seq) || 0}-${crypto.randomBytes(6).toString("hex")}`;
    const img = {
      id,
      seq: Number(body.seq) || 0,
      kind: String(body.kind ?? "staff").slice(0, 20),
      name: String(body.name ?? "").slice(0, 80),
      w: Math.max(1, Math.round(Number(body.w) || 1)),
      h: Math.max(1, Math.round(Number(body.h) || 1)),
    };
    await db.execute({
      sql: `INSERT INTO line_report_images (id, report_date, seq, kind, name, w, h, data, preview)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, meta.date ?? "", img.seq, img.kind, img.name, img.w, img.h, data, JPEG_RE.test(preview) ? preview : null],
    });
    return res.status(200).json({ ok: true, id });
  }

  if (resource === "report-done") {
    const meta = (await loadMeta()) ?? {};
    const r = await db.execute(
      "SELECT id, seq, kind, name, w, h FROM line_report_images ORDER BY seq ASC",
    );
    const images = (r.rows ?? []).map((row) => ({
      id: String(row.id),
      seq: Number(row.seq),
      kind: String(row.kind),
      name: String(row.name ?? ""),
      w: Number(row.w) || 1,
      h: Number(row.h) || 1,
    }));
    await saveMeta({
      ...meta,
      date: String(body.date ?? meta.date ?? "").slice(0, 10),
      sig: String(body.sig ?? meta.sig ?? "").slice(0, 200),
      status: "done",
      finishedAt: new Date().toISOString(),
      dashboardUrl: String(body.dashboardUrl ?? meta.dashboardUrl ?? "").slice(0, 200),
      images,
    });
    return res.status(200).json({ ok: true, count: images.length });
  }

  return res.status(404).json({ ok: false, error: "unknown resource" });
}

// ── reply builder ──────────────────────────────────────────────────────────

function fmtDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(ymd ?? "-");
}

function fmtTimeIso(iso) {
  const d = new Date(String(iso ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  return `${String(bkk.getUTCHours()).padStart(2, "0")}:${String(bkk.getUTCMinutes()).padStart(2, "0")}`;
}

/** กรอบรูปใน carousel — ใช้สัดส่วนเดียวกันทุกใบให้เรียงสวย */
const CARD_RATIO = "1:1";

/**
 * ข้อความตอบกลับ "report รายวัน" (ไม่เกิน 5 messages):
 *   carousel รวมรูป Home + รายคน (12 การ์ด/ชุด) — ไม่มีข้อความนำ
 */
async function buildReportReply(baseUrl) {
  const meta = await loadMeta();
  const base = String(meta?.dashboardUrl || baseUrl || "");
  if (!meta || meta.status !== "done" || !Array.isArray(meta.images) || !meta.images.length || !/^https:\/\//.test(base)) {
    return [
      {
        type: "text",
        text:
          meta?.status === "uploading"
            ? "⏳ ระบบกำลังแคปรีพอทอยู่ ลองพิมพ์ใหม่อีกครั้งใน 1 นาที"
            : "ยังไม่มีรีพอท — เปิดหน้า Dashboard (บนคอม) หลังอัปไฟล์ขาย ระบบจะแคปให้อัตโนมัติ",
      },
    ];
  }

  const fileUrl = (img, preview) =>
    `${base}/api/line-webhook?resource=report-file&id=${encodeURIComponent(img.id)}${preview ? "&p=1" : ""}`;
  const homes = meta.images.filter((i) => i.kind === "home");
  const staff = meta.images.filter((i) => i.kind !== "home");

  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const time = fmtTimeIso(meta.finishedAt);
  // ไม่มีข้อความนำ — ส่งรูปเลย (วันที่อยู่ใน altText ที่แจ้งเตือน/แชทลิสต์)
  const messages = [];
  const altHead = `📊 รีพอท ${fmtDate(meta.date)}${meta.date !== today ? " (ยังไม่ใช่วันนี้)" : ""}${time ? ` · ${time}` : ""}`;

  // การ์ดในชุดเลื่อน (LINE จำกัด 12 การ์ด/ชุด):
  //   - Home: 1 รูป/การ์ด
  //   - รายคน: รวม KPI + 7 Wonders ของคนเดียวกันไว้ในการ์ดเดียว (วางคู่กัน)
  //     → 2 + จำนวนพนักงาน การ์ด อยู่ในแถวเดียว
  const imgBox = (img, ratio) => ({
    type: "image",
    url: fileUrl(img, true),
    size: "full",
    aspectRatio: ratio,
    aspectMode: "fit",
    backgroundColor: "#1c2722",
    action: { type: "uri", label: "ดูเต็ม", uri: fileUrl(img, false) },
  });
  const nameFooter = (text) => ({
    type: "box",
    layout: "vertical",
    paddingAll: "10px",
    contents: [{ type: "text", text: text || "-", size: "sm", weight: "bold", wrap: false, align: "center" }],
  });

  const cards = homes.map((img) => ({
    type: "bubble",
    size: "mega",
    hero: imgBox(img, CARD_RATIO),
    footer: nameFooter(img.name),
  }));

  // จับคู่รูปรายคนตามชื่อ ("ชื่อ · KPI" / "ชื่อ · 7 Wonders")
  const byPerson = new Map();
  for (const img of staff) {
    const person = String(img.name ?? "").split(" · ")[0] || img.name;
    if (!byPerson.has(person)) byPerson.set(person, []);
    byPerson.get(person).push(img);
  }
  for (const [person, imgs] of byPerson) {
    cards.push({
      type: "bubble",
      size: "mega",
      hero:
        imgs.length === 1
          ? imgBox(imgs[0], CARD_RATIO)
          : {
              // สองรูปคู่กัน (ช่องละ 1:2) → รวมเป็นกรอบ 1:1 เท่าการ์ดอื่น
              type: "box",
              layout: "horizontal",
              spacing: "none",
              contents: imgs.slice(0, 2).map((img) => ({ ...imgBox(img, "1:2"), flex: 1 })),
            },
      footer: nameFooter(person),
    });
  }

  for (let i = 0; i < cards.length && messages.length < 5; i += 12) {
    const chunk = cards.slice(i, i + 12);
    messages.push({
      type: "flex",
      altText: i === 0 ? altHead : `${altHead} (${i + 1}–${i + chunk.length})`,
      contents: { type: "carousel", contents: chunk },
    });
  }
  return messages;
}

const REPORT_CMD_RE = /^(report|รีพอท|รีพอร์ต|รายงาน)(\s*รายวัน)?$/i;

module.exports = { handleReport, buildReportReply, REPORT_CMD_RE, loadMeta };
