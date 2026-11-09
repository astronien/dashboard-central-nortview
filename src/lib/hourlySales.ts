/**
 * ยอดขายเฉลี่ยรายชั่วโมงของวัน (ตลอดทั้งเดือน) — ใช้หาช่วงเวลาที่ขายดี
 * เวลาเอาจาก "Create Time" (ถ้าไม่มีใช้ "Doc Date" ที่มีเวลาติดมา)
 */
import { parseDocDate } from "./dateParser";

type Row = Record<string, unknown>;

export type HourlyPoint = {
  hour: number;
  /** ยอดเฉลี่ยต่อวัน (บาท) ในชั่วโมงนี้ */
  avgBaht: number;
  /** จำนวนบิลเฉลี่ยต่อวันในชั่วโมงนี้ */
  avgBills: number;
  totalBaht: number;
  totalBills: number;
};

export type HourlySales = {
  points: HourlyPoint[];
  /** จำนวนวันที่มีข้อมูล (ตัวหารของค่าเฉลี่ย) */
  days: number;
  fromDate: string;
  toDate: string;
};

const toNum = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const baht = (r: Row) => toNum(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r.totalPrice);

const hourOf = (r: Row): number | null => {
  const raw = String(r["Create Time"] ?? r["Doc Date"] ?? r["doc date"] ?? "");
  const m = /(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const h = Number(m[1]);
  // 00:00 = ไม่มีเวลาจริง (วันที่อย่างเดียว) → ไม่นับ
  if (h === 0 && m[2] === "00") return null;
  return h >= 0 && h < 24 ? h : null;
};

const dayOf = (r: Row): string => {
  const p = parseDocDate(String(r["Doc Date"] ?? r["doc date"] ?? ""));
  return p
    ? `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`
    : "";
};

export function buildHourlySales(rows: Row[]): HourlySales {
  const baht24 = new Array(24).fill(0);
  const bills24: Array<Set<string>> = Array.from({ length: 24 }, () => new Set<string>());
  const days = new Set<string>();
  for (const r of rows) {
    const h = hourOf(r);
    const d = dayOf(r);
    if (h == null || !d) continue;
    days.add(d);
    baht24[h] += baht(r);
    const doc = String(r["Doc No"] ?? r.doc_no ?? r.docNo ?? r.DocNo ?? "");
    bills24[h].add(doc ? `${d}|${doc}` : `${d}|row${bills24[h].size}`);
  }
  const n = days.size;
  const sorted = Array.from(days).sort();
  // ช่วงชั่วโมงที่มีการขายจริง (เช่น 10–21)
  const active = baht24.map((v, h) => (v !== 0 || bills24[h].size ? h : -1)).filter((h) => h >= 0);
  if (!n || !active.length) return { points: [], days: 0, fromDate: "", toDate: "" };
  const lo = Math.min(...active);
  const hi = Math.max(...active);
  const points: HourlyPoint[] = [];
  for (let h = lo; h <= hi; h++) {
    points.push({
      hour: h,
      avgBaht: baht24[h] / n,
      avgBills: bills24[h].size / n,
      totalBaht: baht24[h],
      totalBills: bills24[h].size,
    });
  }
  return { points, days: n, fromDate: sorted[0], toDate: sorted[sorted.length - 1] };
}
