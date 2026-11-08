/**
 * ตารางผลงานรายหมวดของพนักงานที่เลือก (หน้า Staff Profile)
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ — deps เหมือนเดิมทุกตัว)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import { getCategoryValue } from "../lib/salesAggregations";
import type { UploadKind } from "../lib/uploadsApi";
import type { BillSummary } from "../lib/presetBills";
import { parseBills } from "../lib/presetBills";
import { emptyItemFilter, type ItemFilter } from "../lib/presetTypes";
import { countItemQuantityAnyFilter } from "../lib/presetEngine";
import { enrichSalesRowsWithCatDaily, buildCatDailyLookup } from "../lib/presetCatDaily";
import { parseDocDate } from "../lib/dateParser";
import type { KpiCategoryKey } from "../lib/kpiCategoryAdapter";
import { getOfficerCategoryKpi, resolveOfficerId } from "../lib/officerCategoryKpi";
import {
  calcAchievementPct,
  calcForecastByDays,
  calcSteppedRequiredPerDay,
  calcTodayAchievementPct,
  normalizeId,
  rawTargetRowsToRecords,
  toNumber,
} from "../lib/targetAggregations";
import { matchesOfficer } from "../lib/matchHelpers";
import type { CategoryPerformanceRow } from "../lib/categoryPerformance";

export type OfficerCategoryPerformanceInput = {
  activeOfficer: { name: string; target: number; actual: number; actualDay: number } | undefined;
  displayUploads: Record<UploadKind, RawRow[]>;
  parsedReport: unknown;
  getCategory: (row: RawRow) => string;
  todayRows: RawRow[];
  catDailyLookupShared: ReturnType<typeof buildCatDailyLookup>;
  currentBillsShared: BillSummary[];
};

export function useOfficerCategoryPerformance(input: OfficerCategoryPerformanceInput): CategoryPerformanceRow[] {
  const { activeOfficer, displayUploads, parsedReport, getCategory, todayRows, catDailyLookupShared, currentBillsShared } = input;
  return useMemo<CategoryPerformanceRow[]>(() => {
    if (!activeOfficer) return [];
    
    const categoriesList: KpiCategoryKey[] = ["Mac", "iPad", "iPhone", "Apple Watch", "BTB", "BTB(Apple)"];
    const hasData = displayUploads.current.length > 0;
    const targetRecords = rawTargetRowsToRecords(displayUploads.target);

    // Identify the "current" date for the period. Prefer the latest data
    // date present in the current uploads (so the daily target / forecast
    // reflects the data we actually have), but fall back to today.
    let periodYear = new Date().getFullYear();
    let periodMonth = new Date().getMonth();
    const latestDateFromData = (() => {
      if (!displayUploads.current.length) return null;
      let best: { year: number; month: number; day: number; time: number } | null = null;
      for (const row of displayUploads.current) {
        const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
        if (!rawDate) continue;
        const parsed = parseDocDate(rawDate);
        if (!parsed) continue;
        const ymd = {
          year: parsed.getFullYear(),
          month: parsed.getMonth(),
          day: parsed.getDate(),
          time: parsed.getTime(),
        };
        if (!best || ymd.time > best.time) best = ymd;
      }
      return best;
    })();
    if (latestDateFromData) {
      periodYear = latestDateFromData.year;
      periodMonth = latestDateFromData.month;
    }

    const periodTotalDays = new Date(periodYear, periodMonth + 1, 0).getDate();
    const periodMonthStr = String(periodMonth + 1).padStart(2, "0");
    const periodStart = `${periodYear}-${periodMonthStr}-01`;
    const periodEnd = `${periodYear}-${periodMonthStr}-${String(periodTotalDays).padStart(2, "0")}`;
    const officerTargetRow = displayUploads.target.find((row) => {
      const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
      return matchesOfficer(name, activeOfficer.name);
    });
    const officerId = resolveOfficerId(
      activeOfficer.name,
      displayUploads.target,
      targetRecords,
      displayUploads.current,
      matchesOfficer,
    );

    // Use the day-of-month from the latest data date (or today if no data)
    // so the daily target / forecast reflects the data we actually have.
    const currentMonthTotalDays = new Date(periodYear, periodMonth + 1, 0).getDate();
    const currentDay = Math.min(
      latestDateFromData?.day ?? new Date().getDate(),
      currentMonthTotalDays,
    );
    const totalDays = currentMonthTotalDays;
    
    // บิลของพนักงานคนนี้ (แบบ enriched catDaily แล้ว parse เป็นบิล) — ใช้
    // สำหรับนับ "Units" ด้วยวิธีเดียวกับ KPI preset (Cover Plus) คือ
    // countItemQuantityAnyFilter: เฉพาะ inventory item, dedupe ต่อบิล,
    // รวม quantity — ไม่ใช่การนับ raw row ตรงๆ ที่ให้เลขเกินจริง
    const unitsCatDailyLookup = catDailyLookupShared;
    const officerBillsForUnits = currentBillsShared.filter(
      (b) =>
        matchesOfficer(b.officerName, activeOfficer.name) ||
        Boolean(officerId && normalizeId(b.officerId) === normalizeId(officerId)),
    );
    const countCategoryUnits = (catName: string): number => {
      const filter: ItemFilter = { ...emptyItemFilter(), categories: [catName] };
      return officerBillsForUnits.reduce(
        (s, b) => s + countItemQuantityAnyFilter(b, [filter]),
        0,
      );
    };

    const todaySourceRows = todayRows.length ? todayRows : [];
    // Find latest data date by PARSED TIME so different string formats
    // for the same day (e.g. "26/06/2026" vs "26/06/2569") all match.
    let maxDateTime = 0;
    if (!todaySourceRows.length && hasData) {
      displayUploads.current.forEach((row) => {
        const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
        if (!rawDate) return;
        const parsed = parseDocDate(rawDate);
        if (parsed) {
          const time = parsed.getTime();
          if (time > maxDateTime) maxDateTime = time;
        }
      });
    }

    // บิลของ "วันล่าสุด" (หรือ Today sheet) สำหรับนับ unitsDay ด้วยวิธี
    // เดียวกับ Units รายเดือน (countItemQuantityAnyFilter ผ่าน preset)
    const dayRowsForUnits = todaySourceRows.length
      ? todaySourceRows
      : displayUploads.current.filter((row) => {
          const parsed = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
          const time = parsed ? parsed.getTime() : 0;
          return Boolean(time && time === maxDateTime);
        });
    const officerDayBills = parseBills(
      enrichSalesRowsWithCatDaily(dayRowsForUnits, unitsCatDailyLookup),
    ).filter(
      (b) =>
        matchesOfficer(b.officerName, activeOfficer.name) ||
        Boolean(officerId && normalizeId(b.officerId) === normalizeId(officerId)),
    );
    const countCategoryUnitsDay = (catName: string): number => {
      const filter: ItemFilter = { ...emptyItemFilter(), categories: [catName] };
      return officerDayBills.reduce(
        (s, b) => s + countItemQuantityAnyFilter(b, [filter]),
        0,
      );
    };

    // 3. For each category, compute target, actual, forecast, lastMonth, lastYear, actualDay
    const rows: CategoryPerformanceRow[] = categoriesList.map((catName) => {
      let target = 0;
      let actual = 0;
      let lastMonth = 0;
      let lastYear = 0;
      let actualDay = 0;
      let units = 0;
      let unitsDay = 0;

      if (hasData) {
        const kpi = getOfficerCategoryKpi({
          category: catName,
          officerName: activeOfficer.name,
          officerId,
          officerTargetRow,
          targetRecords,
          currentRows: displayUploads.current,
          lastMonthRows: displayUploads.lastMonth,
          lastYearRows: displayUploads.lastYear,
          periodStart,
          periodEnd,
          getCategory,
          matchesOfficer,
        });
        target = kpi.target;
        actual = kpi.actual;
        lastMonth = kpi.lastMonth;
        lastYear = kpi.lastYear;

        const dailyRows = todaySourceRows.length ? todaySourceRows : displayUploads.current;
        dailyRows.forEach((row) => {
          const rowOfficerId = String(row["STAFF ID"] ?? row.emp_id ?? "").trim();
          const officer = String(row["Officer (Name)"] ?? "").trim();
          const officerMatch =
            (officerId && rowOfficerId && normalizeId(rowOfficerId) === normalizeId(officerId)) ||
            matchesOfficer(officer, activeOfficer.name);
          if (!officerMatch) return;
          const rowCat = getCategory(row);
          if (rowCat !== catName) return;
          if (!todaySourceRows.length) {
            // Compare by parsed time, not by raw string, so rows that
            // represent the same calendar day but in slightly different
            // formats (e.g. "26/06/2026" vs "26/06/2569") all match.
            const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
            const parsed = parseDocDate(rawDate);
            const time = parsed ? parsed.getTime() : 0;
            if (!(time && time === maxDateTime)) return;
          }
          actualDay +=
            kpi.measureType === "quantity"
              ? toNumber(row.Number ?? row.number ?? row.qty ?? 0)
              : getCategoryValue(row);
        });

        // Units (จำนวนเครื่อง) — นับด้วยวิธีเดียวกับ KPI preset Cover Plus
        // (countItemQuantityAnyFilter: inventory item, dedupe, qty) ทั้ง MTD
        // และรายวัน
        units = countCategoryUnits(catName);
        unitsDay = countCategoryUnitsDay(catName);
      } else if (!hasData) {
        // Fallback/Mock distribution matching activeOfficer total values!
        const targetRates: Record<string, number> = {
          "iPhone": 0.54,
          "Mac": 0.11,
          "iPad": 0.18,
          "Apple Watch": 0.05,
          "BTB(Apple)": 0.07,
          "BTB": 0.05,
        };
        const actualRates: Record<string, number> = {
          "iPhone": 0.53,
          "Mac": 0.10,
          "iPad": 0.20,
          "Apple Watch": 0.05,
          "BTB(Apple)": 0.07,
          "BTB": 0.05,
        };
        
        target = Math.round(activeOfficer.target * (targetRates[catName] ?? 0.1));
        actual = Math.round(activeOfficer.actual * (actualRates[catName] ?? 0.1));
        lastMonth = 0;
        lastYear = 0;
        actualDay = Math.round(activeOfficer.actualDay * (actualRates[catName] ?? 0.1));
      }
      
      const achPercent = calcAchievementPct(actual, target);
      const forecast = calcForecastByDays(actual, currentDay, totalDays);
      const forecastPercent = calcAchievementPct(forecast, target);
      
      let momPercent: number | string = "New";
      if (lastMonth > 0) {
        momPercent = ((actual - lastMonth) / lastMonth) * 100;
      }
      
      let yoyPercent: number | string = "New";
      if (lastYear > 0) {
        yoyPercent = ((actual - lastYear) / lastYear) * 100;
      }
      
      // เป้าต่อวันแบบขั้นบันได: ไล่ให้ถึง 90% ก่อน แล้วค่อยไล่ต่อ 105%
      const stepped = calcSteppedRequiredPerDay(target, actual, currentDay, totalDays);
      const targetDay = stepped.perDay;
      const targetTierPct = stepped.tierPct;
      const diffDay = actualDay - targetDay;
      const achDayPercent = calcTodayAchievementPct(actualDay, targetDay);
      
      return {
        category: catName,
        target,
        actual,
        achPercent,
        forecast,
        forecastPercent,
        lastMonth,
        momPercent,
        lastYear,
        yoyPercent,
        targetDay,
        targetTierPct,
        actualDay,
        diffDay,
        achDayPercent,
        units,
        unitsDay,
      };
    });

    // 3b. "อื่นๆ" — ยอดที่ไม่เข้า 6 หมวดหลัก (เช่น SIM/Smile/หมวดที่ master
    // ไม่ได้ map เข้ากลุ่มอุปกรณ์) เดิมถูกตัดทิ้ง ทำให้ยอดรวมของตารางน้อยกว่า
    // ยอดขายจริงของวันนั้น/เดือนนั้น — เติมเป็นอีก 1 แถวเพื่อให้ Total ตรงกับ
    // ระบบหลังบ้าน
    if (hasData) {
      const rowIsOfficer = (row: RawRow): boolean => {
        const rowOfficerId = String(row["STAFF ID"] ?? row.emp_id ?? "").trim();
        const officer = String(row["Officer (Name)"] ?? "").trim();
        return (
          (Boolean(officerId) &&
            Boolean(rowOfficerId) &&
            normalizeId(rowOfficerId) === normalizeId(officerId)) ||
          matchesOfficer(officer, activeOfficer.name)
        );
      };

      let allActual = 0;
      displayUploads.current.forEach((row) => {
        if (rowIsOfficer(row)) allActual += getCategoryValue(row);
      });

      let allActualDay = 0;
      const dailyRowsAll = todaySourceRows.length ? todaySourceRows : displayUploads.current;
      dailyRowsAll.forEach((row) => {
        if (!rowIsOfficer(row)) return;
        if (!todaySourceRows.length) {
          const parsed = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
          const time = parsed ? parsed.getTime() : 0;
          if (!(time && time === maxDateTime)) return;
        }
        allActualDay += getCategoryValue(row);
      });

      const otherActual = allActual - rows.reduce((s, r) => s + r.actual, 0);
      const otherActualDay = allActualDay - rows.reduce((s, r) => s + r.actualDay, 0);
      if (otherActual > 0.5 || otherActualDay > 0.5) {
        rows.push({
          category: "อื่นๆ",
          target: 0,
          actual: Math.max(0, otherActual),
          achPercent: 0,
          forecast: 0,
          forecastPercent: 0,
          lastMonth: 0,
          momPercent: "New",
          lastYear: 0,
          yoyPercent: "New",
          targetDay: 0,
          actualDay: Math.max(0, otherActualDay),
          diffDay: Math.max(0, otherActualDay),
          achDayPercent: 0,
          units: 0,
          unitsDay: 0,
        });
      }
    }

    // 4. Calculate Total row
    const totalTarget = rows.reduce((s, r) => s + r.target, 0);
    const totalActual = rows.reduce((s, r) => s + r.actual, 0);
    const totalAchPercent = totalTarget ? (totalActual / totalTarget) * 100 : 0;
    const totalForecast = rows.reduce((s, r) => s + r.forecast, 0);
    const totalForecastPercent = totalTarget ? (totalForecast / totalTarget) * 100 : 0;
    const totalLastMonth = rows.reduce((s, r) => s + r.lastMonth, 0);
    let totalMomPercent: number | string = "New";
    if (totalLastMonth > 0) {
      totalMomPercent = ((totalActual - totalLastMonth) / totalLastMonth) * 100;
    }
    const totalLastYear = rows.reduce((s, r) => s + r.lastYear, 0);
    let totalYoyPercent: number | string = "New";
    if (totalLastYear > 0) {
      totalYoyPercent = ((totalActual - totalLastYear) / totalLastYear) * 100;
    }
    const totalStepped = calcSteppedRequiredPerDay(
      totalTarget,
      totalActual,
      currentDay,
      totalDays,
    );
    const totalTargetDay = totalStepped.perDay;
    const totalActualDay = rows.reduce((s, r) => s + r.actualDay, 0);
    const totalDiffDay = totalActualDay - totalTargetDay;
    const totalAchDayPercent = calcTodayAchievementPct(totalActualDay, totalTargetDay);
    const totalUnits = rows.reduce((s, r) => s + (r.units ?? 0), 0);
    const totalUnitsDay = rows.reduce((s, r) => s + (r.unitsDay ?? 0), 0);

    const totalRow: CategoryPerformanceRow = {
      category: "Total",
      target: totalTarget,
      actual: totalActual,
      achPercent: totalAchPercent,
      forecast: totalForecast,
      forecastPercent: totalForecastPercent,
      lastMonth: totalLastMonth,
      momPercent: totalMomPercent,
      lastYear: totalLastYear,
      yoyPercent: totalYoyPercent,
      targetDay: totalTargetDay,
      targetTierPct: totalStepped.tierPct,
      actualDay: totalActualDay,
      diffDay: totalDiffDay,
      achDayPercent: totalAchDayPercent,
      units: totalUnits,
      unitsDay: totalUnitsDay,
    };

    return [...rows, totalRow];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOfficer, displayUploads, parsedReport, getCategory, todayRows]);
}
