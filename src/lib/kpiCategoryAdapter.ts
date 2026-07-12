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
  /** Target Excel column; omitted when no column exists for the category
   *  (COVER+ / AC+) — target then defaults to 0 unless overridden. */
  targetField?: TargetRecordField;
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
  "BTB(Apple)": { targetField: "btbAppleTarget", measureType: "revenue", matchNames: ["BTB(Apple)", "BTB Apple"] },
  // No COVER+/AC+ column exists in the target Excel — using totalTarget
  // here made the achieve % nonsense (count actual vs branch-total baht).
  "COVER+": { measureType: "quantity", matchNames: ["COVER+", "Cover+", "cover+"] },
  "AC+": { measureType: "quantity", matchNames: ["Apple Care", "AppleCare", "AC+"] },
};

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
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

function rowCategoryText(row: RawRow): string {
  const cat = String(row["Category (Name)"] ?? row.category ?? "").trim();
  const sub = String(row["Sub Category"] ?? row.sub_category ?? "").trim();
  const prod = String(row["Product (Name)"] ?? row.product_name ?? "").trim();
  return normalizeText(`${cat} ${sub} ${prod}`);
}

/** Raw (lowercased, punctuation preserved) row text — needed for names
 *  like "AC+"/"COVER+" whose "+" is stripped by normalizeText. */
function rowRawText(row: RawRow): string {
  const cat = String(row["Category (Name)"] ?? row.category ?? "").trim();
  const sub = String(row["Sub Category"] ?? row.sub_category ?? "").trim();
  const prod = String(row["Product (Name)"] ?? row.product_name ?? "").trim();
  return `${cat} ${sub} ${prod}`.toLowerCase();
}

/** Whether a sales row counts toward a KPI category (inventory-style rules from source). */
export function rowMatchesKpiCategory(row: RawRow, category: string): boolean {
  const text = rowCategoryText(row);
  // Compare the raw category name — normalizeText strips "+" and "()",
  // which used to break the AC+/COVER+/BTB(Apple) branches below (AC+
  // then fell through to a `includes("ac")` match that counted every
  // Mac/Accessories row).
  const catKey = category.trim().toLowerCase();

  // If the row was enriched with `catDaily` by the Category Master
  // (see enrichSalesRowsWithCatDaily), that is the source of truth —
  // the row belongs to exactly the group the master assigns it to.
  const catDaily = String((row as any).catDaily ?? "").trim();
  if (catDaily) {
    if (catDaily === category) return true;
    // BTB(Apple) ↔ "BTB Apple" / "btb apple" / "btb(apple)" — strip all
    // whitespace and punctuation before comparing
    const strip = (s: string) => s.toLowerCase().replace(/[\s()]+/g, "");
    return strip(catDaily) === strip(category);
  }

  const raw = rowRawText(row);

  if (catKey === "sim" || catKey === "smile") {
    const cat = String(row["Category (Name)"] ?? "").trim();
    const prod = String(row["Product (Name)"] ?? "").toLowerCase();
    return cat === "Smile" || prod.includes("sim");
  }

  if (catKey === "btb") {
    return raw.includes("btb") && !raw.includes("btb apple") && !raw.includes("btb(apple)");
  }

  if (catKey === "btb(apple)" || catKey === "btb apple") {
    return raw.includes("btb apple") || raw.includes("btb(apple)");
  }

  if (catKey === "cover+" || catKey === "cover plus") {
    return raw.includes("cover+") || raw.includes("cover plus");
  }

  if (catKey === "ac+" || catKey === "apple care") {
    return raw.includes("apple care") || raw.includes("applecare") || raw.includes("ac+");
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

  // Categories without a target column (COVER+/AC+) have no default
  // target — 0 unless a manual override supplies one downstream.
  const targetField = cfg ? cfg.targetField : "totalTarget";
  const target = targetField
    ? getTargetForPeriodByField(
        targets,
        entityId,
        mode,
        targetField,
        startDate,
        endDate,
      )
    : 0;

  const filter = mode === "branch" ? { branchId: entityId } : { officerId: entityId };

  const actual = sumKpiActualFromRows(salesRows, category, filter);

  return {
    target,
    actual,
    achPct: calcAchievementPct(actual, target),
    measureType,
  };
}

export const KPI_CATEGORY_KEYS = Object.keys(KPI_CONFIG) as KpiCategoryKey[];
