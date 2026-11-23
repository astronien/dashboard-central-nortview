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
  const branch = String(q.branch ?? b.branch ?? "").trim();
  const month = String(q.month ?? b.month ?? "").trim();
  if (!okBranch(branch)) return res.status(400).json({ ok: false, error: "Missing branch" });

  if (req.method === "GET") {
    if (action === "list") {
      const r = await db.execute({
        sql: `SELECT m.month, m.row_count, m.total_baht, m.signature, m.summary_json, m.source, m.updated_at,
                     t.signature AS target_signature, t.updated_at AS target_updated_at
              FROM sales_archive_meta m
              LEFT JOIN target_archive t ON t.branch = m.branch AND t.month = m.month
              WHERE m.branch = ?
              UNION
              SELECT t.month, 0, 0, NULL, NULL, NULL, NULL, t.signature, t.updated_at
              FROM target_archive t
              WHERE t.branch = ? AND NOT EXISTS (SELECT 1 FROM sales_archive_meta m2 WHERE m2.branch = t.branch AND m2.month = t.month)
              ORDER BY 1`,
        args: [branch, branch],
      });
      const months = r.rows.map((x) => ({
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
    if (!okMonth(month)) return res.status(400).json({ ok: false, error: "Bad month" });
    if (action === "month") {
      const r = await db.execute({
        sql: "SELECT rows_json FROM sales_archive WHERE branch = ? AND month = ? ORDER BY chunk",
        args: [branch, month],
      });
      const rows = [];
      for (const x of r.rows) {
        const part = safeJson(x.rows_json);
        if (Array.isArray(part)) rows.push(...part);
      }
      return res.status(200).json({ ok: true, rows });
    }
    if (action === "target") {
      const r = await db.execute({
        sql: "SELECT rows_json FROM target_archive WHERE branch = ? AND month = ?",
        args: [branch, month],
      });
      const rows = r.rows[0] ? safeJson(r.rows[0].rows_json) : [];
      return res.status(200).json({ ok: true, rows: Array.isArray(rows) ? rows : [] });
    }
    return res.status(400).json({ ok: false, error: "Unknown action" });
  }

  if (req.method === "POST") {
    if (!okMonth(month)) return res.status(400).json({ ok: false, error: "Bad month" });
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
