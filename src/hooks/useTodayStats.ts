/**
 * สรุปยอด "วันนี้" ของสาขา (แท็บ Today หน้า Home)
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ — deps เหมือนเดิมทุกตัว)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import { getCategoryValue } from "../lib/salesAggregations";
import { parseDocDate } from "../lib/dateParser";
import { toNumber } from "../lib/targetAggregations";

export type TodayStatsInput = {
  todayRows: RawRow[];
  parsedReport: {
    branches: Array<{ target: number; totalDays?: number; momPercent?: number | string; yoyPercent?: number | string }>;
    categories: Array<{ category: string; target: number }>;
  };
  getCategory: (row: RawRow) => string;
};

export function useTodayStats(input: TodayStatsInput) {
  const { todayRows, parsedReport, getCategory } = input;
  const formatTodayDateLabel = (rawDate: string) => {
    if (!rawDate) return "";
    const parsed = parseDocDate(rawDate);
    if (!parsed) return rawDate;
    return parsed.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return useMemo(() => {
    if (!todayRows.length) return { revenue: 0, units: 0, target: 0, ach: 0, mom: 0, yoy: 0, categories: [], dateStr: "" };
    
    let totalRevenue = 0;
    let totalUnits = 0;
    
    todayRows.forEach(row => {
      const cat = String(row["Category (Name)"] ?? "").toLowerCase();
      const val = getCategoryValue(row);
      totalRevenue += val;
      if (cat.includes("sim")) {
        totalUnits += toNumber(row.Number ?? row.number ?? row.qty ?? 1);
      } else {
        totalUnits += 1;
      }
    });
    
    const totalDays = parsedReport.branches.reduce((acc, b) => Math.max(acc, b.totalDays || 30), 30);
    const totalTarget = parsedReport.branches.reduce((acc, b) => acc + (b.target || 0), 0);
    const dailyTarget = totalTarget / totalDays;
    const ach = dailyTarget ? (totalRevenue / dailyTarget) * 100 : 0;
    
    const momVal = parsedReport.branches.reduce((acc, b) => acc + (typeof b.momPercent === "number" ? b.momPercent : 0), 0) / (parsedReport.branches.length || 1);
    const yoyVal = parsedReport.branches.reduce((acc, b) => acc + (typeof b.yoyPercent === "number" ? b.yoyPercent : 0), 0) / (parsedReport.branches.length || 1);
    
    const cats = ["Grand Total", "iPhone", "Mac", "iPad", "Apple Watch", "BTB", "3rd Party"];
    const catStats = cats.map(cName => {
      let catRevenue = 0;
      let catUnits = 0;
      
      todayRows.forEach(row => {
        const mapped = getCategory(row);
        let match = false;
        if (cName === "Grand Total") {
          match = true;
        } else if (cName === "3rd Party") {
          match = mapped.toLowerCase().includes("accessories") || mapped.toLowerCase().includes("other") || mapped.toLowerCase().includes("3rd");
        } else {
          match = mapped.toLowerCase().includes(cName.toLowerCase());
        }
        
        if (match) {
          catRevenue += getCategoryValue(row);
          const cat = String(row["Category (Name)"] ?? "").toLowerCase();
          if (cat.includes("sim")) {
            catUnits += toNumber(row.Number ?? row.number ?? row.qty ?? 1);
          } else {
            catUnits += 1;
          }
        }
      });
      
      let catDailyTarget = 0;
      if (cName === "Grand Total") {
        catDailyTarget = dailyTarget;
      } else {
        const catTargetSum = parsedReport.categories.find(item => item.category.toLowerCase().includes(cName.toLowerCase()))?.target || 0;
        catDailyTarget = catTargetSum / totalDays;
      }
      const catAch = catDailyTarget ? (catRevenue / catDailyTarget) * 100 : 0;
      
      return {
        name: cName,
        actual: catRevenue,
        units: catUnits,
        target: catDailyTarget,
        ach: catAch
      };
    });
    
    const rawDateStr = String(todayRows[0]?.["Doc Date"] ?? "");
    const dateStr = formatTodayDateLabel(rawDateStr);
    
    return {
      revenue: totalRevenue,
      units: totalUnits,
      target: dailyTarget,
      ach,
      mom: momVal,
      yoy: yoyVal,
      categories: catStats,
      dateStr
    };
  }, [todayRows, parsedReport, getCategory, getCategoryValue]);
}
