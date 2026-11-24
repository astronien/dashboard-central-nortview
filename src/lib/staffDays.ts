/**
 * วันทำงานรายคน (นับจากวันที่มีบิลอย่างน้อย 1 บิล) — ใช้คิดผลิตภาพต่อคน
 */
import type { RawRow } from "./salesAggregations";
import { parseDocDate } from "./dateParser";
import { matchesOfficer } from "./matchHelpers";

export type StaffDays = Record<string, { days: number; bills: number; baht: number }>;

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;

export function computeMonthStaffDays(rows: RawRow[]): StaffDays {
  const names: string[] = [];
  const acc: Record<string, { days: Set<number>; bills: Set<string>; baht: number }> = {};
  for (const r of rows) {
    const n = String(r["Officer (Name)"] ?? "").trim();
    if (!n) continue;
    let key = names.find((x) => matchesOfficer(x, n));
    if (!key) {
      names.push(n);
      key = n;
    }
    const a = (acc[key] ??= { days: new Set(), bills: new Set(), baht: 0 });
    const d = parseDocDate(String(r["Doc Date"] ?? r["doc date"] ?? ""));
    if (d) a.days.add(d.getDate());
    const doc = String(r["Doc No"] ?? "").trim();
    if (doc) a.bills.add(doc);
    a.baht += num(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r.totalPrice);
  }
  const out: StaffDays = {};
  for (const [k, v] of Object.entries(acc)) out[k] = { days: v.days.size, bills: v.bills.size, baht: v.baht };
  return out;
}
