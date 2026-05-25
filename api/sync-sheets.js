const { saveUploadKind, isUploadKind, UPLOAD_KINDS } = require("./turso");

const SHEET_URLS = {
  target: "https://docs.google.com/spreadsheets/d/18zsazWoy2DrItbc4c6FeVqD8X1DAUljdjBOG02lXM5I/gviz/tq?tqx=out:csv&gid=731299113",
  current: "https://docs.google.com/spreadsheets/d/1eVsLLW7xXV2nd633I0IS4zoQ6YxeQj8FJiqh5VXQCyU/gviz/tq?tqx=out:csv&gid=2048343587",
  lastMonth: "https://docs.google.com/spreadsheets/d/1ljPZiplQMv29Su_MRE0wPFPnnzy5w_yvkdi1EqqHr30/gviz/tq?tqx=out:csv&gid=120695055",
  lastYear: "https://docs.google.com/spreadsheets/d/16IK1QoGbrLAnzQjQUbpwwJ3dPoNDcFqRkwoR3kXYOMw/gviz/tq?tqx=out:csv&gid=1489791190",
  categoryMaster: "https://docs.google.com/spreadsheets/d/1YPmLE4CPk0aFnv24bx7ZiVHt7dYlq4HzXstYGIeIzFA/gviz/tq?tqx=out:csv&gid=713310919"
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// แปลงฟิลด์จาก Google Sheets ให้เข้ากับโครงสร้าง db schema ของเรา
function normalizeSheetRows(rows, kind) {
  if (kind === "target") {
    return rows.map((r) => ({
      "BRANCH NAME": r.shop_name || r.emp_shop_code || r["BRANCH NAME"] || "",
      "STAFF ID": r.emp_id || r["STAFF ID"] || "",
      NAME: r.emp_name || r.NAME || "",
      SURNAME: r.emp_sname || r.SURNAME || "",
      DAY: r.KPI_MAN_DAY || r.DAY || "",
      Total: r.Total || "0",
      iPhone: r.iPhone || "0",
      Mac: r.Mac || "0",
      iPad: r.iPad || "0",
      "Apple Watch": r.Apple_Watch || r["Apple Watch"] || "0",
      SIM: r.SIM || "0",
      BTB: r.BTB || "0",
      "BTB(Apple)": r.BTB_Apple || r["BTB(Apple)"] || r.BTB_Apple || "0",
      Smartphone: r.Smartphone || "0",
    }));
  }

  if (kind === "categoryMaster") {
    const seen = new Set();
    const unique = [];
    rows.forEach((r) => {
      const catSubCat = String(r["Cat & Sub Cat"] || r.cat_sub_cat || r["Sub Category"] || r.SubCategory || "").trim();
      const catDaily = String(r["CAT Daily"] || r.cat_daily || r["Category (Name)"] || "").trim();
      if (!catSubCat || !catDaily) return;
      
      const key = `${catSubCat.toLowerCase()}||${catDaily.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          "Cat & Sub Cat": catSubCat,
          "CAT Daily": catDaily
        });
      }
    });
    console.log(`[Sync] Deduplicated categoryMaster: from ${rows.length} to ${unique.length} unique rows.`);
    return unique;
  }

  // สำหรับกลุ่ม transactions (current, lastMonth, lastYear)
  return rows.map((r) => ({
    "Product (Code)": r["Product (Code)"] || r.Product_Code || r.product_code || "",
    "Product (Name)": r["Product (Name)"] || r.Product_Name || r.product_name || "",
    "Category (Name)": r["Category (Name)"] || r.Category_Name || r.category_name || "",
    "Sub Category": r["Sub Category"] || r.Sub_Category || r.sub_category || "",
    "Branch (Name)": r["Branch (Name)"] || r.Branch_Name || r.branch_name || "",
    "Officer (Name)": r["Officer (Name)"] || r.Officer_Name || r.officer_name || "",
    "Doc No": r["Doc No"] || r.Doc_No || r.doc_no || "",
    "Doc Date": r["Doc Date"] || r.Doc_Date || r.doc_date || "",
    "Total Price": r["Total Price"] || r.Total_Price || r.total_price || "0",
    "ราคาขายตามบิล": r["ราคาขายตามบิล"] || r.bill_amount || r.total_price || "0",
    Number: r.Number || r.number || r.qty || r.quantity || "1",
    "Customer (Name)": r["Customer (Name)"] || r.Customer_Name || r.customer_name || "",
  }));
}

async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  }

  const kindParam = req.query?.kind;
  const branchParam = req.query?.branch;
  const kindsToSync = kindParam 
    ? (Array.isArray(kindParam) ? kindParam : [kindParam])
    : UPLOAD_KINDS;

  // ตรวจสอบชนิดที่ระบุเข้ามา
  for (const k of kindsToSync) {
    if (!isUploadKind(k)) {
      return res.status(400).json({ error: `Invalid sync kind: ${k}` });
    }
  }

  const summary = {};
  const errors = [];

  try {
    for (const kind of kindsToSync) {
      const url = SHEET_URLS[kind];
      if (!url) {
        errors.push({ kind, error: "No URL configured for this kind." });
        continue;
      }

      try {
        console.log(`[Sync] Fetching Google Sheet for: ${kind}...`);
        const fetchRes = await fetch(url);
        if (!fetchRes.ok) {
          throw new Error(`Google Sheets fetch failed with status ${fetchRes.status}`);
        }

        const csvText = await fetchRes.text();
        const rawRows = parseCSV(csvText);

        if (!rawRows.length) {
          throw new Error("No data found or failed to parse CSV.");
        }

        let normalizedRows = normalizeSheetRows(rawRows, kind);
        
        if (branchParam && (kind === "current" || kind === "lastMonth" || kind === "lastYear" || kind === "target")) {
          const cleanBranchForMatching = (val) => {
            if (!val) return "";
            let clean = String(val).toLowerCase();
            clean = clean.replace(/id\s*:?\s*\d+/g, "");
            clean = clean.replace(/istudio\s*by\s*spvi/g, "");
            clean = clean.replace(/istudio/g, "");
            clean = clean.replace(/studio\s*7/g, "");
            clean = clean.replace(/studio7/g, "");
            clean = clean.replace(/studio/g, "");
            clean = clean.replace(/spvi/g, "");
            clean = clean.replace(/uficon/g, "");
            clean = clean.replace(/copperwired/g, "");
            clean = clean.replace(/iserve/g, "");
            clean = clean.replace(/dotlife/g, "");
            clean = clean.replace(/banana\s*it/g, "");
            clean = clean.replace(/banana/g, "");
            clean = clean.replace(/plaza/g, "");
            clean = clean.replace(/[^a-z0-9ก-๙]/gi, "");
            return clean.trim();
          };
              
          const normParam = cleanBranchForMatching(branchParam);
          
          normalizedRows = normalizedRows.filter(row => {
            const rowBranchVal = row["Branch (Name)"] || row["BRANCH NAME"] || "";
            const normRow = cleanBranchForMatching(rowBranchVal);
            return normRow && normParam && (normRow.includes(normParam) || normParam.includes(normRow));
          });
          console.log(`[Sync] Filtered rows for branch "${branchParam}" (norm: "${normParam}"): ${normalizedRows.length} rows remaining.`);
        }
        
        console.log(`[Sync] Saving ${normalizedRows.length} rows to Turso DB for: ${kind}`);
        await saveUploadKind(kind, normalizedRows);

        summary[kind] = normalizedRows.length;
      } catch (err) {
        console.error(`[Sync Error] Failed to sync ${kind}:`, err);
        errors.push({ kind, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (errors.length && Object.keys(summary).length === 0) {
      // ถ้าล้มเหลวทั้งหมด
      return res.status(500).json({
        ok: false,
        message: "All sync operations failed.",
        errors
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Sync completed.",
      summary,
      errors: errors.length ? errors : undefined
    });
  } catch (error) {
    console.error("[Sync Fatal Error]:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Fatal server error."
    });
  }
}

module.exports = handler;
