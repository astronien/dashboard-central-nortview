import type { PresetCalcType } from "./presetTypes";

/** แถวตารางผลงานรายหมวด (หน้า Staff Profile) */
export type CategoryPerformanceRow = {
  category: string;
  target: number;
  actual: number;
  achPercent: number;
  forecast: number;
  forecastPercent: number;
  lastMonth: number;
  momPercent: number | string;
  lastYear: number;
  yoyPercent: number | string;
  targetDay: number;
  /** ขั้นบันไดที่กำลังไล่ (90 / 105) — null = ผ่านครบแล้ว */
  targetTierPct?: number | null;
  actualDay: number;
  diffDay: number;
  achDayPercent: number;
  units?: number;
  unitsDay?: number;
  actualA?: number;
  actualB?: number;
  calcType?: PresetCalcType;
};
