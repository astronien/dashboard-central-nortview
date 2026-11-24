/**
 * หมวดหลักรายคนย้อนหลัง (Mac / iPad / iPhone / Apple Watch / BTB / BTB(Apple))
 * คิดจากข้อมูลดิบในคลัง ด้วยกติกาจับหมวดเดียวกับตารางรวมหมวด (Category Master → catDaily)
 */
import type { RawRow } from "./salesAggregations";
import { buildCatDailyLookup, enrichSalesRowsWithCatDaily } from "./presetCatDaily";
import { rowMatchesKpiCategory } from "./kpiCategoryAdapter";
import { matchesOfficer } from "./matchHelpers";

export const MAIN_CATS = ["iPhone", "iPad", "Mac", "Apple Watch", "BTB(Apple)", "BTB"] as const;
export const CAT_TEAM = "__team__";

export type CatCell = { baht: number; units: number };
/** ชื่อพนักงาน (หรือ __team__) → หมวด → ยอด */
export type MonthCat = Record<string, Record<string, CatCell>>;

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
const bahtOf = (r: RawRow) => num(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r.totalPrice);

export function computeMonthCat(rows: RawRow[], categoryMaster: RawRow[]): MonthCat {
  const enriched = enrichSalesRowsWithCatDaily(rows, buildCatDailyLookup(categoryMaster));
  const names: string[] = [];
  const out: MonthCat = { [CAT_TEAM]: {} };
  const add = (who: string, cat: string, r: RawRow) => {
    const m = (out[who] ??= {});
    const c = (m[cat] ??= { baht: 0, units: 0 });
    c.baht += bahtOf(r);
    c.units += num(r.Number ?? r.number ?? r.qty ?? 1) || 1;
  };
  for (const r of enriched) {
    const cat = MAIN_CATS.find((c) => rowMatchesKpiCategory(r, c));
    if (!cat) continue;
    add(CAT_TEAM, cat, r);
    const n = String(r["Officer (Name)"] ?? "").trim();
    if (!n) continue;
    let key = names.find((x) => matchesOfficer(x, n));
    if (!key) {
      names.push(n);
      key = n;
    }
    add(key, cat, r);
  }
  return out;
}

export function findCatStaffKey(month: MonthCat, name: string): string | undefined {
  if (month[name]) return name;
  return Object.keys(month).find((k) => k !== CAT_TEAM && matchesOfficer(k, name));
}
