/**
 * CatDaily enrichment for KPI presets
 *
 * The source repo (studio7-sales-dashboard-main) maps each sales line item to
 * a `catDaily` value via the Category Master spreadsheet (Cat & Sub Cat → CAT Daily).
 * This module provides:
 *   1. buildCatDailyLookup — turns CatMaster rows into a Map<CatAndSubCat, CatDaily>
 *   2. enrichSalesRowsWithCatDaily — copies `catDaily` onto each sales row
 *
 * The lookup falls back to the row's existing `Category (Name)` if no
 * Cat & Sub Cat match is found, mirroring the source repo's behavior.
 */

import type { RawRow } from "./salesAggregations";

const normKey = (s: string) => String(s ?? "").toLowerCase().trim();

export function buildCatDailyLookup(categoryMasterRows: RawRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of categoryMasterRows) {
    const catSub = String(row["Cat & Sub Cat"] ?? "").trim();
    const catDaily = String(row["CAT Daily"] ?? "").trim();
    if (!catSub || !catDaily) continue;
    map.set(normKey(catSub), catDaily);
    map.set(normKey(`${catSub}`), catDaily);
    // Also map category name only as a fallback
    const head = catSub.split(">")[0]?.split("/")[0]?.trim();
    if (head && !map.has(normKey(head))) {
      map.set(normKey(head), catDaily);
    }
  }
  return map;
}

export function enrichSalesRowsWithCatDaily(
  salesRows: RawRow[],
  lookup: Map<string, string>,
): RawRow[] {
  if (lookup.size === 0) return salesRows;
  return salesRows.map((row) => {
    const catSub = String(row["Cat & Sub Cat"] ?? "").trim();
    const category = String(row["Category (Name)"] ?? row.category ?? "").trim();
    const subCategory = String(row["Sub Category"] ?? row.sub_category ?? "").trim();
    let catDaily = "";
    // 1. Prefer explicit combined "Cat & Sub Cat" column if present
    if (catSub) {
      catDaily = lookup.get(normKey(catSub)) ?? "";
    }
    // 2. Try the master-style concatenation `${category}${sub}` (no
    //    space) — this matches how the Category Master spreadsheet
    //    stores its keys, e.g. "Apple Case & ProtectionCASING ..."
    if (!catDaily && category && subCategory) {
      catDaily =
        lookup.get(normKey(`${category}${subCategory}`)) ??
        lookup.get(normKey(`${category} ${subCategory}`)) ??
        "";
    }
    // 3. Fall back to category name only
    if (!catDaily && category) {
      catDaily = lookup.get(normKey(category)) ?? "";
    }
    if (!catDaily) return row;
    return { ...row, catDaily };
  });
}

export function getCategoryMasterCatDailies(categoryMasterRows: RawRow[]): string[] {
  const set = new Set<string>();
  for (const row of categoryMasterRows) {
    const v = String(row["CAT Daily"] ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}
