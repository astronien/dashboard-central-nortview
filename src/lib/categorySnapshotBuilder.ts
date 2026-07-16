import type { RawRow } from "./salesAggregations";
import { parseDocDate } from "./dateParser";
import {
  calcAchievementPct,
  calcForecastByDays,
  calcTargetToDate,
  calcTodayAchievementPct,
  normalizeId,
  toNumber,
  rawTargetRowsToRecords,
  type TargetRecord,
} from "./targetAggregations";
import {
  getKpiCategoryConfig,
  getKpiTargetResult,
  rowMatchesKpiCategory,
  sumKpiActualFromRows,
  type KpiCategoryKey,
} from "./kpiCategoryAdapter";

export type CategorySnapshotItem = {
  category: string;
  actual: number;
  target: number;
  forecast: number;
  achieveRate: number;
  forecastRate: number;
  targetDay: number;
  today: number;
  todayAchieveRate: number;
  mom: number | string;
  yoy: number | string;
  measureType?: "revenue" | "quantity";
  /** AC+/COVER+ only: target expressed as % of iPhone units sold */
  targetPctOfIphone?: number;
  /** Trade In only: สิ้นสุดประมูล ÷ iPhone units sold × 100 (เป้า 20%) */
  tradeInPerIphonePct?: number;
  /** Trade In only: รายการเทรดทั้งหมด ÷ iPhone units sold × 100 (เป้า 50%) */
  tradeInAppraisalPct?: number;
};

const SNAPSHOT_CATEGORIES: Array<{ label: string; kpiKey?: KpiCategoryKey }> = [
  { label: "Mac", kpiKey: "Mac" },
  { label: "iPad", kpiKey: "iPad" },
  { label: "iPhone", kpiKey: "iPhone" },
  { label: "Apple Watch", kpiKey: "Apple Watch" },
  { label: "BTB(Apple)", kpiKey: "BTB(Apple)" },
  { label: "BTB", kpiKey: "BTB" },
  { label: "COVER+", kpiKey: "COVER+" },
  { label: "AC+", kpiKey: "AC+" },
  { label: "SIM", kpiKey: "SIM" },
  { label: "Trade In" },
];

function getMonthPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = Math.min(now.getDate(), totalDays);
  const monthStr = String(month + 1).padStart(2, "0");
  return {
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${String(totalDays).padStart(2, "0")}`,
    currentDay,
    totalDays,
  };
}

function resolveBranchId(targetRows: RawRow[], currentRows: RawRow[]): string {
  // Scan target rows key-by-key so a present-but-empty cell doesn't stop the
  // search before a later key/row that holds the real value.
  for (const row of targetRows) {
    for (const key of ["emp_shop_code", "BRANCH NAME"] as const) {
      const id = normalizeId(row[key] ?? "");
      if (id) return id;
    }
  }

  const fromCurrent = currentRows[0];
  if (!fromCurrent) return "";
  return normalizeId(
    fromCurrent["Branch (Name)"] ??
      fromCurrent.branchId ??
      fromCurrent["BRANCH NAME"] ??
      "",
  );
}

function sumTodayActual(rows: RawRow[], category?: string): number {
  if (!rows.length) return 0;
  let maxDateStr = "";
  let maxDateTime = 0;
  rows.forEach((row) => {
    const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
    if (!rawDate) return;
    const parsed = parseDocDate(rawDate);
    if (parsed) {
      const time = parsed.getTime();
      if (time > maxDateTime) {
        maxDateTime = time;
        maxDateStr = rawDate;
      }
    }
  });
  if (!maxDateStr) return 0;
  const todayRows = rows.filter(
    (row) => String(row["Doc Date"] ?? row["doc date"] ?? "").trim() === maxDateStr.trim(),
  );
  if (!category) {
    return todayRows.reduce(
      (sum, row) => sum + toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"]),
      0,
    );
  }
  return sumKpiActualFromRows(todayRows, category);
}

function periodActual(rows: RawRow[], category?: string): number {
  if (!rows.length) return 0;
  if (!category) {
    return rows.reduce(
      (sum, row) => sum + toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"]),
      0,
    );
  }
  return sumKpiActualFromRows(rows, category);
}

export function buildCategorySnapshots(params: {
  targetRows: RawRow[];
  currentRows: RawRow[];
  todayRows?: RawRow[];
  lastMonthRows: RawRow[];
  lastYearRows: RawRow[];
  targetOverrides?: Record<string, number>;
  tradeInData?: { actual: number; today: number; target: number };
}): CategorySnapshotItem[] {
  const { targetRows, currentRows, todayRows = [], lastMonthRows, lastYearRows, targetOverrides = {}, tradeInData } = params;
  const hasData = currentRows.length > 0;
  const { startDate, endDate, currentDay, totalDays } = getMonthPeriod();
  const targets: TargetRecord[] = rawTargetRowsToRecords(targetRows);
  const branchId = resolveBranchId(targetRows, currentRows);

  // iPhone units sold this period — the denominator for AC+/COVER+ targets,
  // which are configured as a % of iPhone sold (no target Excel column).
  const iphoneUnits = currentRows.reduce(
    (sum, row) => (rowMatchesKpiCategory(row, "iPhone") ? sum + toNumber(row["Number"]) : sum),
    0,
  );

  return SNAPSHOT_CATEGORIES.map(({ label, kpiKey }) => {
    if (!hasData || !branchId) {
      return {
        category: label,
        actual: 0,
        target: 0,
        forecast: 0,
        achieveRate: 0,
        forecastRate: 0,
        targetDay: 0,
        today: 0,
        todayAchieveRate: 0,
        mom: "New",
        yoy: "New",
      };
    }

    let target = 0;
    let actual = 0;
    let measureType: "revenue" | "quantity" | undefined = "revenue";
    let targetPctOfIphone: number | undefined;
    let tradeInPerIphonePct: number | undefined;
    let tradeInAppraisalPct: number | undefined;

    if (kpiKey) {
      const cfg = getKpiCategoryConfig(kpiKey);
      measureType = cfg?.measureType ?? "revenue";
      const result = getKpiTargetResult(
        targets,
        currentRows,
        branchId,
        "branch",
        kpiKey,
        startDate,
        endDate,
      );
      target = result.target;
      const override = targetOverrides?.[label];
      if (label === "AC+" || label === "COVER+") {
        // Target is a % of iPhone units sold (there is no target column
        // for these in the Excel). Derive the piece target from iPhone.
        if (typeof override === "number" && Number.isFinite(override)) {
          targetPctOfIphone = override;
          target = Math.round((iphoneUnits * override) / 100);
        } else {
          target = 0;
        }
      } else if (typeof override === "number" && Number.isFinite(override)) {
        // SIM etc. — override is an absolute piece count
        target = override;
      }
      actual = sumKpiActualFromRows(currentRows, kpiKey);
    } else if (label === "Trade In" && tradeInData) {
      measureType = "quantity";
      actual = Number(tradeInData.actual ?? 0);
      // Default target = total trade-ins (denominator). Can be overridden in
      // Settings if the user wants a different denominator.
      target = Number(tradeInData.target ?? 0);
      const override = targetOverrides?.[label];
      if (typeof override === "number" && Number.isFinite(override)) {
        target = override;
      }

      // Extra Trade In rates (computed from the RAW totals, not the
      // overridden target). Both use iPhone units sold as denominator:
      const totalTrades = Number(tradeInData.target ?? 0);
      const iphoneUnits = currentRows.reduce(
        (sum, row) =>
          rowMatchesKpiCategory(row, "iPhone")
            ? sum + toNumber(row["Number"] ?? row.number ?? row.qty)
            : sum,
        0,
      );
      // Trade In/iPhone — สิ้นสุดประมูล ÷ iPhone ที่ขาย (เป้า 20%)
      tradeInPerIphonePct = iphoneUnits > 0 ? (actual / iphoneUnits) * 100 : 0;
      // ยอดประเมิน — รายการเทรดทั้งหมด ÷ iPhone ที่ขาย (เป้า 50%)
      tradeInAppraisalPct = iphoneUnits > 0 ? (totalTrades / iphoneUnits) * 100 : 0;
    }

    const lastMonthActual = kpiKey
      ? periodActual(lastMonthRows, kpiKey)
      : label === "Trade In"
        ? 0
        : periodActual(lastMonthRows);
    const lastYearActual = kpiKey
      ? periodActual(lastYearRows, kpiKey)
      : label === "Trade In"
        ? 0
        : periodActual(lastYearRows);

    const forecast = calcForecastByDays(actual, currentDay, totalDays);
    const targetToToday = calcTargetToDate(target, currentDay, totalDays);
    const today =
      label === "Trade In" && tradeInData
        ? Number(tradeInData.today ?? 0)
        : todayRows.length > 0
          ? kpiKey
            ? sumKpiActualFromRows(todayRows, kpiKey)
            : periodActual(todayRows)
          : kpiKey
            ? sumTodayActual(currentRows, kpiKey)
            : sumTodayActual(currentRows);

    const mom =
      lastMonthActual > 0 ? ((actual - lastMonthActual) / lastMonthActual) * 100 : "New";
    const yoy =
      lastYearActual > 0 ? ((actual - lastYearActual) / lastYearActual) * 100 : "New";

    const achieveRate = target > 0 ? calcAchievementPct(actual, target) : 0;
    const forecastRate = target > 0 ? calcAchievementPct(forecast, target) : 0;

    return {
      category: label,
      actual,
      target,
      forecast,
      achieveRate,
      forecastRate,
      targetDay: targetToToday,
      today,
      todayAchieveRate: calcTodayAchievementPct(today, targetToToday),
      mom,
      yoy,
      measureType,
      targetPctOfIphone,
      tradeInPerIphonePct,
      tradeInAppraisalPct,
    };
  });
}
