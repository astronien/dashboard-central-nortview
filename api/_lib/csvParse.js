/**
 * Parse Google gviz CSV export. Pads/truncates ragged rows instead of dropping them.
 * @returns {{ rows: Record<string, string>[], stats: { rawDataLines: number, parsedRows: number, skippedEmpty: number, paddedRows: number, truncatedRows: number } }}
 */
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
    } else if (char === ",") {
      if (inQuotes) {
        row[row.length - 1] += ",";
      } else {
        row.push("");
      }
    } else if (char === "\n" || char === "\r") {
      if (inQuotes) {
        row[row.length - 1] += char;
      } else {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        lines.push(row);
        row = [""];
      }
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  const stats = {
    rawDataLines: 0,
    parsedRows: 0,
    skippedEmpty: 0,
    paddedRows: 0,
    truncatedRows: 0,
  };

  if (lines.length < 2) {
    return { rows: [], stats };
  }

  const headers = lines[0].map((h) => h.trim());
  const headerCount = headers.length;
  const results = [];
  stats.rawDataLines = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = line.every((cell) => String(cell ?? "").trim() === "");
    if (isEmpty) {
      stats.skippedEmpty++;
      continue;
    }

    let cells = line;
    if (cells.length < headerCount) {
      stats.paddedRows++;
      cells = [...cells, ...Array(headerCount - cells.length).fill("")];
    } else if (cells.length > headerCount) {
      stats.truncatedRows++;
      cells = cells.slice(0, headerCount);
    }

    const obj = {};
    for (let j = 0; j < headerCount; j++) {
      obj[headers[j]] = cells[j];
    }
    results.push(obj);
  }

  stats.parsedRows = results.length;
  return { rows: results, stats };
}

/** Doc-date span for transaction sheets (helps spot single-day exports). */
function summarizeDocDates(rows) {
  const counts = new Map();
  for (const row of rows) {
    const raw = String(row["Doc Date"] ?? row.Doc_Date ?? row.doc_date ?? "").trim();
    if (!raw) continue;
    const m = raw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const dayKey = m ? m[1] : raw.slice(0, 24);
    counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
  }
  const uniqueDays = counts.size;
  let minDay = "";
  let maxDay = "";
  if (uniqueDays > 0) {
    const sorted = [...counts.keys()].sort();
    minDay = sorted[0];
    maxDay = sorted[sorted.length - 1];
  }
  return { uniqueDays, minDay, maxDay, rowCount: rows.length };
}

module.exports = { parseCSV, summarizeDocDates };
