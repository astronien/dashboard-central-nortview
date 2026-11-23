/**
 * ATT รายคนย้อนหลัง — คิดจากข้อมูลดิบในคลังรายเดือน ด้วย KPI Preset ชุดปัจจุบัน
 * เก็บเป็น "จำนวนที่แนบ (a) / ฐาน (b)" เพื่อเฉลี่ยแบบรวมแล้วค่อยหาร (Σa ÷ Σb)
 * ไม่คูณโหมด x2 — เทียบกันได้ทุกเดือน
 */
import type { RawRow } from "./salesAggregations";
import type { Preset } from "./presetTypes";
import { calcPreset } from "./presetEngine";
import { parseBills, type BillSummary } from "./presetBills";
import { buildCatDailyLookup, enrichSalesRowsWithCatDaily } from "./presetCatDaily";
import { calcPresetIphoneAcc, countUfundIphoneBills } from "./attachHelpers";
import { matchesOfficer } from "./matchHelpers";

export type AttCell = { a: number; b: number };
/** ชื่อพนักงาน → presetId → a/b */
export type MonthAtt = Record<string, Record<string, AttCell>>;

const isUfund = (p: Preset) => /ufund/i.test(p.name);
/** แกนที่เป็น "อัตราแนบ" (คิด a/b ได้) */
export const attAxes = (presets: Preset[]) =>
  presets.filter((p) => p.showInStaffProfile && (p.calcType === "attach" || p.calcType === "catAttach" || isUfund(p)));

export const TEAM = "__team__";

function cellsFor(bills: BillSummary[], axes: Preset[]): Record<string, AttCell> {
  const cover = axes.find((p) => /cover\s*\+|cover\s*plus|coverplus/i.test(p.name));
  const ctx0 = { tradeInCount: 0, iphoneUnits: 0 };
  const iphoneBase = cover ? calcPreset(bills, cover, ctx0).billsWithB : 0;
  const ctx = { tradeInCount: 0, iphoneUnits: iphoneBase };
  const out: Record<string, AttCell> = {};
  for (const p of axes) {
    if (isUfund(p)) {
      out[p.id] = { a: countUfundIphoneBills(bills), b: iphoneBase };
    } else {
      const r = calcPresetIphoneAcc(bills, p, ctx);
      out[p.id] = { a: r.billsWithAandB, b: r.billsWithB };
    }
  }
  return out;
}

export function computeMonthAtt(rows: RawRow[], axes: Preset[], categoryMaster: RawRow[]): MonthAtt {
  const bills = parseBills(enrichSalesRowsWithCatDaily(rows, buildCatDailyLookup(categoryMaster)));
  // รวมชื่อที่เขียนต่างกันเล็กน้อยเป็นคนเดียว (ใช้ชื่อแรกที่เจอ)
  const groups: Array<{ name: string; bills: BillSummary[] }> = [];
  for (const b of bills) {
    const n = String(b.officerName ?? "").trim();
    if (!n) continue;
    const g = groups.find((x) => matchesOfficer(x.name, n));
    if (g) g.bills.push(b);
    else groups.push({ name: n, bills: [b] });
  }
  const out: MonthAtt = { [TEAM]: cellsFor(bills, axes) };
  for (const g of groups) out[g.name] = cellsFor(g.bills, axes);
  return out;
}

/** หาคีย์ชื่อในเดือนนั้นที่ตรงกับพนักงานคนนี้ */
export function findStaffKey(month: MonthAtt, name: string): string | undefined {
  if (month[name]) return name;
  return Object.keys(month).find((k) => k !== TEAM && matchesOfficer(k, name));
}

export const rateOf = (c: AttCell | undefined): number | null => (c && c.b > 0 ? (c.a / c.b) * 100 : null);

export function sumCells(cells: Array<AttCell | undefined>): AttCell {
  return cells.reduce<AttCell>((s, c) => (c ? { a: s.a + c.a, b: s.b + c.b } : s), { a: 0, b: 0 });
}
