/**
 * ยอดขายรวมรายวันตลอดทั้งเดือน + ค่าเฉลี่ย
 */
import { parseDocDate } from "./dateParser";

type Row = Record<string, unknown>;

export type DailySalesDay = {
  ymd: string;
  /** 0 = อาทิตย์ … 6 = เสาร์ */
  dow: number;
  baht: number;
  bills: number;
  iphone: number;
};

export type DailySales = {
  days: DailySalesDay[];
  totalBaht: number;
  totalBills: number;
  totalIphone: number;
  avgBaht: number;
  avgBills: number;
  avgIphone: number;
  /** ค่าเฉลี่ยยอดขายแยกวันในสัปดาห์ (index = dow) — null = ไม่มีวันนั้น */
  avgByDow: Array<number | null>;
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
const bahtOf = (r: Row) => num(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r.totalPrice);

export function buildDailySales(rows: Row[]): DailySales {
  const m = new Map<string, { baht: number; bills: Set<string>; iphone: number; dow: number }>();
  for (const r of rows) {
    const d = parseDocDate(String(r["Doc Date"] ?? r["doc date"] ?? ""));
    if (!d) continue;
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cur = m.get(ymd) ?? { baht: 0, bills: new Set<string>(), iphone: 0, dow: d.getDay() };
    cur.baht += bahtOf(r);
    const doc = String(r["Doc No"] ?? r.doc_no ?? r.docNo ?? "").trim();
    if (doc) cur.bills.add(doc);
    if (/^iphone$/i.test(String(r["Category (Name)"] ?? "").trim())) cur.iphone += num(r.Number ?? r.number ?? r.qty ?? 1) || 1;
    m.set(ymd, cur);
  }
  const days: DailySalesDay[] = Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ymd, v]) => ({ ymd, dow: v.dow, baht: v.baht, bills: v.bills.size, iphone: v.iphone }));
  const n = days.length || 1;
  const totalBaht = days.reduce((s, d) => s + d.baht, 0);
  const totalBills = days.reduce((s, d) => s + d.bills, 0);
  const totalIphone = days.reduce((s, d) => s + d.iphone, 0);
  const avgByDow: Array<number | null> = Array.from({ length: 7 }, (_, dow) => {
    const xs = days.filter((d) => d.dow === dow);
    return xs.length ? xs.reduce((s, d) => s + d.baht, 0) / xs.length : null;
  });
  return {
    days,
    totalBaht,
    totalBills,
    totalIphone,
    avgBaht: totalBaht / n,
    avgBills: totalBills / n,
    avgIphone: totalIphone / n,
    avgByDow,
  };
}
