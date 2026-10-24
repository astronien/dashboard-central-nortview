/**
 * หมวดย่อยใหม่ที่ Category Master ยังไม่มี (เช่น CASING IPHONE 18 PRO MAX,
 * CAMERA FILM) — หาให้เจอ, เดาหมวดจาก Sub อื่นใน Category เดียวกัน, และให้
 * ผู้ใช้เลือกเองได้ว่าจะเข้า BTB / BTB(Apple) / อื่นๆ
 *
 * ผลลัพธ์สุดท้ายคือ "แถว Category Master เสริม" ({ Cat & Sub Cat, CAT Daily })
 * ที่ต่อท้าย master จริง → ทุกจุดที่อ่าน master (getCategory, CAT Daily
 * lookup, buildReport) ได้หมวดเดียวกันโดยไม่ต้องแก้ทีละที่
 */
import type { RawRow } from "./salesAggregations";

export type CategoryChoice = "BTB" | "BTB(Apple)" | "Other";
export const CATEGORY_CHOICES: CategoryChoice[] = ["BTB", "BTB(Apple)", "Other"];

/** key ของคู่ Category + Sub Category → หมวดที่ผู้ใช้เลือก */
export type CategoryOverrides = Record<string, CategoryChoice>;

export interface UnmappedCategoryPair {
  key: string;
  category: string;
  subCategory: string;
  /** ยอดเงินในไฟล์ Current (ที่เห็นในตาราง) */
  revenue: number;
  /** ยอดเงินรวมทุกไฟล์ที่ใช้หา (Current / Today / เดือนก่อน / ปีก่อน) */
  totalRevenue: number;
  rows: number;
  /** ยอดเงินแยกยี่ห้อ เรียงมาก → น้อย */
  brands: { brand: string; revenue: number }[];
  /** สัดส่วนยอดเงินที่เป็นยี่ห้อ Apple (0–1) */
  appleShare: number;
  /** หมวดที่ Sub อื่นใน Category เดียวกันใช้ทั้งหมด (null = ไม่มี/ปนกัน) */
  suggestion: CategoryChoice | null;
  /** จำนวน Sub ใน Category เดียวกันที่ master มีอยู่ */
  familySize: number;
}

const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

const toNum = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const rowRevenue = (row: RawRow) =>
  toNum(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? (row as any).totalPrice);

const rowCat = (row: RawRow) =>
  String(row["Category (Name)"] ?? (row as any).category_name ?? (row as any).Category ?? "").trim();
const rowSub = (row: RawRow) =>
  String(row["Sub Category"] ?? (row as any).sub_category ?? (row as any).SubCategory ?? "").trim();

/** หมวดตัวเครื่อง — ยึด Category ดิบ ไม่ผ่าน master อยู่แล้ว */
const RAW_DEVICE_CATS = new Set(["iphone", "ipad", "mac", "apple watch"]);

export const pairKey = (category: string, subCategory: string) => `${norm(category)}||${norm(subCategory)}`;

/** แปลงค่า CAT Daily ใน master ให้เป็นตัวเลือกมาตรฐาน */
export const toCategoryChoice = (catDaily: string): CategoryChoice | null => {
  const s = String(catDaily ?? "").toLowerCase().replace(/[\s()]+/g, "");
  if (!s) return null;
  if (s === "btbapple") return "BTB(Apple)";
  if (s === "btb") return "BTB";
  if (s === "other" || s === "others" || s === "อื่นๆ") return "Other";
  return null;
};

const masterKeyOf = (row: RawRow) => String(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? "").trim();
const masterValueOf = (row: RawRow) => String(row["CAT Daily"] ?? "").trim();

/**
 * หาคู่ Category + Sub ในไฟล์ขายที่ master ไม่มี (ไม่นับตัวเครื่อง และไม่นับ
 * คู่ที่ยอดเงินรวมเป็น 0 เช่น ถุง / ของแถม)
 */
export function findUnmappedCategoryPairs(
  sources: { current: RawRow[]; others?: RawRow[][] },
  masterRows: RawRow[],
): UnmappedCategoryPair[] {
  if (!masterRows.length) return [];
  const masterKeys = new Set<string>();
  const masterEntries: { key: string; value: string }[] = [];
  for (const row of masterRows) {
    const k = norm(masterKeyOf(row));
    if (!k) continue;
    masterKeys.add(k);
    masterEntries.push({ key: k, value: masterValueOf(row) });
  }

  type Acc = UnmappedCategoryPair & { brandMap: Map<string, number> };
  const pairs = new Map<string, Acc>();
  const add = (row: RawRow, isCurrent: boolean) => {
    const cat = rowCat(row);
    const sub = rowSub(row);
    if (!cat || RAW_DEVICE_CATS.has(cat.toLowerCase())) return;
    if (masterKeys.has(norm(`${cat}${sub}`)) || masterKeys.has(norm(cat))) return;
    const key = pairKey(cat, sub);
    let p = pairs.get(key);
    if (!p) {
      p = {
        key,
        category: cat,
        subCategory: sub,
        revenue: 0,
        totalRevenue: 0,
        rows: 0,
        brands: [],
        appleShare: 0,
        suggestion: null,
        familySize: 0,
        brandMap: new Map(),
      };
      pairs.set(key, p);
    }
    const rev = rowRevenue(row);
    if (isCurrent) {
      p.revenue += rev;
      p.rows += 1;
      const brand = String(row.Brand ?? (row as any).brand ?? "").trim() || "-";
      p.brandMap.set(brand, (p.brandMap.get(brand) ?? 0) + rev);
    }
    p.totalRevenue += rev;
  };
  sources.current.forEach((r) => add(r, true));
  (sources.others ?? []).forEach((rows) => rows.forEach((r) => add(r, false)));

  const out: UnmappedCategoryPair[] = [];
  for (const p of pairs.values()) {
    if (p.totalRevenue <= 0) continue;
    const catKey = norm(p.category);
    const family = masterEntries.filter((e) => e.key.startsWith(catKey));
    const choices = new Set(family.map((e) => toCategoryChoice(e.value) ?? `raw:${e.value}`));
    const only = choices.size === 1 ? [...choices][0] : null;
    const brands = [...p.brandMap.entries()]
      .map(([brand, revenue]) => ({ brand, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    const brandTotal = brands.reduce((s, b) => s + Math.max(0, b.revenue), 0);
    const appleRev = brands
      .filter((b) => /^apple$/i.test(b.brand))
      .reduce((s, b) => s + Math.max(0, b.revenue), 0);
    const { brandMap: _drop, ...rest } = p;
    out.push({
      ...rest,
      brands,
      appleShare: brandTotal > 0 ? appleRev / brandTotal : 0,
      suggestion: only && !only.startsWith("raw:") ? (only as CategoryChoice) : null,
      familySize: family.length,
    });
  }
  return out.sort((a, b) => b.revenue - a.revenue || b.totalRevenue - a.totalRevenue);
}

/** หมวดที่จะใช้จริง: ที่ผู้ใช้เลือก > ที่ระบบเดาจาก Category เดียวกัน */
export const effectiveChoice = (pair: UnmappedCategoryPair, overrides: CategoryOverrides): CategoryChoice | null =>
  overrides[pair.key] ?? pair.suggestion;

/** แถว master เสริมสำหรับคู่ที่ยังไม่มีใน master (ต่อท้าย master จริงได้เลย) */
export function buildFallbackMasterRows(pairs: UnmappedCategoryPair[], overrides: CategoryOverrides): RawRow[] {
  const rows: RawRow[] = [];
  for (const p of pairs) {
    const choice = effectiveChoice(p, overrides);
    if (!choice) continue;
    rows.push({
      "Cat & Sub Cat": `${p.category}${p.subCategory}`,
      "CAT Daily": choice,
      __fallback: overrides[p.key] ? "user" : "auto",
    } as RawRow);
  }
  return rows;
}
