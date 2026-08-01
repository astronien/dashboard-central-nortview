const { parseCSV } = require("./_lib/csvParse");

const SHEET_URL = "https://docs.google.com/spreadsheets/d/18zsazWoy2DrItbc4c6FeVqD8X1DAUljdjBOG02lXM5I/gviz/tq?tqx=out:csv&gid=731299113";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const TRADE_API_BASE = "https://report-trade.vercel.app";
const TRADE_API_KEY = process.env.TRADE_API_KEY || "techtrade_pro_secret_2026";

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Trade-In proxy — fetch the trade API server-side WITH the X-API-Key
  // header (avoids browser CORS/preflight on the custom header) and return
  // the raw JSON. Same-origin for the app; also lets us inspect the fields.
  if (req.query.resource === "trade") {
    try {
      const { branch, zone, start_date, end_date, limit } = req.query;
      const params = new URLSearchParams();
      if (branch) params.set("branch", String(branch));
      if (zone) params.set("zone", String(zone));
      if (start_date) params.set("start_date", String(start_date));
      if (end_date) params.set("end_date", String(end_date));
      params.set("limit", String(limit || "99999"));
      const url = `${TRADE_API_BASE}/api/v2/trades?${params.toString()}`;
      const tradeRes = await fetch(url, {
        headers: { "X-API-Key": TRADE_API_KEY },
      });
      const text = await tradeRes.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(tradeRes.ok ? 200 : tradeRes.status).send(text);
    } catch (error) {
      console.error("[Trade proxy Error]:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  try {
    const fetchRes = await fetch(SHEET_URL);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch branches from target sheet: ${fetchRes.status}`);
    }
    const csvText = await fetchRes.text();
    const { rows } = parseCSV(csvText);
    
    const branches = new Set();
    for (const r of rows) {
      const b = r.shop_name || r.emp_shop_code || r["BRANCH NAME"] || "";
      if (b && String(b).trim()) {
        branches.add(String(b).trim());
      }
    }
    
    const branchList = Array.from(branches).sort();
    return res.status(200).json({ ok: true, branches: branchList });
  } catch (error) {
    console.error("[Branches Error]:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
