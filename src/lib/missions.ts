/**
 * "ภารกิจวันนี้" รายคน — สรุปสั้นๆ ว่าวันนี้แต่ละคนต้องทำอะไรถึงจะตามเป้าทัน
 * คิดจากข้อมูลที่ dashboard มีอยู่แล้ว (ตารางรวมหมวด + 7 Wonders และรายงานรายวัน)
 */
import type {
  CombinedOfficerKpiData,
  CombinedOfficerRow,
  CombinedWonderCell,
} from "../components/dashboard/HomeDashboardSection";
import type { DailyReportData } from "../components/dashboard/DailyBranchReportSection";
import { calcSteppedRequiredPerDay } from "./targetAggregations";
import { matchesOfficer } from "./matchHelpers";

export type MissionTask = {
  kind: "attach" | "count" | "category";
  /** ข้อความสั้น เช่น "แนบ COVER+ อีก 2" */
  text: string;
  /** ยิ่งมากยิ่งสำคัญ (ใช้เรียง) */
  weight: number;
};

export type Mission = {
  name: string;
  staffId?: string;
  /** ต้องได้วันละเท่าไร (ขั้นบันได 90% → 105%) */
  needPerDay: number;
  /** ขั้นที่กำลังไล่ (90 / 105) — null = ผ่านครบแล้ว */
  tierPct: number | null;
  /** ยอดของวันล่าสุดในข้อมูล */
  todayBaht: number;
  /** % ถึงเป้าเดือนนี้ */
  monthPct: number | null;
  /** นำ/ตามขีดควรถึงวันนี้ (%) */
  paceGap: number | null;
  tasks: MissionTask[];
  done: boolean;
};

const isPctCalc = (c?: string) => c === "attach" || c === "catAttach" || c === "tradeIn";
const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${Math.round(n / 1000)}K` : `${Math.round(n)}`;

/** แนบอีกกี่ชิ้นถึงจะถึง % เป้า (จากฐานที่ขายไปแล้ว) */
function attachShort(w: CombinedWonderCell): number {
  if (!(w.target > 0) || w.actualA == null || w.actualB == null || w.actualB <= 0) return 0;
  return Math.max(0, Math.ceil((w.target / 100) * w.actualB - w.actualA - 1e-9));
}

export function buildMissions(params: {
  combined: CombinedOfficerKpiData;
  daily: DailyReportData;
  currentDay: number;
  totalDays: number;
}): Mission[] {
  const { combined, daily, currentDay, totalDays } = params;
  const day = Math.max(1, Math.min(currentDay, totalDays || 1));
  const expectedPct = totalDays ? (day / totalDays) * 100 : 0;
  const daysLeft = Math.max(1, totalDays - day);

  return combined.rows.map((row: CombinedOfficerRow) => {
    const tasks: MissionTask[] = [];

    // 7 Wonders: แนบ/ขายอีกกี่ชิ้น
    for (const p of combined.presets) {
      const w = row.wonders[p.id];
      if (!w || !(w.target > 0)) continue;
      if (isPctCalc(w.calcType)) {
        const short = attachShort(w);
        if (short > 0) tasks.push({ kind: "attach", text: `แนบ ${p.name} อีก ${short}`, weight: 2 + short });
      } else if (w.calcType === "unit" || w.calcType === "catQty") {
        const left = Math.ceil(w.target - w.actual);
        if (left > 0) {
          const perDay = Math.ceil(left / daysLeft);
          tasks.push({ kind: "count", text: `${p.name} อีก ${left} (วันละ ${perDay})`, weight: 1 + perDay });
        }
      }
    }

    // หมวดที่ตามขีดควรถึงวันนี้ — เอา 2 หมวดที่ห่างที่สุด
    const behind = combined.categories
      .map((cat) => ({ cat, c: row.cats[cat] }))
      .filter(({ c }) => c && c.target > 0 && (c.actual / c.target) * 100 < expectedPct)
      .map(({ cat, c }) => {
        const need = calcSteppedRequiredPerDay(c!.target, c!.actual, day, totalDays).perDay;
        return { cat, need, gap: expectedPct - (c!.actual / c!.target) * 100 };
      })
      .filter((x) => x.need > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2);
    for (const b of behind) {
      tasks.push({ kind: "category", text: `${b.cat} วันละ ฿${fmtK(b.need)}`, weight: b.gap / 10 });
    }

    tasks.sort((a, b) => b.weight - a.weight);

    const total = row.catTotal;
    const stepped = calcSteppedRequiredPerDay(total.target, total.actual, day, totalDays);
    const dRow = daily.rows.find((r) => !r.isTotal && matchesOfficer(r.name, row.officer.name));
    const monthPct = total.target > 0 ? (total.actual / total.target) * 100 : null;
    const paceGap =
      total.target > 0 && expectedPct > 0 ? (total.actual / ((total.target * expectedPct) / 100)) * 100 - 100 : null;

    return {
      name: row.officer.name,
      staffId: row.officer.staffId,
      needPerDay: stepped.perDay,
      tierPct: stepped.tierPct,
      todayBaht: dRow?.totalBaht ?? 0,
      monthPct,
      paceGap,
      tasks: tasks.slice(0, 4),
      done: stepped.tierPct == null && tasks.length === 0,
    };
  });
}
