import type { RawRow } from "./salesAggregations";
import { getCategoryValue } from "./salesAggregations";
import {
  getKpiMeasureType,
  getKpiTargetResult,
  type KpiCategoryKey,
} from "./kpiCategoryAdapter";
import {
  normalizeId,
  parseTargetNumber,
  type TargetRecord,
} from "./targetAggregations";

export type OfficerMatchFn = (a: string, b: string) => boolean;
export type CategoryMapFn = (row: RawRow) => string;

export function targetRowDisplayName(row: RawRow): string {
  const combined = `${row.NAME ?? row.emp_name ?? ""} ${row.SURNAME ?? row.emp_sname ?? ""}`.trim();
  return combined || String(row.officerName ?? "").trim();
}

/** Resolve staff id from target upload, parsed records, or current sales rows. */
export function resolveOfficerId(
  officerName: string,
  targetRows: RawRow[],
  targetRecords: TargetRecord[],
  currentRows: RawRow[],
  matchesOfficer: OfficerMatchFn,
): string {
  const targetRow = targetRows.find((row) =>
    matchesOfficer(targetRowDisplayName(row), officerName),
  );
  let id = normalizeId(
    targetRow?.emp_id ?? targetRow?.["Staff ID"] ?? targetRow?.staff_id ?? "",
  );
  if (id) return id;

  const record = targetRecords.find((t) => matchesOfficer(t.officerName, officerName));
  if (record?.officerId) return normalizeId(record.officerId);

  for (const row of currentRows) {
    const officer = String(row["Officer (Name)"] ?? "").trim();
    if (!matchesOfficer(officer, officerName)) continue;
    id = normalizeId(row["STAFF ID"] ?? row.emp_id ?? "");
    if (id) return id;
  }
  return "";
}

export function getCategoryTargetFromUploadRow(
  row: RawRow,
  category: KpiCategoryKey,
): number {
  switch (category) {
    case "iPhone":
      return parseTargetNumber(row.iPhone ?? row.iPhoneTarget);
    case "iPad":
      return parseTargetNumber(row.iPad ?? row.iPadTarget);
    case "Mac":
      return parseTargetNumber(row.Mac ?? row.macTarget);
    case "Apple Watch":
      return parseTargetNumber(
        row["Apple Watch"] ?? row.Apple_Watch ?? row.watchTarget,
      );
    case "SIM":
      return parseTargetNumber(row.SIM ?? row.simTarget);
    case "BTB":
      return parseTargetNumber(row.BTB ?? row.btbTarget);
    case "BTB(Apple)":
      return parseTargetNumber(
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
    default:
      return 0;
  }
}

export function sumOfficerCategoryActual(
  rows: RawRow[],
  category: KpiCategoryKey,
  officerName: string,
  officerId: string,
  getCategory: CategoryMapFn,
  matchesOfficer: OfficerMatchFn,
): number {
  const measureType = getKpiMeasureType(category);
  const nId = normalizeId(officerId);
  return rows.reduce((sum, row) => {
    const officer = String(row["Officer (Name)"] ?? "").trim();
    const rowOfficerId = normalizeId(row["STAFF ID"] ?? row.emp_id ?? "");
    const officerMatch =
      matchesOfficer(officer, officerName) ||
      Boolean(nId && rowOfficerId && rowOfficerId === nId);
    if (!officerMatch) return sum;
    if (getCategory(row) !== category) return sum;
    if (measureType === "quantity") {
      return (
        sum +
        (Number(String(row.Number ?? row.number ?? row.qty ?? "0").replace(/[^\d.-]/g, "")) ||
          0)
      );
    }
    return sum + getCategoryValue(row);
  }, 0);
}

export function getOfficerCategoryKpi(params: {
  category: KpiCategoryKey;
  officerName: string;
  officerId: string;
  officerTargetRow?: RawRow;
  targetRecords: TargetRecord[];
  currentRows: RawRow[];
  lastMonthRows: RawRow[];
  lastYearRows: RawRow[];
  periodStart: string;
  periodEnd: string;
  getCategory: CategoryMapFn;
  matchesOfficer: OfficerMatchFn;
}): {
  target: number;
  actual: number;
  lastMonth: number;
  lastYear: number;
  measureType: ReturnType<typeof getKpiMeasureType>;
} {
  const {
    category,
    officerName,
    officerId,
    officerTargetRow,
    targetRecords,
    currentRows,
    lastMonthRows,
    lastYearRows,
    periodStart,
    periodEnd,
    getCategory,
    matchesOfficer,
  } = params;

  const measureType = getKpiMeasureType(category);
  let target = 0;
  let actual = 0;

  if (officerId) {
    const kpi = getKpiTargetResult(
      targetRecords,
      currentRows,
      officerId,
      "officer",
      category,
      periodStart,
      periodEnd,
    );
    target = kpi.target;
    actual = kpi.actual;
    if (actual === 0) {
      actual = sumOfficerCategoryActual(
        currentRows,
        category,
        officerName,
        officerId,
        getCategory,
        matchesOfficer,
      );
    }
  } else {
    if (officerTargetRow) {
      target = getCategoryTargetFromUploadRow(officerTargetRow, category);
    }
    actual = sumOfficerCategoryActual(
      currentRows,
      category,
      officerName,
      "",
      getCategory,
      matchesOfficer,
    );
  }

  if (target === 0 && officerTargetRow) {
    target = getCategoryTargetFromUploadRow(officerTargetRow, category);
  }

  let lastMonth = officerId
    ? getKpiTargetResult(
        targetRecords,
        lastMonthRows,
        officerId,
        "officer",
        category,
        periodStart,
        periodEnd,
      ).actual
    : 0;
  if (lastMonth === 0) {
    lastMonth = sumOfficerCategoryActual(
      lastMonthRows,
      category,
      officerName,
      officerId,
      getCategory,
      matchesOfficer,
    );
  }

  let lastYear = officerId
    ? getKpiTargetResult(
        targetRecords,
        lastYearRows,
        officerId,
        "officer",
        category,
        periodStart,
        periodEnd,
      ).actual
    : 0;
  if (lastYear === 0) {
    lastYear = sumOfficerCategoryActual(
      lastYearRows,
      category,
      officerName,
      officerId,
      getCategory,
      matchesOfficer,
    );
  }

  return { target, actual, lastMonth, lastYear, measureType };
}
