import type { RawRow } from "./salesAggregations";
import { getCategoryValue } from "./salesAggregations";
import {
  calcAchievementPct,
  getTargetForPeriodByField,
  normalizeId,
  type KPITargetResult,
  type TargetPeriodMode,
  type TargetRecord,
  type TargetRecordField,
} from "./targetAggregations";

export type KpiCategoryKey =
  | "iPhone"
  | "iPad"
  | "Mac"
  | "Apple Watch"
  | "SIM"
  | "BTB"
  | "BTB(Apple)"
  | "Smile"
  | "COVER+"
  | "AC+";

export type KpiMeasureType = "revenue" | "quantity";

export interface KpiCategoryConfig {
  targetField: TargetRecordField;
  measureType: KpiMeasureType;
  /** Aliases used when matching sales rows */
  matchNames: string[];
}

const KPI_CONFIG: Record<KpiCategoryKey, KpiCategoryConfig> = {
  iPhone: { targetField: "iPhoneTarget", measureType: "revenue", matchNames: ["iPhone"] },
  iPad: { targetField: "iPadTarget", measureType: "revenue", matchNames: ["iPad"] },
  Mac: { targetField: "macTarget", measureType: "revenue", matchNames: ["Mac"] },
  "Apple Watch": { targetField: "watchTarget", measureType: "revenue", matchNames: ["Apple Watch", "Watch"] },
  SIM: { targetField: "simTarget", measureType: "quantity", matchNames: ["SIM", "Smile"] },
  Smile: { targetField: "simTarget", measureType: "quantity", matchNames: ["Smile", "SIM"] },
  BTB: { targetField: "btbTarget", measureType: "revenue", matchNames: ["BTB"] },
  "BTB(Apple)": { targetField: "btbAppleTarget", measureType: "revenue", matchNames: ["BTB(Apple)", "BTB Apple", "BTB(APPLE)"] },
  "COVER+": { targetField: "totalTarget", measureType: "quantity", matchNames: ["COVER+", "Cover+", "cover+"] },
  "AC+": { targetField: "totalTarget", measureType: "quantity", matchNames: ["Apple Care", "AppleCare", "AC+"] },
};

/**
 * Categories that can ONLY be matched via `row.catDaily` (from Category Master).
 * Raw Category (Name) / Sub Category text from sales never contains these names
 * (e.g. Apple Case & Protection is a "BTB(Apple)" per Cat Master but the raw
 * text doesn't include the word "BTB" or "Apple").
 */
const CATDAILY_PRIMARY_CATEGORIES = new Set(["BTB", "BTB(Apple)", "BTB Apple", "BTB(APPLE)"]);

function catDailyToKpiCategory(catDaily: string): string {
  const norm = String(catDaily ?? "").trim().toLowerCase();
  if (norm === "btb apple" || norm === "btb(apple)" || norm === "btb apple)") {
    return "BTB(Apple)";
  }
  if (norm === "btb") return "BTB";
  return catDaily;
}

export function getKpiCategoryConfig(category: string): KpiCategoryConfig | undefined {
  const key = category as KpiCategoryKey;
  if (KPI_CONFIG[key]) return KPI_CONFIG[key];
  if (category === "SIM" || category === "Smile") return KPI_CONFIG.SIM;
  return undefined;
}

export function getKpiMeasureType(category: string): KpiMeasureType {
  return getKpiCategoryConfig(category)?.measureType ?? "revenue";
}

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ +]/gi, "")
    .trim();

function rowCategoryText(row: RawRow): string {
  const cat = String(row["Category (Name)"] ?? row.category ?? "").trim();
  const sub = String(row["Sub Category"] ?? row.sub_category ?? "").trim();
  const prod = String(row["Product (Name)"] ?? row.product_name ?? "").trim();
  return normalizeText(`${cat} ${sub} ${prod}`);
}

/** Whether a sales row counts toward a KPI category (inventory-style rules from source). */
export function rowMatchesKpiCategory(row: RawRow, category: string): boolean {
  const productType = String(row["Product Type"] ?? row.product_type ?? "").trim();
  if (productType && productType !== "Inventory Item") return false;

  const text = rowCategoryText(row);
  const catNorm = normalizeText(category);

  // 0. catDaily first-priority: only when TARGET is in BTB family. Otherwise
  //    we'd misclassify AppleCare+ rows (which Cat Master wrongly maps to
  //    BTB(Apple)) as not being AC+.
  const catDaily = String(row.catDaily ?? "").trim();
  if (catDaily && CATDAILY_PRIMARY_CATEGORIES.has(category)) {
    const mapped = catDailyToKpiCategory(catDaily);
    return normalizeText(mapped) === catNorm;
  }

  if (catNorm === "sim" || catNorm === "smile") {
    const cat = String(row["Category (Name)"] ?? "").trim();
    const sub = String(row["Sub Category"] ?? "").trim();
    const prod = String(row["Product (Name)"] ?? "").toLowerCase();
    // Only "Sim Card" category counts (Smile/INSURANCE is COVER+/AppleCare)
    if (cat === "Sim Card") return true;
    return false;
  }

  if (catNorm === "btb") {
    const cat = String(row["Category (Name)"] ?? "");
    const sub = String(row["Sub Category"] ?? "");
    const prod = String(row["Product (Name)"] ?? "");
    return cat.includes("BTB") || sub.includes("BTB") || prod.includes("BTB");
  }

  if (catNorm === "btb(apple)" || catNorm === "btb apple") {
    return text.includes("btb apple") || text.includes("btb(apple)");
  }

  if (catNorm === "cover+" || catNorm === "cover plus") {
    // COVER+ = product contains "cover+" (paid only) — EXCLUDE "7CARE+ Free
    // for COVER+ with AppleCare Services" (the bonus/free companion plan).
    const prodL = String(row["Product (Name)"] ?? "").toLowerCase();
    if (prodL.includes("7care+") || prodL.includes("7 care+")) return false;
    if (prodL.includes("cover+")) return true;
    // Fallback: text contains "cover plus" or "cover+"
    return text.includes("cover+") || text.includes("cover plus");
  }

  if (catNorm === "ac+" || catNorm === "apple care") {
    // AC+ = AppleCare+ only. Exclude COVER+ rows and 7CARE+ Free bonus.
    const prodL = String(row["Product (Name)"] ?? "").toLowerCase();
    const catL = String(row["Category (Name)"] ?? "").toLowerCase();
    if (prodL.includes("7care+") || prodL.includes("7 care+")) return false;
    if (prodL.includes("cover+")) return false;
    if (prodL.includes("applecare") || prodL.includes("apple care") || prodL.includes("ac+") || prodL.includes("ac +")) {
      return true;
    }
    if (catL.includes("apple care")) return true;
    return text.includes("apple care") || text.includes("applecare") || text.includes("ac+");
  }

  const cfg = getKpiCategoryConfig(category);
  if (!cfg) {
    return String(row["Category (Name)"] ?? "").trim() === category;
  }
  return cfg.matchNames.some((name) => text.includes(normalizeText(name)));
}

/** Actual value for one row: quantity for SIM, revenue otherwise. */
export function getKpiRowValue(row: RawRow, category: string): number {
  if (getKpiMeasureType(category) === "quantity") {
    return Number(String(row.Number ?? row.number ?? row.qty ?? "0").replace(/[^\d.-]/g, "")) || 0;
  }
  return getCategoryValue(row);
}

export function sumKpiActualFromRows(
  rows: RawRow[],
  category: string,
  filter?: { branchId?: string; officerId?: string; officerName?: string },
): number {
  return rows.reduce((sum, row) => {
    if (filter?.branchId) {
      const branch = normalizeId(
        row["Branch (Name)"] ?? row.branchId ?? row["BRANCH NAME"] ?? "",
      );
      if (branch !== normalizeId(filter.branchId)) return sum;
    }
    if (filter?.officerId) {
      const rowOfficerId = normalizeId(row["STAFF ID"] ?? row.emp_id ?? row.officerId ?? "");
      if (rowOfficerId && rowOfficerId !== normalizeId(filter.officerId)) return sum;
    }
    if (filter?.officerName) {
      const officer = String(row["Officer (Name)"] ?? "").trim();
      if (!officer.toLowerCase().includes(filter.officerName.toLowerCase())) return sum;
    }
    if (!rowMatchesKpiCategory(row, category)) return sum;
    return sum + getKpiRowValue(row, category);
  }, 0);
}

export function getKpiTargetResult(
  targets: TargetRecord[],
  salesRows: RawRow[],
  entityId: string,
  mode: TargetPeriodMode,
  category: string,
  startDate: string,
  endDate: string,
): KPITargetResult {
  const cfg = getKpiCategoryConfig(category);
  const measureType = cfg?.measureType ?? "revenue";

  // COVER+ and AC+ targets are percent of iPhone target (16% and 30%).
  // They are measured in units, but the iPhone target in target file is in
  // baht (revenue). Convert iPhone revenue to units using the average iPhone
  // sale price observed in the actual sales data, then apply the percent.
  const ATTACHMENT_PERCENT: Record<string, number> = {
    "COVER+": 0.16,
    "AC+": 0.30,
    SIM: 0.15,
  };
  const percent = ATTACHMENT_PERCENT[category];

  let target: number;
  if (percent !== undefined) {
    const iPhoneTargetRevenue = getTargetForPeriodByField(
      targets, entityId, mode, "iPhoneTarget", startDate, endDate,
    );
    const avgIphonePrice = computeAvgIphonePrice(salesRows);
    const iPhoneUnitsTarget = avgIphonePrice > 0 ? iPhoneTargetRevenue / avgIphonePrice : 0;
    target = iPhoneUnitsTarget * percent;
  } else {
    const targetField = cfg?.targetField ?? "totalTarget";
    target = getTargetForPeriodByField(
      targets, entityId, mode, targetField, startDate, endDate,
    );
  }

  const filter = mode === "branch" ? { branchId: entityId } : { officerId: entityId };

  const actual = sumKpiActualFromRows(salesRows, category, filter);

  return {
    target,
    actual,
    achPct: calcAchievementPct(actual, target),
    measureType,
  };
}

/** Compute average iPhone sale price from sales rows (used to convert
 *  iPhone revenue target into iPhone units target for COVER+/AC+/SIM). */
function computeAvgIphonePrice(salesRows: RawRow[]): number {
  let totalRevenue = 0;
  let totalUnits = 0;
  for (const row of salesRows) {
    const cat = String(row["Category (Name)"] ?? "").trim().toLowerCase();
    if (cat !== "iphone") continue;
    const units = Number(String(row.Number ?? row.number ?? row.qty ?? "0").replace(/[^\d.-]/g, "")) || 0;
    const revenue = getCategoryValue(row);
    if (units > 0 && revenue > 0) {
      totalUnits += units;
      totalRevenue += revenue;
    }
  }
  return totalUnits > 0 ? totalRevenue / totalUnits : 0;
}

export const KPI_CATEGORY_KEYS = Object.keys(KPI_CONFIG) as KpiCategoryKey[];
