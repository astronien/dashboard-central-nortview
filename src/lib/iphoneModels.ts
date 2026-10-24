/**
 * รุ่น iPhone: ใช้ทั้งปุ่ม "ตัด iPhone รุ่น…" (ผู้ใช้ติ๊กเลือกรุ่นที่ไม่นับยอด)
 * และการจัดเครื่อง Demo ให้เข้าหมวด iPhone
 */
import type { RawRow } from "./salesAggregations";

/** สินค้าแนบที่อยู่ใต้ Category "iPhone" เดียวกับตัวเครื่อง (COVER+, ฟิล์ม, เคส ฯลฯ) */
const ATTACH_ITEM_HINT =
  /cover|film|case|care|glass|adapter|cable|sim|pencil|airpod|strap|bag|charger|power|protect|smile|ufund/i;

const MODEL_RE = /iphone\s*(\d{1,2}e?|air|duo|se)(?:\s*(pro\s*max|pro|plus|max|mini))?(?![a-z])/gi;

const formatModel = (gen: string, variant?: string) =>
  ["IPHONE", gen.toUpperCase(), variant ? variant.replace(/\s+/g, " ").toUpperCase() : ""]
    .filter(Boolean)
    .join(" ");

/** ทุกรุ่นที่ข้อความพูดถึง เช่น "Case iPhone 18 Pro Max" → ["IPHONE 18 PRO MAX"] */
export function extractIphoneModels(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text ?? "").matchAll(MODEL_RE)) out.add(formatModel(m[1], m[2]));
  return [...out];
}

/** รุ่นมาตรฐานจาก Sub Category (เช่น "IPHONE 17 PRO MAX") หรือชื่อสินค้า */
export function iphoneModelOf(row: RawRow): string {
  const sub = String(row["Sub Category"] ?? "").trim();
  const fromSub = extractIphoneModels(sub);
  if (fromSub.length && /^iphone/i.test(sub)) return fromSub[0];
  const fromName = extractIphoneModels(`${row["Product (Name)"] ?? ""} ${row.Model ?? ""}`);
  return fromName[0] ?? (sub ? sub.toUpperCase() : "IPHONE");
}

/** รุ่นตระกูล (ใช้จัดกลุ่มในตัวเลือก) เช่น "IPHONE 18 PRO MAX" → "18" */
export const iphoneGenerationOf = (model: string) => {
  const m = /^IPHONE\s+(\d{1,2})/i.exec(model);
  if (m) return m[1];
  const w = /^IPHONE\s+(\S+)/i.exec(model);
  return w ? w[1].toUpperCase() : model;
};

const rawCatOf = (row: RawRow) => String(row["Category (Name)"] ?? (row as any).category_name ?? "").trim();

/** แถวตัวเครื่อง iPhone (ไม่ใช่สินค้าแนบที่อยู่ใต้ Category เดียวกัน) */
export function isIphoneDeviceRow(row: RawRow): boolean {
  if (rawCatOf(row).toLowerCase() !== "iphone") return false;
  const sub = String(row["Sub Category"] ?? "");
  const prod = String(row["Product (Name)"] ?? "");
  return !ATTACH_ITEM_HINT.test(sub) && !ATTACH_ITEM_HINT.test(prod);
}

/** ตัวเครื่อง iPhone ที่อยู่ในรุ่นที่ผู้ใช้เลือกตัดออก */
export function isExcludedIphoneDeviceRow(row: RawRow, excluded: ReadonlySet<string>): boolean {
  if (!excluded.size || !isIphoneDeviceRow(row)) return false;
  return excluded.has(iphoneModelOf(row));
}

/** สินค้าแนบที่ชื่อพูดถึงรุ่นที่ตัดออก (ใช้แยกยอดแนบ "+N (ตัด)") */
export function mentionsExcludedIphoneModel(row: RawRow, excluded: ReadonlySet<string>): boolean {
  if (!excluded.size) return false;
  return extractIphoneModels(String(row["Product (Name)"] ?? (row as any).product_name ?? "")).some((m) =>
    excluded.has(m),
  );
}

export interface IphoneModelOption {
  model: string;
  generation: string;
  units: number;
}

/** รุ่นตัวเครื่อง iPhone ที่มีขายในไฟล์ เรียงรุ่นใหม่ → เก่า */
export function listIphoneModels(rows: RawRow[]): IphoneModelOption[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!isIphoneDeviceRow(r)) continue;
    const m = iphoneModelOf(r);
    const qty = Number(r.Number ?? 1);
    map.set(m, (map.get(m) ?? 0) + (Number.isFinite(qty) && qty > 0 ? qty : 1));
  }
  const genRank = (g: string) => (/^\d+$/.test(g) ? Number(g) : -1);
  return [...map.entries()]
    .map(([model, units]) => ({ model, generation: iphoneGenerationOf(model), units }))
    .sort(
      (a, b) =>
        genRank(b.generation) - genRank(a.generation) ||
        a.generation.localeCompare(b.generation) ||
        a.model.localeCompare(b.model),
    );
}

/** ค่าเดิมของปุ่ม "ตัด iPhone 18" → รุ่นที่เทียบเท่า */
export const LEGACY_IPHONE18_MODELS = [
  "IPHONE 18",
  "IPHONE 18E",
  "IPHONE 18 PLUS",
  "IPHONE 18 PRO",
  "IPHONE 18 PRO MAX",
];

/** ชื่อย่อสำหรับแสดงผล เช่น "IPHONE 18 PRO MAX" → "18 Pro Max" */
export const shortIphoneModel = (model: string) =>
  model
    .replace(/^IPHONE\s*/i, "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/(\d)E\b/g, "$1e") || model;

// ─── เครื่อง Demo ───────────────────────────────────────────────────────────

/** เครื่อง Demo iPhone (เช่น "D7@ Apple iPhone 17 Pro Max 256GB", Category "Apple Demo") */
export function isDemoIphoneRow(row: RawRow): boolean {
  const cat = rawCatOf(row);
  if (cat.toLowerCase() === "iphone") return false;
  const sub = String(row["Sub Category"] ?? "");
  const prod = String(row["Product (Name)"] ?? "");
  const isDemo = /demo/i.test(cat) || /demo/i.test(sub) || /^\s*d7@/i.test(prod);
  if (!isDemo || !/iphone/i.test(prod)) return false;
  return !ATTACH_ITEM_HINT.test(prod);
}

/**
 * ให้เครื่อง Demo iPhone นับเป็นหมวด iPhone: เปลี่ยน Category เป็น "iPhone"
 * และ Sub เป็นรุ่น (เก็บค่าเดิมไว้ใน "Category (Raw)" / "Sub Category (Raw)")
 */
export function normalizeDemoIphoneRows(rows: RawRow[]): RawRow[] {
  let changed = false;
  const out = rows.map((row) => {
    if (!isDemoIphoneRow(row)) return row;
    changed = true;
    const model = extractIphoneModels(String(row["Product (Name)"] ?? ""))[0];
    return {
      ...row,
      "Category (Raw)": row["Category (Name)"],
      "Sub Category (Raw)": row["Sub Category"],
      "Category (Name)": "iPhone",
      ...(model ? { "Sub Category": model } : {}),
    };
  });
  return changed ? out : rows;
}
