const XLSX = require("xlsx");
const { parseCSV, summarizeDocDates } = require("../api/csvParse");

const SPREADSHEETS = {
  categoryMaster: "1YPmLE4CPk0aFnv24bx7ZiVHt7dYlq4HzXstYGIeIzFA",
  current: "1eVsLLW7xXV2nd633I0IS4zoQ6YxeQj8FJiqh5VXQCyU",
};

const CURRENT_GID = "2048343587";
const CATEGORY_GID = "713310919";

async function fetchSheetTabs(spreadsheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const tabs = [];
  const re = /"sheetId":(\d+),"title":"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const gid = m[1];
    const title = m[2].replace(/\\u([\da-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
    if (!tabs.some((t) => t.gid === gid)) tabs.push({ gid, title });
  }
  return tabs;
}

async function probeGid(spreadsheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();
  if (text.startsWith("<!DOCTYPE") || text.includes("Google Sheets")) {
    return { url, error: "HTML/not CSV", headers: [], rows: 0 };
  }
  const { rows, stats } = parseCSV(text);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const headerStr = headers.join(" | ").toLowerCase();
  const hasCatSub = headers.some((h) => /cat\s*&\s*sub\s*cat/i.test(h));
  const hasCatDaily = headers.some((h) => /cat\s*daily/i.test(h));
  const hasDocDate = headers.some((h) => /doc\s*date/i.test(h));
  const dates = summarizeDocDates(rows);
  return {
    url,
    headers: headers.slice(0, 12),
    rowCount: rows.length,
    stats,
    hasCatSub,
    hasCatDaily,
    hasDocDate,
    isCategoryMaster: hasCatSub && hasCatDaily,
    isSalesExport: hasDocDate && !hasCatSub,
    dates,
  };
}

function probeXlsx(path, label) {
  const wb = XLSX.readFile(path);
  const out = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const hasCatSub = headers.some((h) => /cat\s*&\s*sub\s*cat/i.test(String(h)));
    const hasCatDaily = headers.some((h) => /cat\s*daily/i.test(String(h)));
    const hasDocDate = headers.some((h) => /doc\s*date/i.test(String(h)));
    const dateCol = headers.find((h) => /doc\s*date/i.test(String(h)));
    const dateVals = new Set();
    if (dateCol) {
      for (const r of rows) {
        const v = String(r[dateCol] ?? "").trim();
        if (v) dateVals.add(v.slice(0, 10));
      }
    }
    const sorted = [...dateVals].sort();
    out.push({
      file: label,
      sheet: name,
      rows: rows.length,
      headers: headers.slice(0, 10),
      hasCatSub,
      hasCatDaily,
      hasDocDate,
      uniqueDates: dateVals.size,
      minDate: sorted[0] || "",
      maxDate: sorted[sorted.length - 1] || "",
    });
  }
  return out;
}

async function main() {
  console.log("=== XLSX local ===\n");
  console.log(
    JSON.stringify(
      probeXlsx(
        "/Users/astronien/Desktop/dashboard new version/Category MasterFeb.xlsx",
        "Category MasterFeb"
      ),
      null,
      2
    )
  );
  console.log(
    JSON.stringify(
      probeXlsx(
        "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx",
        "Current May26"
      ),
      null,
      2
    )
  );

  for (const [key, id] of Object.entries(SPREADSHEETS)) {
    console.log(`\n=== ${key} spreadsheet ${id} ===\n`);
    const tabs = await fetchSheetTabs(id);
    console.log("Tabs from HTML:", tabs);

    const currentGid = key === "current" ? CURRENT_GID : CATEGORY_GID;
    console.log(`\n--- Current configured gid ${currentGid} ---`);
    console.log(JSON.stringify(await probeGid(id, currentGid), null, 2));

    for (const tab of tabs) {
      console.log(`\n--- Tab "${tab.title}" gid=${tab.gid} ---`);
      const r = await probeGid(id, tab.gid);
      console.log(
        JSON.stringify(
          {
            title: tab.title,
            gid: tab.gid,
            rowCount: r.rowCount,
            isCategoryMaster: r.isCategoryMaster,
            isSalesExport: r.isSalesExport,
            headers: r.headers,
            dates: r.dates,
            url: r.url,
          },
          null,
          2
        )
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
