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
  "BTB(Apple)": { targetField: "btbAppleTarget", measureType: "revenue", matchNames: ["BTB(Apple)", "BTB Apple"] },
  "COVER+": { targetField: "totalTarget", measureType: "quantity", matchNames: ["COVER+", "Cover+", "cover+"] },
  "AC+": { targetField: "totalTarget", measureType: "quantity", matchNames: ["Apple Care", "AppleCare", "AC+"] },
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

/** Whether a sales row counts toward a KPI category (inventory-style rules from source). */
export function rowMatchesKpiCategory(row: RawRow, category: string): boolean {
  const productType = String(row["Product Type"] ?? row.product_type ?? "").trim();
  if (productType && productType !== "Inventory Item") return false;

  const text = rowCategoryText(row);
  const catNorm = normalizeText(category);

  if (catNorm === "sim" || catNorm === "smile") {
    const cat = String(row["Category (Name)"] ?? "").trim();
    const prod = String(row["Product (Name)"] ?? "").toLowerCase();
    return cat === "Smile" || prod.includes("sim");
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
    return text.includes("cover+") || text.includes("cover plus");
  }

  if (catNorm === "ac+" || catNorm === "apple care") {
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
  const targetField = cfg?.targetField ?? "totalTarget";
  const measureType = cfg?.measureType ?? "revenue";

  const target = getTargetForPeriodByField(
    targets,
    entityId,
    mode,
    targetField,
    startDate,
    endDate,
  );

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
