const { saveUploadKind, loadUploadKind, isUploadKind, UPLOAD_KINDS } = require("./turso");
const { parseCSV, summarizeDocDates } = require("./csvParse");
const { normalizeCategoryMasterRows } = require("./categoryMasterNormalize");

// current = MTD (through yesterday) + today (same split as live GSheets mtd/today tabs)
const CURRENT_SHEET_URLS = [
  "https://docs.google.com/spreadsheets/d/1YPmLE4CPk0aFnv24bx7ZiVHt7dYlq4HzXstYGIeIzFA/gviz/tq?tqx=out:csv&gid=713310919",
  "https://docs.google.com/spreadsheets/d/1eVsLLW7xXV2nd633I0IS4zoQ6YxeQj8FJiqh5VXQCyU/gviz/tq?tqx=out:csv&gid=2048343587",
];

const SHEET_URLS = {
  target: "https://docs.google.com/spreadsheets/d/18zsazWoy2DrItbc4c6FeVqD8X1DAUljdjBOG02lXM5I/gviz/tq?tqx=out:csv&gid=731299113",
  current: CURRENT_SHEET_URLS,
  lastMonth: "https://docs.google.com/spreadsheets/d/1ljPZiplQMv29Su_MRE0wPFPnnzy5w_yvkdi1EqqHr30/gviz/tq?tqx=out:csv&gid=120695055",
  lastYear: "https://docs.google.com/spreadsheets/d/16IK1QoGbrLAnzQjQUbpwwJ3dPoNDcFqRkwoR3kXYOMw/gviz/tq?tqx=out:csv&gid=1489791190",
  // Set when a tab with columns "Cat & Sub Cat" + "CAT Daily" exists (see Category MasterFeb.xlsx)
  categoryMaster: null,
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

const TRANSACTION_KINDS = new Set(["current", "lastMonth", "lastYear"]);

function sheetUrlsForKind(kind) {
  const entry = SHEET_URLS[kind];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

async function fetchSheetRows(url) {
  const fetchRes = await fetch(url);
  if (!fetchRes.ok) {
    throw new Error(`Google Sheets fetch failed with status ${fetchRes.status}`);
  }
  const csvText = await fetchRes.text();
  return parseCSV(csvText);
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
    const unique = normalizeCategoryMasterRows(rows);
    console.log(
      `[Sync] Deduplicated categoryMaster: from ${rows.length} to ${unique.length} unique rows.`,
    );
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
  const forceCategoryMaster =
    req.query?.force === "1" || req.query?.force === "true";
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
      const urls = sheetUrlsForKind(kind);

      if (kind === "categoryMaster") {
        if (!urls.length) {
          const existing = await loadUploadKind("categoryMaster");
          summary[kind] = {
            saved: existing.length,
            skipped: true,
            reason: "manual_upload_only",
          };
          console.log(
            `[Sync] categoryMaster: no Google Sheet URL — kept ${existing.length} uploaded row(s).`,
          );
          continue;
        }

        if (!forceCategoryMaster) {
          const existing = await loadUploadKind("categoryMaster");
          if (existing.length) {
            summary[kind] = {
              saved: existing.length,
              skipped: true,
              reason: "preserved_existing",
            };
            console.log(
              `[Sync] categoryMaster: preserved ${existing.length} uploaded row(s); use ?force=1 to overwrite.`,
            );
            continue;
          }
        }
      }

      if (!urls.length) {
        errors.push({ kind, error: "No URL configured for this kind." });
        continue;
      }

      try {
        console.log(`[Sync] Fetching Google Sheet for: ${kind} (${urls.length} tab(s))...`);
        let rawRows = [];
        const parseStats = {
          rawDataLines: 0,
          parsedRows: 0,
          skippedEmpty: 0,
          paddedRows: 0,
          truncatedRows: 0,
        };

        for (const url of urls) {
          const part = await fetchSheetRows(url);
          rawRows = rawRows.concat(part.rows);
          parseStats.rawDataLines += part.stats.rawDataLines;
          parseStats.parsedRows += part.stats.parsedRows;
          parseStats.skippedEmpty += part.stats.skippedEmpty;
          parseStats.paddedRows += part.stats.paddedRows;
          parseStats.truncatedRows += part.stats.truncatedRows;
        }

        if (!rawRows.length) {
          throw new Error("No data found or failed to parse CSV.");
        }

        if (parseStats.paddedRows || parseStats.truncatedRows) {
          console.warn(
            `[Sync] ${kind}: CSV ragged rows padded=${parseStats.paddedRows} truncated=${parseStats.truncatedRows}`,
          );
        }

        const normalizedRows = normalizeSheetRows(rawRows, kind);

        if (!normalizedRows.length) {
          throw new Error(
            "No rows to save after normalization; existing Turso data was not modified.",
          );
        }

        console.log(
          `[Sync] ${kind}: raw=${parseStats.rawDataLines} parsed=${parseStats.parsedRows} saved=${normalizedRows.length}`,
        );
        await saveUploadKind(kind, normalizedRows);

        const kindSummary = {
          saved: normalizedRows.length,
          parse: parseStats,
          sources: urls.length > 1 ? urls.length : undefined,
        };
        if (TRANSACTION_KINDS.has(kind)) {
          kindSummary.dates = summarizeDocDates(rawRows);
        }
        summary[kind] = kindSummary;
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
