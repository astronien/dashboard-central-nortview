import type { RawRow } from "./salesAggregations";
import { parseDocDate } from "./dateParser";
import {
  calcAchievementPct,
  calcForecastByDays,
  calcTargetToDate,
  calcTodayAchievementPct,
  getTargetForPeriod,
  normalizeId,
  rawTargetRowsToRecords,
  type TargetRecord,
} from "./targetAggregations";
import {
  getKpiCategoryConfig,
  getKpiTargetResult,
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
  const fromTarget = targetRows.find((r) => r.emp_shop_code ?? r["emp_shop_code"] ?? r["BRANCH NAME"]);
  if (fromTarget) {
    return normalizeId(
      fromTarget.emp_shop_code ??
        fromTarget["emp_shop_code"] ??
        fromTarget["BRANCH NAME"] ??
        "",
    );
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
      (sum, row) =>
        sum +
        (Number(String(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? "0").replace(/[^\d.-]/g, "")) ||
          0),
      0,
    );
  }
  return sumKpiActualFromRows(todayRows, category);
}

function periodActual(
  rows: RawRow[],
  category?: string,
  measureType?: "revenue" | "quantity",
): number {
  if (!rows.length) return 0;
  if (!category) {
    return rows.reduce(
      (sum, row) =>
        sum +
        (Number(String(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? "0").replace(/[^\d.-]/g, "")) ||
          0),
      0,
    );
  }
  if (measureType === "quantity") {
    return sumKpiActualFromRows(rows, category);
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
}): CategorySnapshotItem[] {
  const { targetRows, currentRows, todayRows = [], lastMonthRows, lastYearRows, targetOverrides = {} } = params;
  const hasData = currentRows.length > 0;
  const { startDate, endDate, currentDay, totalDays } = getMonthPeriod();
  const targets: TargetRecord[] = rawTargetRowsToRecords(targetRows);
  const branchId = resolveBranchId(targetRows, currentRows);

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

    if (label === "Total Sales") {
      target = getTargetForPeriod(targets, branchId, "branch", startDate, endDate);
      actual = periodActual(currentRows);
      measureType = "revenue";
    } else if (kpiKey) {
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
      // Apply manual override from Settings (per-branch, per-category)
      const override = targetOverrides?.[label];
      if (typeof override === "number" && Number.isFinite(override)) {
        target = override;
      }
      actual = sumKpiActualFromRows(currentRows, kpiKey);
    }

    const lastMonthActual = kpiKey
      ? periodActual(lastMonthRows, kpiKey, measureType)
      : periodActual(lastMonthRows);
    const lastYearActual = kpiKey
      ? periodActual(lastYearRows, kpiKey, measureType)
      : periodActual(lastYearRows);

    const forecast = calcForecastByDays(actual, currentDay, totalDays);
    const targetToToday = calcTargetToDate(target, currentDay, totalDays);
    const today =
      todayRows.length > 0
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

    const achieveRate = target === 0 && actual > 0 ? 100 : calcAchievementPct(actual, target);
    const forecastRate = target === 0 ? 0 : calcAchievementPct(forecast, target);

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
    };
  });
}
