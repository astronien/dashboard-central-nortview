/**
 * Snapshot รายหมวดของสาขา (การ์ด/ตารางหมวดหน้า Home + trend snapshot)
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ — deps เหมือนเดิมทุกตัว)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import type { UploadKind } from "../lib/uploadsApi";
import type { BillSummary } from "../lib/presetBills";
import type { Preset as KpiPreset } from "../lib/presetTypes";
import { calcPreset } from "../lib/presetEngine";
import { buildCategorySnapshots } from "../lib/categorySnapshotBuilder";
import { countUfundIphoneBills } from "../lib/attachHelpers";

export type CategorySnapshotsInput = {
  displayUploads: Record<UploadKind, RawRow[]>;
  enrichedCurrentRows: RawRow[];
  enrichedTodayRows: RawRow[];
  categoryTargetOverrides: Record<string, number>;
  tradeInData: { actual: number; today: number; target: number } | undefined;
  kpiPresets: KpiPreset[];
  currentBillsShared: BillSummary[];
};

export function useCategorySnapshots(input: CategorySnapshotsInput) {
  const { displayUploads, enrichedCurrentRows, enrichedTodayRows, categoryTargetOverrides, tradeInData, kpiPresets, currentBillsShared } = input;
  return useMemo(() => {
    // Preset-engine counts (inventory-only, per-bill deduped) so COVER+ / AC+
    // / UFUND and the iPhone base match the "7 Wonders" combined table
    // instead of the raw rowMatchesKpiCategory sums.
    let presetCounts:
      | { iphoneBase?: number; cover?: number; ac?: number; ufund?: number }
      | undefined;
    if (enrichedCurrentRows.length) {
      const allBills = currentBillsShared;
      const dummy = { tradeInCount: 0, iphoneUnits: 0 };
      const coverPlusPreset = kpiPresets.find((p) =>
        /cover\s*\+|cover\s*plus|coverplus/i.test(p.name),
      );
      const acPreset = kpiPresets.find((p) => /\bac\s*\+|apple\s*care|applecare/i.test(p.name));
      const cp = coverPlusPreset ? calcPreset(allBills, coverPlusPreset, dummy) : null;
      presetCounts = {
        iphoneBase: cp ? cp.billsWithB : undefined,
        cover: cp ? cp.billsWithAandB : undefined,
        ac: acPreset ? calcPreset(allBills, acPreset, dummy).billsWithAandB : undefined,
        // UFUND = บิล iPhone ที่ Customer Code = UFUND PERSONAL (ไม่พึ่ง filter ของ preset)
        ufund: countUfundIphoneBills(allBills),
      };
    }
    return buildCategorySnapshots({
      targetRows: displayUploads.target,
      currentRows: enrichedCurrentRows,
      todayRows: enrichedTodayRows,
      lastMonthRows: displayUploads.lastMonth,
      lastYearRows: displayUploads.lastYear,
      targetOverrides: categoryTargetOverrides,
      tradeInData,
      presetCounts,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayUploads.target,
    enrichedCurrentRows,
    enrichedTodayRows,
    displayUploads.lastMonth,
    displayUploads.lastYear,
    categoryTargetOverrides,
    tradeInData,
    kpiPresets,
  ]);
}
