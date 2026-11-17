/**
 * ตั้งค่าของหน้า Run Rate ต่อสาขา (จำไว้ในเครื่อง): หมวด/สินค้าที่ไม่นับ,
 * ของมาถึงในกี่วัน, สั่งให้พอขายกี่วัน, เกณฑ์ของค้าง, เตือนล่วงหน้ากี่วัน
 */
import type { RunRateResult, RunRateRow } from "./runRate";

export type RunRatePrefs = {
  excludedCats: string[];
  excludedProducts: string[];
  /** ของมาถึงในกี่วันหลังสั่ง */
  leadDays: number;
  /** สั่งให้พอขายกี่วัน */
  targetCover: number;
  /** พอขายเกินกี่วัน = ของค้าง */
  deadCover: number;
  /** เตือนล่วงหน้ากี่วันก่อนถึงวันต้องสั่ง */
  warnDays: number;
};

export const DEFAULT_RUNRATE_PREFS: RunRatePrefs = {
  excludedCats: [],
  excludedProducts: [],
  leadDays: 14,
  targetCover: 30,
  deadCover: 90,
  warnDays: 7,
};

const keyOf = (branch: string) => `runrate-prefs:${branch || "default"}`;

export function loadRunRatePrefs(branch: string): RunRatePrefs {
  try {
    const raw = localStorage.getItem(keyOf(branch));
    if (!raw) return { ...DEFAULT_RUNRATE_PREFS };
    return { ...DEFAULT_RUNRATE_PREFS, ...(JSON.parse(raw) as Partial<RunRatePrefs>) };
  } catch {
    return { ...DEFAULT_RUNRATE_PREFS };
  }
}

export function saveRunRatePrefs(branch: string, prefs: RunRatePrefs) {
  try {
    localStorage.setItem(keyOf(branch), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** ตัดหมวด/สินค้าที่ติ๊กไม่นับออกจากผล Run Rate */
export function applyRunRateExclusions(data: RunRateResult, prefs: RunRatePrefs): RunRateResult {
  if (!prefs.excludedCats.length && !prefs.excludedProducts.length) return data;
  const cats = new Set(prefs.excludedCats);
  const prods = new Set(prefs.excludedProducts);
  const categories = data.categories.filter((c) => !cats.has(c.label));
  const totalUnits = categories.reduce((s, c) => s + c.units, 0);
  return {
    ...data,
    totalUnits,
    categories: categories.map((c) => ({ ...c, sharePct: totalUnits > 0 ? (c.units / totalUnits) * 100 : 0 })),
    products: data.products.filter((p) => !(p.sub && cats.has(p.sub)) && !prods.has(p.label)),
  };
}

export type UpcomingReorder = {
  label: string;
  sub?: string;
  stock: number;
  unitsPerDay: number;
  coverDays: number;
  /** ต้องสั่งภายในกี่วัน (พอขาย − ของมาถึง) */
  orderInDays: number;
  suggestQty: number;
};

/** ใกล้ถึงวันต้องสั่ง: ยังพอขายเกินระยะของมาถึง แต่เหลืออีกไม่เกิน warnDays วัน */
export function buildUpcomingReorder(products: RunRateRow[], prefs: RunRatePrefs): UpcomingReorder[] {
  return products
    .filter(
      (p) =>
        p.stock != null &&
        p.coverDays != null &&
        p.unitsPerDay > 0 &&
        p.coverDays > prefs.leadDays &&
        p.coverDays <= prefs.leadDays + prefs.warnDays,
    )
    .map((p) => ({
      label: p.label,
      sub: p.sub,
      stock: p.stock ?? 0,
      unitsPerDay: p.unitsPerDay,
      coverDays: p.coverDays as number,
      orderInDays: Math.max(0, Math.floor((p.coverDays as number) - prefs.leadDays)),
      suggestQty: Math.max(0, Math.ceil(p.unitsPerDay * prefs.targetCover - (p.stock ?? 0))),
    }))
    .sort((a, b) => a.orderInDays - b.orderInDays);
}
