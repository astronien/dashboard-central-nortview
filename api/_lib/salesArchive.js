/**
 * คลังยอดขายรายเดือน (เก็บถาวร ไม่ถูกลบตอน "ล้างข้อมูลทั้งหมด")
 *
 *   GET  ?resource=archive&action=list&branch=K            → { ok, months: [meta…] }
 *   GET  ?resource=archive&action=month&branch=K&month=YYYY-MM → { ok, rows }
 *   GET  ?resource=archive&action=target&branch=K&month=YYYY-MM → { ok, rows }
 *   POST ?resource=archive  { action: "begin",  branch, month }            ลบชิ้นเก่าของเดือนนั้น
 *   POST ?resource=archive  { action: "chunk",  branch, month, chunk, rows }
 *   POST ?resource=archive  { action: "finish", branch, month, rowCount, totalBaht, signature, summary, source }
 *   POST ?resource=archive  { action: "target", branch, month, rows, signature }
 *
 * branch = คีย์สาขาที่ล้างแล้ว (cleanBranchForMatching ฝั่งเว็บ)
 */
const { getTursoClient } = require("./tursoClient");

let ready = false;
async function ensureSchema(db) {
  if (ready) return;
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS sales_archive (
        branch TEXT NOT NULL, month TEXT NOT NULL, chunk INTEGER NOT NULL,
        rows_json TEXT NOT NULL, row_count INTEGER NOT NULL,
        PRIMARY KEY (branch, month, chunk))`,
      `CREATE TABLE IF NOT EXISTS sales_archive_meta (
        branch TEXT NOT NULL, month TEXT NOT NULL,
        row_count INTEGER NOT NULL, total_baht REAL NOT NULL,
        signature TEXT, summary_json TEXT, source TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (branch, month))`,
      `CREATE TABLE IF NOT EXISTS archive_calc_cache (
        branch TEXT NOT NULL, kind TEXT NOT NULL, month TEXT NOT NULL,
        sig TEXT NOT NULL, data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (branch, kind, month))`,
      `CREATE TABLE IF NOT EXISTS target_archive (
        branch TEXT NOT NULL, month TEXT NOT NULL,
        rows_json TEXT NOT NULL, signature TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (branch, month))`,
    ],
    "write",
  );
  ready = true;
}

const okMonth = (m) => /^\d{4}-\d{2}$/.test(String(m ?? ""));
const okBranch = (b) => typeof b === "string" && b.length > 0 && b.length <= 120;

async function handleArchive(req, res) {
  const db = getTursoClient();
  await ensureSchema(db);
  const q = req.query ?? {};
  const b = req.body ?? {};
  const action = String(q.action ?? b.action ?? "");
  // branch = "คีย์หลัก|คีย์เก่า1|คีย์เก่า2" — อ่านรวมทุกคีย์ (ข้อมูลที่เคยเก็บด้วยชื่อสาขาแบบอื่น) · เขียนที่คีย์หลัก
  const keys = String(q.branch ?? b.branch ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(okBranch)
    .slice(0, 5);
  const branch = keys[0] || "";
  const month = String(q.month ?? b.month ?? "").trim();
  if (!okBranch(branch)) return res.status(400).json({ ok: false, error: "Missing branch" });
  res.setHeader("Cache-Control", "no-store");
  const inList = keys.map(() => "?").join(",");

  if (req.method === "GET") {
    if (action === "list") {
      const sm = await db.execute({
        sql: `SELECT branch, month, row_count, total_baht, signature, summary_json, source, updated_at
              FROM sales_archive_meta WHERE branch IN (${inList})`,
        args: keys,
      });
      const tm = await db.execute({
        sql: `SELECT branch, month, signature, updated_at FROM target_archive WHERE branch IN (${inList})`,
        args: keys,
      });
      // เดือนเดียวกันหลายคีย์ → เอาคีย์ที่มาก่อน (คีย์หลัก)
      const rank = (k) => keys.indexOf(String(k));
      const byMonth = new Map();
      for (const x of sm.rows) {
        const cur = byMonth.get(x.month);
        if (!cur || rank(x.branch) < rank(cur.branch)) byMonth.set(x.month, { ...x });
      }
      const tByMonth = new Map();
      for (const x of tm.rows) {
        const cur = tByMonth.get(x.month);
        if (!cur || rank(x.branch) < rank(cur.branch)) tByMonth.set(x.month, x);
      }
      for (const [m, t] of tByMonth) {
        if (!byMonth.has(m)) byMonth.set(m, { month: m, row_count: 0, total_baht: 0 });
        byMonth.get(m).target_signature = t.signature;
        byMonth.get(m).target_updated_at = t.updated_at;
      }
      const rowsAll = Array.from(byMonth.values()).sort((a, c) => String(a.month).localeCompare(String(c.month)));
      const months = rowsAll.map((x) => ({
        month: x.month,
        rowCount: Number(x.row_count) || 0,
        totalBaht: Number(x.total_baht) || 0,
        signature: x.signature ?? null,
        summary: x.summary_json ? safeJson(x.summary_json) : null,
        source: x.source ?? null,
        updatedAt: x.updated_at ?? null,
        targetSignature: x.target_signature ?? null,
        targetUpdatedAt: x.target_updated_at ?? null,
      }));
      return res.status(200).json({ ok: true, months });
    }
    // ผลคำนวณที่เก็บไว้ (เช่น ATT รายคน) — ทุกเดือนในครั้งเดียว
    if (action === "calc") {
      const kind = String(q.kind ?? "").slice(0, 40);
      const r = await db.execute({
        sql: "SELECT month, sig, data_json FROM archive_calc_cache WHERE branch = ? AND kind = ?",
        args: [branch, kind],
      });
      const items = {};
      for (const x of r.rows) items[x.month] = { sig: x.sig, data: safeJson(x.data_json) };
      return res.status(200).json({ ok: true, items });
    }
    if (!okMonth(month)) return res.status(400).json({ ok: false, error: "Bad month" });
    if (action === "month") {
      for (const k of keys) {
        const r = await db.execute({
          sql: "SELECT rows_json FROM sales_archive WHERE branch = ? AND month = ? ORDER BY chunk",
          args: [k, month],
        });
        const rows = [];
        for (const x of r.rows) {
          const part = safeJson(x.rows_json);
          if (Array.isArray(part)) rows.push(...part);
        }
        if (rows.length) return res.status(200).json({ ok: true, rows });
      }
      return res.status(200).json({ ok: true, rows: [] });
    }
    if (action === "target") {
      for (const k of keys) {
        const r = await db.execute({
          sql: "SELECT rows_json FROM target_archive WHERE branch = ? AND month = ?",
          args: [k, month],
        });
        const rows = r.rows[0] ? safeJson(r.rows[0].rows_json) : [];
        if (Array.isArray(rows) && rows.length) return res.status(200).json({ ok: true, rows });
      }
      return res.status(200).json({ ok: true, rows: [] });
    }
    return res.status(400).json({ ok: false, error: "Unknown action" });
  }

  if (req.method === "POST") {
    if (!okMonth(month)) return res.status(400).json({ ok: false, error: "Bad month" });
    if (action === "calc") {
      const kind = String(b.kind ?? "").slice(0, 40);
      const sig = String(b.sig ?? "").slice(0, 300);
      if (!kind || !sig) return res.status(400).json({ ok: false, error: "Missing kind/sig" });
      await db.execute({
        sql: `INSERT INTO archive_calc_cache (branch, kind, month, sig, data_json, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(branch, kind, month) DO UPDATE SET sig = excluded.sig, data_json = excluded.data_json, updated_at = datetime('now')`,
        args: [branch, kind, month, sig, JSON.stringify(b.data ?? null)],
      });
      return res.status(200).json({ ok: true });
    }
    if (action === "begin") {
      await db.execute({ sql: "DELETE FROM sales_archive WHERE branch = ? AND month = ?", args: [branch, month] });
      return res.status(200).json({ ok: true });
    }
    if (action === "chunk") {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      const chunk = Math.max(0, Math.floor(Number(b.chunk) || 0));
      await db.execute({
        sql: `INSERT INTO sales_archive (branch, month, chunk, rows_json, row_count) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(branch, month, chunk) DO UPDATE SET rows_json = excluded.rows_json, row_count = excluded.row_count`,
        args: [branch, month, chunk, JSON.stringify(rows), rows.length],
      });
      return res.status(200).json({ ok: true });
    }
    if (action === "finish") {
      await db.execute({
        sql: `INSERT INTO sales_archive_meta (branch, month, row_count, total_baht, signature, summary_json, source, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(branch, month) DO UPDATE SET row_count = excluded.row_count, total_baht = excluded.total_baht,
                signature = excluded.signature, summary_json = excluded.summary_json, source = excluded.source,
                updated_at = datetime('now')`,
        args: [
          branch,
          month,
          Math.max(0, Math.floor(Number(b.rowCount) || 0)),
          Number(b.totalBaht) || 0,
          String(b.signature ?? "").slice(0, 200) || null,
          b.summary ? JSON.stringify(b.summary) : null,
          String(b.source ?? "").slice(0, 40) || null,
        ],
      });
      return res.status(200).json({ ok: true });
    }
    if (action === "target") {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      await db.execute({
        sql: `INSERT INTO target_archive (branch, month, rows_json, signature, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
              ON CONFLICT(branch, month) DO UPDATE SET rows_json = excluded.rows_json, signature = excluded.signature,
                updated_at = datetime('now')`,
        args: [branch, month, JSON.stringify(rows), String(b.signature ?? "").slice(0, 200) || null],
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: "Unknown action" });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

module.exports = { handleArchive };
