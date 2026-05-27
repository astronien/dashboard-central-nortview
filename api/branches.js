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

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
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
