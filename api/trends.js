// Daily trend snapshots — read history / upsert today's snapshot.
//
//   GET  /api/trends?branch=XXX[&limit=90]
//     → { ok, snapshots: [{ date, ...payload }] }   (oldest → newest)
//   POST /api/trends   body: { branchId, date?, payload }
//     → { ok }   (upsert; date defaults to Bangkok today)
//
// payload is a compact JSON object the client builds from the Home view
// (store totals, per-category actuals, CSAT). Keyed by branch + date so
// re-opening the dashboard the same day overwrites rather than dupes.

const {
  upsertDailySnapshot,
  getDailySnapshots,
  initTelegramSchema,
} = require("./_lib/tursoClient");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const applyCors = (res) =>
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    await initTelegramSchema();
  } catch (e) {
    console.warn("[api/trends] schema init failed:", e.message);
  }

  if (req.method === "GET") {
    const branchId = String(req.query.branch ?? "").trim();
    if (!branchId) {
      return res.status(400).json({ ok: false, error: "Missing branch" });
    }
    const limit = Math.min(Number(req.query.limit) || 90, 366);
    const rows = await getDailySnapshots(branchId, limit);
    const snapshots = rows.map((r) => {
      let data = {};
      try {
        data = JSON.parse(r.payload);
      } catch {
        /* ignore bad row */
      }
      return { date: r.date, ...data };
    });
    return res.status(200).json({ ok: true, snapshots });
  }

  if (req.method === "POST") {
    const branchId = String(req.body?.branchId ?? "").trim();
    const payload = req.body?.payload;
    if (!branchId || !payload || typeof payload !== "object") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing branchId or payload" });
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date ?? ""))
      ? req.body.date
      : bangkokToday();
    await upsertDailySnapshot({
      branchId,
      date,
      payload: JSON.stringify(payload),
    });
    return res.status(200).json({ ok: true, date });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
};
