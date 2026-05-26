const CAT_SUB_ALIASES = [
  /^cat\s*&\s*sub\s*cat$/i,
  /^cat\s+and\s+sub\s+cat$/i,
  /^cat_sub_cat$/i,
  /^catsubcat$/i,
];

const CAT_DAILY_ALIASES = [
  /^cat\s*daily$/i,
  /^cat_daily$/i,
  /^category\s*daily$/i,
];

const pickHeader = (headers, patterns) => {
  for (const header of headers) {
    const trimmed = String(header ?? "").trim();
    if (!trimmed) continue;
    if (patterns.some((pattern) => pattern.test(trimmed))) return trimmed;
  }
  return null;
};

const assertCategoryMasterSource = (rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const catSub = pickHeader(headers, CAT_SUB_ALIASES);
  const catDaily = pickHeader(headers, CAT_DAILY_ALIASES);
  const looksLikeSales = headers.some((h) => /^doc\s*date$/i.test(h));
  if (!catSub || !catDaily) {
    throw new Error(
      looksLikeSales
        ? "categoryMaster URL points to a sales export (Doc Date), not a lookup tab with Cat & Sub Cat + CAT Daily."
        : "categoryMaster sheet must include columns Cat & Sub Cat and CAT Daily.",
    );
  }
};

const readCell = (row, header) => {
  if (!header) return "";
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    return String(row[header] ?? "").trim();
  }
  const target = header.toLowerCase();
  const match = Object.keys(row).find((key) => key.toLowerCase() === target);
  return match ? String(row[match] ?? "").trim() : "";
};

const normalizeCategoryMasterRows = (rows) => {
  assertCategoryMasterSource(rows);
  const headers = Object.keys(rows[0] ?? {});
  const catSubHeader = pickHeader(headers, CAT_SUB_ALIASES);
  const catDailyHeader = pickHeader(headers, CAT_DAILY_ALIASES);

  const seen = new Set();
  const unique = [];
  rows.forEach((row) => {
    const catSubCat =
      readCell(row, catSubHeader) ||
      String(row["Cat & Sub Cat"] || row.cat_sub_cat || "").trim();
    const catDaily =
      readCell(row, catDailyHeader) ||
      String(row["CAT Daily"] || row.cat_daily || "").trim();
    if (!catSubCat || !catDaily) return;

    const key = `${catSubCat.toLowerCase()}||${catDaily.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        "Cat & Sub Cat": catSubCat,
        "CAT Daily": catDaily,
      });
    }
  });

  if (!unique.length) {
    throw new Error("No valid category master rows after normalization.");
  }

  return unique;
};

module.exports = {
  assertCategoryMasterSource,
  normalizeCategoryMasterRows,
};
