/**
 * ตาราง "ยอดขายตามหมวด + 7 Wonders รายคน"
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ — ตัวแปรจาก component ส่งเข้ามาทาง param)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import type { UploadKind } from "../lib/uploadsApi";
import type { BillSummary } from "../lib/presetBills";
import type { Preset as KpiPreset } from "../lib/presetTypes";
import { calcPreset, computePresetAchPercent, presetDisplayValue } from "../lib/presetEngine";
import { parseDocDate } from "../lib/dateParser";
import { calcAchievementPct, normalizeId, rawTargetRowsToRecords } from "../lib/targetAggregations";
import { getOfficerCategoryKpi, resolveOfficerId } from "../lib/officerCategoryKpi";
import type { KpiCategoryKey } from "../lib/kpiCategoryAdapter";
import { getCategoryValue } from "../lib/salesAggregations";
import { matchesOfficer } from "../lib/matchHelpers";
import { OTHER_CAT, calcPresetIphoneAcc, countUfundIphoneBills } from "../lib/attachHelpers";
import type { CsatUser } from "../lib/csatApi";
import type {
  CombinedCatCell,
  CombinedOfficerKpiData,
  CombinedWonderCell,
} from "../components/dashboard/HomeDashboardSection";

export type CombinedOfficerKpiInput = {
  kpiPresets: KpiPreset[];
  displayUploads: Record<UploadKind, RawRow[]>;
  parsedReport: { officers: Array<{ name: string; branch: string; staffId?: string; position?: string }> };
  getCategory: (row: RawRow) => string;
  tradeCountForOfficer: (staffId?: string, name?: string) => number;
  tradeForOfficer: (staffId?: string, name?: string) => { actual: number; target: number };
  ufundForOfficer: (staffId?: string, name?: string) => { total: number; approved: number } | undefined;
  iphoneUnitsFromBills: (bills: BillSummary[]) => number;
  csatForOfficer: (staffId?: string, name?: string) => CsatUser | undefined;
  currentBillsShared: BillSummary[];
};

export function useCombinedOfficerKpi(input: CombinedOfficerKpiInput): CombinedOfficerKpiData {
  const {
    kpiPresets,
    displayUploads,
    parsedReport,
    getCategory,
    tradeCountForOfficer,
    tradeForOfficer,
    ufundForOfficer,
    iphoneUnitsFromBills,
    csatForOfficer,
    currentBillsShared,
  } = input;
  return useMemo<CombinedOfficerKpiData>(() => {
    const categoriesList: KpiCategoryKey[] = ["Mac", "iPad", "iPhone", "Apple Watch", "BTB", "BTB(Apple)"];
    const wonderPresets = kpiPresets.filter((p) => p.showInStaffProfile);
    if (displayUploads.current.length === 0) {
      return { categories: categoriesList, presets: wonderPresets, rows: [] };
    }

    const targetRecords = rawTargetRowsToRecords(displayUploads.target);

    // หา period จากวันที่ล่าสุดในข้อมูล (fallback = วันนี้) — ตรรกะเดียวกับ
    // activeOfficerCategoryPerformance เพื่อให้เป้าตรงกับ staff profile
    let periodYear = new Date().getFullYear();
    let periodMonth = new Date().getMonth();
    let bestTime = 0;
    for (const row of displayUploads.current) {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!rawDate) continue;
      const parsed = parseDocDate(rawDate);
      if (parsed && parsed.getTime() > bestTime) {
        bestTime = parsed.getTime();
        periodYear = parsed.getFullYear();
        periodMonth = parsed.getMonth();
      }
    }
    const periodTotalDays = new Date(periodYear, periodMonth + 1, 0).getDate();
    const periodMonthStr = String(periodMonth + 1).padStart(2, "0");
    const periodStart = `${periodYear}-${periodMonthStr}-01`;
    const periodEnd = `${periodYear}-${periodMonthStr}-${String(periodTotalDays).padStart(2, "0")}`;

    const allBills = currentBillsShared;

    const officerList: Array<{ name: string; branch: string; staffId?: string; position?: string }> =
      parsedReport.officers.length > 0
        ? parsedReport.officers.map((o) => ({
            name: o.name,
            branch: o.branch,
            staffId: o.staffId,
            position: o.position,
          }))
        : Array.from(
            new Map(
              allBills
                .filter((b) => b.officerName)
                .map((b) => [b.officerName, { name: b.officerName, branch: b.branchName }]),
            ).values(),
          );

    const rows = officerList
      .map((officer) => {
        const officerTargetRow = displayUploads.target.find((row) => {
          const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
          return matchesOfficer(name, officer.name);
        });
        // ใช้ resolveOfficerId แบบเดียวกับ staff profile — ห้ามใช้ staffId จาก
        // parsedReport ตรงๆ เพราะถ้า id นั้นไม่ตรงกับคอลัมน์ STAFF ID ในไฟล์ขาย
        // (หรือไฟล์ขายไม่มีคอลัมน์นี้) ตัวกรองรายคนจะไม่ทำงาน และยอดของทุกคน
        // จะกลายเป็นยอดรวมทั้งสาขา (เท่ากันหมด)
        const officerId = resolveOfficerId(
          officer.name,
          displayUploads.target,
          targetRecords,
          displayUploads.current,
          matchesOfficer,
        );

        const cats: Record<string, CombinedCatCell> = {};
        let catActualSum = 0;
        let catTargetSum = 0;
        categoriesList.forEach((catName) => {
          const kpi = getOfficerCategoryKpi({
            category: catName,
            officerName: officer.name,
            officerId,
            officerTargetRow,
            targetRecords,
            currentRows: displayUploads.current,
            lastMonthRows: [],
            lastYearRows: [],
            periodStart,
            periodEnd,
            getCategory,
            matchesOfficer,
          });
          cats[catName] = {
            actual: kpi.actual,
            target: kpi.target,
            achPercent: calcAchievementPct(kpi.actual, kpi.target),
          };
          catActualSum += kpi.actual;
          catTargetSum += kpi.target;
        });

        // "อื่นๆ" — ยอดที่ไม่เข้า 6 หมวดหลัก (SIM/Smile/หมวดที่ไม่ได้จัดกลุ่ม)
        // ต้องนับเข้ายอดรวมด้วย ไม่งั้น TOTAL ของตารางนี้จะน้อยกว่าที่แสดงใน
        // staff profile (ซึ่งมีแถว "อื่นๆ" แล้ว) และไม่ตรงกับระบบหลังบ้าน
        const nIdCat = normalizeId(officerId);
        let officerAllActual = 0;
        for (const row of displayUploads.current) {
          const rowOfficerId = String(row["STAFF ID"] ?? row.emp_id ?? row["Officer (ID)"] ?? "").trim();
          const oName = String(row["Officer (Name)"] ?? "").trim();
          const isMine =
            (Boolean(nIdCat) &&
              Boolean(rowOfficerId) &&
              normalizeId(rowOfficerId) === nIdCat) ||
            matchesOfficer(oName, officer.name);
          if (isMine) officerAllActual += getCategoryValue(row);
        }
        const otherActual = Math.max(0, officerAllActual - catActualSum);
        if (otherActual > 0.5) {
          cats[OTHER_CAT] = { actual: otherActual, target: 0, achPercent: 0 };
          catActualSum += otherActual;
        }

        const officerBills = allBills.filter((b) => matchesOfficer(b.officerName, officer.name));
        // ฐาน iPhone ให้ตรงกับตัวเลขที่โชว์ใน COVERPLUS เป๊ะ (ใช้ billsWithB —
        // ฝั่ง iPhone — ของ preset Cover Plus ตัวเดียวกัน) เพื่อให้ทั้ง Trade-In
        // และ UFUND นับ iPhone เท่ากับ COVERPLUS ไม่ใช้ iphoneUnitsFromBills
        // ที่นับคนละแบบ
        const coverPlusPreset = wonderPresets.find((pp) =>
          /cover\s*\+|cover\s*plus|coverplus/i.test(pp.name),
        );
        const coverPlusIphoneBase = coverPlusPreset
          ? calcPreset(officerBills, coverPlusPreset, {
              tradeInCount: 0,
              iphoneUnits: 0,
            }).billsWithB
          : iphoneUnitsFromBills(officerBills);
        const ctx = {
          tradeInCount: tradeCountForOfficer(officer.staffId, officer.name),
          iphoneUnits: coverPlusIphoneBase,
        };
        const wonders: Record<string, CombinedWonderCell> = {};
        wonderPresets.forEach((p) => {
          const r = calcPresetIphoneAcc(officerBills, p, ctx);
          const target = p.targetPercent ?? 0;
          wonders[p.id] = {
            actual: presetDisplayValue(r),
            target,
            achPercent: computePresetAchPercent(r, target),
            actualA: r.billsWithAandB,
            actualB: r.billsWithB,
            calcType: p.calcType,
            // Trade In: ยอดประเมิน (รายการเทรดทั้งหมด) ÷ iPhone — 2nd sub-column
            ...(p.calcType === "tradeIn"
              ? { appraisalA: tradeForOfficer(officer.staffId, officer.name).target }
              : {}),
            // UFUND: ยอดประเมิน (ยื่น/อนุมัติ) from the uFund API — 2nd sub-column
            ...(/ufund/i.test(p.name)
              ? (() => {
                  const u = ufundForOfficer(officer.staffId, officer.name);
                  return u ? { appraisalA: u.approved, appraisalB: u.total } : {};
                })()
              : {}),
          };

          // UFUND "ตกลง" = บิลที่ปิดการขายด้วย UFUND ÷ จำนวน iPhone ทั้งหมด
          // ฐาน iPhone ใช้ "จำนวนเครื่อง (unit)" ตัวเดียวกับ Attach Cover Plus /
          // Trade-In (iphoneUnitsFromBills → rowMatchesKpiCategory "iPhone")
          // ไม่ใช่ "จำนวนบิลที่มี iPhone" เพราะบิลเดียวอาจมี iPhone หลายเครื่อง
          if (/ufund/i.test(p.name)) {
            const iphoneBase = coverPlusIphoneBase;
            const ufundIphone = countUfundIphoneBills(officerBills);
            const rate = iphoneBase > 0 ? (ufundIphone / iphoneBase) * 100 : 0;
            wonders[p.id].actualA = ufundIphone;
            wonders[p.id].actualB = iphoneBase;
            wonders[p.id].actual = rate;
            wonders[p.id].achPercent = rate;
          }
        });

        const csatUser = csatForOfficer(officer.staffId, officer.name);

        return {
          officer,
          cats,
          catTotal: {
            actual: catActualSum,
            target: catTargetSum,
            achPercent: catTargetSum > 0 ? (catActualSum / catTargetSum) * 100 : 0,
          },
          wonders,
          csat: csatUser
            ? {
                score: csatUser.avgScore,
                maxScore: csatUser.maxScore,
                responseCount: csatUser.responseCount,
                // จำนวนบิลทั้งหมดรายคน จาก CSAT โดยตรง (total_bill) — ตรงกับ
                // หน้าเว็บ CSAT เมื่อเลือกพนักงานรายคน
                billCount: csatUser.totalBill,
              }
            : undefined,
        };
      })
      .filter(
        (r) =>
          r.catTotal.actual > 0 ||
          Object.values(r.wonders).some((w) => w.actual > 0),
      )
      .sort((a, b) => b.catTotal.actual - a.catTotal.actual);

    // โชว์คอลัมน์ "อื่นๆ" เฉพาะเมื่อมีใครมียอดตกนอก 6 หมวดจริงๆ
    const hasOther = rows.some((r) => (r.cats[OTHER_CAT]?.actual ?? 0) > 0);
    const cols = hasOther ? [...categoriesList, OTHER_CAT] : categoriesList;

    return { categories: cols, presets: wonderPresets, rows };
  // deps เหมือนเดิมทุกตัว
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kpiPresets,
    displayUploads.current,
    displayUploads.target,
    displayUploads.categoryMaster,
    parsedReport.officers,
    getCategory,
    tradeCountForOfficer,
    tradeForOfficer,
    ufundForOfficer,
    iphoneUnitsFromBills,
    csatForOfficer,
  ]);
}
