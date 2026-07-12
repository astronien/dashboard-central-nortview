import type { RawRow } from "./salesAggregations";

export interface TargetRecord {
  month: number;
  year: number;
  monthNum: number;
  branchId: string;
  officerId: string;
  officerName: string;
  totalTarget: number;
  iPhoneTarget: number;
  iPadTarget: number;
  macTarget: number;
  watchTarget: number;
  simTarget: number;
  btbTarget: number;
  btbAppleTarget: number;
}

export type TargetRecordField = keyof TargetRecord;
export type TargetPeriodMode = "officer" | "branch";

export interface KPITargetResult {
  target: number;
  actual: number;
  achPct: number;
  measureType?: "revenue" | "quantity";
}

export interface PeriodMetrics {
  achPercent: number;
  forecast: number;
  forecastPercent: number;
  momPercent: number;
  yoyPercent: number;
  targetPerDay: number;
  diffPerDay: number;
}

export function calcTargetToDate(target: number, currentDay: number, totalDays: number): number {
  if (!totalDays) return 0;
  return (target / totalDays) * currentDay;
}

export function calcTodayAchievementPct(actualToday: number, targetToDate: number): number {
  return calcAchievementPct(actualToday, targetToDate);
}

export const toNumber = (value: unknown) =>
  Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

export function parseTargetNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, "").trim();
  if (str === "" || str === "-" || str === "NaN") return 0;
  const n = parseFloat(str);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function normalizeId(id: string | number | null | undefined): string {
  return String(id ?? "").trim().replace(/\.0$/, "");
}

export function rawTargetRowsToRecords(rows: RawRow[]): TargetRecord[] {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonthNum = now.getMonth() + 1;
  const defaultMonth = defaultYear * 100 + defaultMonthNum;

  return rows
    .map((row) => {
      let rawMonth = parseInt(String(row.month ?? row.Month ?? "").replace(/[/-]/g, ""), 10);
      let year = rawMonth ? Math.floor(rawMonth / 100) : defaultYear;
      let monthNum = rawMonth ? rawMonth % 100 : defaultMonthNum;
      if (!rawMonth) {
        rawMonth = defaultMonth;
      }
      if (year > 2400) year -= 543;

      const branchId = String(
        row.emp_shop_code ?? row["emp_shop_code"] ?? row["BRANCH NAME"] ?? row.branchId ?? "",
      ).trim();
      const officerId = normalizeId(row.emp_id ?? row["Staff ID"] ?? row.staff_id ?? "");
      const officerName =
        String(row.officerName ?? "").trim() ||
        `${row.NAME ?? row.emp_name ?? ""} ${row.SURNAME ?? row.emp_sname ?? ""}`.trim();

      const totalTarget = parseTargetNumber(row.Total ?? row.total);
      const iPhoneTarget = parseTargetNumber(row.iPhone ?? row.iPhoneTarget);
      const iPadTarget = parseTargetNumber(row.iPad ?? row.iPadTarget);
      const macTarget = parseTargetNumber(row.Mac ?? row.macTarget);
      const watchTarget = parseTargetNumber(row["Apple Watch"] ?? row.Apple_Watch ?? row.watchTarget);
      const simTarget = parseTargetNumber(row.SIM ?? row.simTarget);
      const btbTarget = parseTargetNumber(row.BTB ?? row.btbTarget);
      const btbAppleTarget = parseTargetNumber(
        row["BTB(Apple)"] ??
          row["BTB (Apple)"] ??
          row["BTB Apple"] ??
          row["btb(apple)"] ??
          row["btb (apple)"] ??
          row["btb apple"] ??
          row.BTB_Apple ??
          row.btb_apple ??
          row.btbAppleTarget,
      );

      if (
        totalTarget === 0 &&
        iPhoneTarget === 0 &&
        iPadTarget === 0 &&
        macTarget === 0 &&
        watchTarget === 0 &&
        simTarget === 0 &&
        btbTarget === 0 &&
        btbAppleTarget === 0
      ) {
        return null;
      }

      return {
        month: Number(`${year}${String(monthNum).padStart(2, "0")}`),
        year,
        monthNum,
        branchId,
        officerId,
        officerName,
        totalTarget,
        iPhoneTarget,
        iPadTarget,
        macTarget,
        watchTarget,
        simTarget,
        btbTarget,
        btbAppleTarget,
      } satisfies TargetRecord;
    })
    .filter((r): r is TargetRecord => r !== null);
}

export function getOfficerTarget(
  targets: TargetRecord[],
  officerId: string,
  year: number,
  monthNum: number,
): number {
  const nId = normalizeId(officerId);
  const match = targets.find(
    (t) => normalizeId(t.officerId) === nId && t.year === year && t.monthNum === monthNum,
  );
  return match?.totalTarget ?? 0;
}

export function getBranchTarget(
  targets: TargetRecord[],
  branchId: string,
  year: number,
  monthNum: number,
): number {
  const nId = normalizeId(branchId);
  return targets
    .filter(
      (t) => normalizeId(t.branchId) === nId && t.year === year && t.monthNum === monthNum,
    )
    .reduce((s, t) => s + t.totalTarget, 0);
}

export function getTargetForPeriod(
  targets: TargetRecord[],
  id: string,
  mode: TargetPeriodMode,
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    total +=
      mode === "officer"
        ? getOfficerTarget(targets, id, y, m)
        : getBranchTarget(targets, id, y, m);
    cur.setMonth(cur.getMonth() + 1);
  }

  return total;
}

export function getTargetForPeriodByField(
  targets: TargetRecord[],
  id: string,
  mode: TargetPeriodMode,
  field: TargetRecordField,
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const nId = normalizeId(id);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;

    const monthTargets = targets.filter(
      (t) =>
        t.year === y &&
        t.monthNum === m &&
        (mode === "officer" ? normalizeId(t.officerId) === nId : normalizeId(t.branchId) === nId),
    );

    monthTargets.forEach((t) => {
      const val = t[field];
      if (typeof val === "number") total += val;
    });

    cur.setMonth(cur.getMonth() + 1);
  }

  return total;
}

export function getBranchesTargetForPeriod(
  targets: TargetRecord[],
  branchIds: Set<string>,
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    targets.forEach((t) => {
      if (t.year === y && t.monthNum === m && branchIds.has(normalizeId(t.branchId))) {
        total += t.totalTarget;
      }
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return total;
}

export function getAllTargetForPeriod(
  targets: TargetRecord[],
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    targets.forEach((t) => {
      if (t.year === y && t.monthNum === m) total += t.totalTarget;
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return total;
}

/** Date-range forecast (studio7-sales-dashboard semantics). */
export function calcForecast(
  actualRevenue: number,
  startDate: string,
  endDate: string,
  asOf: Date = new Date(),
): number {
  if (actualRevenue === 0) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = asOf;

  if (today > end) return actualRevenue;
  if (today < start) return 0;

  const currentDay = today.getDate();
  const year = end.getFullYear();
  const month = end.getMonth();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  if (currentDay < 3) return 0;

  const dailyRate = actualRevenue / currentDay;
  return Math.round(dailyRate * totalDaysInMonth);
}

/** Day-based forecast used by report builder (currentDay / totalDays in period). */
export function calcForecastByDays(
  actual: number,
  currentDay: number,
  totalDays: number,
): number {
  if (!currentDay || !totalDays) return 0;
  return Math.round((actual / currentDay) * totalDays);
}

export function calcAchievementPct(actual: number, target: number): number {
  if (target === 0) return 0;
  return (actual / target) * 100;
}

export function calculateMetrics(
  target: number,
  actual: number,
  currentDay: number,
  totalDays: number,
  lastMonth: number,
  lastYear: number,
): PeriodMetrics {
  const achPercent = calcAchievementPct(actual, target);
  const forecast = calcForecastByDays(actual, currentDay, totalDays);
  const forecastPercent = calcAchievementPct(forecast, target);
  const momPercent = lastMonth ? ((actual - lastMonth) / lastMonth) * 100 : 0;
  const yoyPercent = lastYear ? ((actual - lastYear) / lastYear) * 100 : 0;
  const targetPerDay = totalDays ? (target / totalDays) * currentDay : 0;
  const diffPerDay = actual - targetPerDay;
  return { achPercent, forecast, forecastPercent, momPercent, yoyPercent, targetPerDay, diffPerDay };
}

/** Sum category targets from raw target upload rows (report builder path). */
export function sumRawCategoryTarget(rows: RawRow[], category: string): number {
  const key = category.toLowerCase();
  return rows.reduce((sum, row) => {
    if (key === "btb(apple)") {
      return (
        sum +
        parseTargetNumber(
          row["BTB(Apple)"] ??
            row["BTB (Apple)"] ??
            row["BTB Apple"] ??
            row["btb(apple)"] ??
            row["btb (apple)"] ??
            row["btb apple"] ??
            row.BTB_Apple ??
            row.btb_apple,
        )
      );
    }
    return sum + parseTargetNumber(row[category] ?? row[category.toLowerCase()]);
  }, 0);
}
