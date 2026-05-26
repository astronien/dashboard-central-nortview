import * as XLSX from "xlsx";
import type { RawRow } from "./dashboardUtils";

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

const pickHeader = (headers: string[], patterns: RegExp[]) => {
  for (const header of headers) {
    const trimmed = String(header ?? "").trim();
    if (!trimmed) continue;
    if (patterns.some((pattern) => pattern.test(trimmed))) return trimmed;
  }
  return null;
};

export const resolveCategoryMasterHeaders = (headers: string[]) => {
  const catSubCat = pickHeader(headers, CAT_SUB_ALIASES);
  const catDaily = pickHeader(headers, CAT_DAILY_ALIASES);
  const looksLikeSales = headers.some((h) => /^doc\s*date$/i.test(h));

  if (!catSubCat || !catDaily) {
    if (looksLikeSales) {
      throw new Error(
        "ไฟล์นี้เป็น sales export (มี Doc Date) ไม่ใช่ Category Master — ต้องมีคอลัมน์ Cat & Sub Cat และ CAT Daily",
      );
    }
    throw new Error("ต้องมีคอลัมน์ Cat & Sub Cat และ CAT Daily");
  }

  return { catSubCat, catDaily };
};

const readCell = (row: Record<string, unknown>, header: string) => {
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    return String(row[header] ?? "").trim();
  }
  const target = header.toLowerCase();
  const match = Object.keys(row).find((key) => key.toLowerCase() === target);
  return match ? String(row[match] ?? "").trim() : "";
};

export const normalizeCategoryMasterRows = (rows: RawRow[]): RawRow[] => {
  if (!rows.length) {
    throw new Error("ไฟล์ว่างหรือไม่มีแถวข้อมูล");
  }

  const headers = Object.keys(rows[0] ?? {});
  const { catSubCat, catDaily } = resolveCategoryMasterHeaders(headers);

  const seen = new Set<string>();
  const unique: RawRow[] = [];
  rows.forEach((row) => {
    const catSubCatValue = readCell(row, catSubCat);
    const catDailyValue = readCell(row, catDaily);
    if (!catSubCatValue || !catDailyValue) return;

    const key = `${catSubCatValue.toLowerCase()}||${catDailyValue.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({
      "Cat & Sub Cat": catSubCatValue,
      "CAT Daily": catDailyValue,
    });
  });

  if (!unique.length) {
    throw new Error("ไม่พบแถวที่มี Cat & Sub Cat และ CAT Daily ครบ");
  }

  return unique;
};

const sheetRowsFromWorkbook = (workbook: XLSX.WorkBook): Record<string, unknown>[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
};

export const parseCategoryMasterFile = async (file: File): Promise<RawRow[]> => {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  const workbook =
    lower.endsWith(".csv") || lower.endsWith(".txt")
      ? XLSX.read(new TextDecoder().decode(buffer), { type: "string" })
      : XLSX.read(buffer, { type: "array" });

  const rows = sheetRowsFromWorkbook(workbook);
  return normalizeCategoryMasterRows(rows as RawRow[]);
};
