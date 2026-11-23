/**
 * คลังยอดขาย/เป้ารายเดือน (ฝั่งเว็บ) — เก็บถาวรที่ server (/api/trends?resource=archive)
 * - แยกแถวยอดขายเป็นรายเดือนตาม Doc Date
 * - ส่งเป็นชิ้น (~1.2MB) ไฟล์ใหญ่ก็ไม่ติดลิมิต
 * - คิดตัวเลขสรุปของเดือนเก็บไว้ด้วย (หน้าประวัติเปิดเร็ว)
 */
import type { RawRow } from "./salesAggregations";
import { parseDocDate } from "./dateParser";
import { cleanBranchForMatching } from "./matchHelpers";

const API = "/api/trends?resource=archive";

export type MonthSummary = {
  totalBaht: number;
  bills: number;
  iphone: number;
  dayCount: number;
  /** ยอดรายวัน: วันที่ (1–31) → บาท */
  byDay: Record<string, number>;
  byCategory: Record<string, number>;
  byStaff: Record<string, { baht: number; bills: number; iphone: number }>;
  /** เป้า (ถ้ามีคลังเป้าของเดือนนั้น ใส่ตอนอ่าน) */
  target?: number;
};

export type ArchiveMonthMeta = {
  month: string;
  rowCount: number;
  totalBaht: number;
  signature: string | null;
  summary: MonthSummary | null;
  source: string | null;
  updatedAt: string | null;
  targetSignature: string | null;
  targetUpdatedAt: string | null;
};

export const archiveBranchKey = (branch: string) => cleanBranchForMatching(branch) || "default";

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
const bahtOf = (r: RawRow) => num(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r.totalPrice);

export function monthOfRow(r: RawRow): string {
  const d = parseDocDate(String(r["Doc Date"] ?? r["doc date"] ?? ""));
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
}

export function splitByMonth(rows: RawRow[]): Map<string, RawRow[]> {
  const m = new Map<string, RawRow[]>();
  for (const r of rows) {
    const k = monthOfRow(r);
    if (!k) continue;
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return new Map(Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])));
}

export function summarizeMonth(rows: RawRow[], getCategory: (r: RawRow) => string): MonthSummary {
  const byDay: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byStaffSets: Record<string, { baht: number; bills: Set<string>; iphone: number }> = {};
  const bills = new Set<string>();
  let total = 0;
  let iphone = 0;
  for (const r of rows) {
    const b = bahtOf(r);
    total += b;
    const d = parseDocDate(String(r["Doc Date"] ?? r["doc date"] ?? ""));
    if (d) byDay[String(d.getDate())] = (byDay[String(d.getDate())] ?? 0) + b;
    let cat = "อื่นๆ";
    try {
      cat = getCategory(r) || "อื่นๆ";
    } catch {
      /* ignore */
    }
    byCategory[cat] = (byCategory[cat] ?? 0) + b;
    const doc = String(r["Doc No"] ?? r.doc_no ?? "").trim();
    if (doc) bills.add(doc);
    const isIphone = /^iphone$/i.test(String(r["Category (Name)"] ?? "").trim());
    const q = isIphone ? num(r.Number ?? r.number ?? r.qty ?? 1) || 1 : 0;
    iphone += q;
    const staff = String(r["Officer (Name)"] ?? "").trim();
    if (staff) {
      const s = (byStaffSets[staff] ??= { baht: 0, bills: new Set<string>(), iphone: 0 });
      s.baht += b;
      if (doc) s.bills.add(doc);
      s.iphone += q;
    }
  }
  const byStaff: MonthSummary["byStaff"] = {};
  for (const [k, v] of Object.entries(byStaffSets)) byStaff[k] = { baht: v.baht, bills: v.bills.size, iphone: v.iphone };
  return { totalBaht: total, bills: bills.size, iphone, dayCount: Object.keys(byDay).length, byDay, byCategory, byStaff };
}

/** ลายเซ็นข้อมูล — ไม่เปลี่ยน = ไม่ต้องบันทึกซ้ำ */
export function rowsSignature(rows: RawRow[]): string {
  let total = 0;
  for (const r of rows) total += bahtOf(r);
  const last = rows.length ? String(rows[rows.length - 1]["Doc No"] ?? "") : "";
  return `${rows.length}:${Math.round(total)}:${last}`;
}

export function targetSignature(rows: RawRow[]): string {
  let t = 0;
  for (const r of rows) t += num(r.Total);
  return `${rows.length}:${Math.round(t)}`;
}

async function post(body: unknown) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
}

/** บันทึกยอดขายของ 1 เดือนลงคลัง (ทับของเดิมทั้งเดือน) */
export async function saveArchiveMonth(params: {
  branch: string;
  month: string;
  rows: RawRow[];
  summary: MonthSummary;
  source: "auto" | "backfill";
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const { branch, month, rows, summary, source, onProgress } = params;
  const key = archiveBranchKey(branch);
  // แบ่งชิ้นตามขนาด JSON (~1.2MB ต่อชิ้น)
  const chunks: RawRow[][] = [];
  let cur: RawRow[] = [];
  let size = 0;
  for (const r of rows) {
    const s = JSON.stringify(r).length;
    if (cur.length && size + s > 1_200_000) {
      chunks.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(r);
    size += s;
  }
  if (cur.length) chunks.push(cur);

  await post({ action: "begin", branch: key, month });
  for (let i = 0; i < chunks.length; i++) {
    await post({ action: "chunk", branch: key, month, chunk: i, rows: chunks[i] });
    onProgress?.(i + 1, chunks.length);
  }
  await post({
    action: "finish",
    branch: key,
    month,
    rowCount: rows.length,
    totalBaht: summary.totalBaht,
    signature: rowsSignature(rows),
    summary,
    source,
  });
}

export async function saveArchiveTarget(branch: string, month: string, rows: RawRow[]): Promise<void> {
  await post({ action: "target", branch: archiveBranchKey(branch), month, rows, signature: targetSignature(rows) });
}

export async function fetchArchiveList(branch: string): Promise<ArchiveMonthMeta[]> {
  try {
    const r = await fetch(`${API}&action=list&branch=${encodeURIComponent(archiveBranchKey(branch))}`);
    const j = (await r.json()) as { ok?: boolean; months?: ArchiveMonthMeta[] };
    return Array.isArray(j?.months) ? j.months : [];
  } catch {
    return [];
  }
}

export async function fetchArchiveMonth(branch: string, month: string): Promise<RawRow[]> {
  try {
    const r = await fetch(`${API}&action=month&branch=${encodeURIComponent(archiveBranchKey(branch))}&month=${month}`);
    const j = (await r.json()) as { ok?: boolean; rows?: RawRow[] };
    return Array.isArray(j?.rows) ? j.rows : [];
  } catch {
    return [];
  }
}

export async function fetchArchiveTarget(branch: string, month: string): Promise<RawRow[]> {
  try {
    const r = await fetch(`${API}&action=target&branch=${encodeURIComponent(archiveBranchKey(branch))}&month=${month}`);
    const j = (await r.json()) as { ok?: boolean; rows?: RawRow[] };
    return Array.isArray(j?.rows) ? j.rows : [];
  } catch {
    return [];
  }
}

export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabelTh = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit" }).format(new Date(y, m - 1, 1));
};
