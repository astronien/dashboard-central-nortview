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

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        row[row.length - 1] += ',';
      } else {
        row.push('');
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        row[row.length - 1] += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      }
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  
  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim());
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length !== headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = line[j];
    }
    results.push(obj);
  }
  return results;
}

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
    const rows = parseCSV(csvText);
    
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
