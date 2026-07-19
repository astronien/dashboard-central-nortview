// Sales run-rate engine.
//
// From the Current sales rows it computes how fast each category/product
// is selling (units per day), projects month-end units, and — when a
// stock-on-hand map is supplied — how many days of cover are left and
// when to reorder. Stock is optional so the sales-velocity half works
// today; feed a stock file/API later to light up the cover columns.

import type { RawRow } from "./salesAggregations";

const toUnits = (v: unknown): number =>
  Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;

export type GetCategoryFn = (row: RawRow) => string;

export interface RunRateRow {
  key: string;
  label: string;
  /** secondary label, e.g. category for a product row */
  sub?: string;
  units: number;
  unitsPerDay: number;
  projectedUnits: number;
  sharePct: number;
  /** only when a stock map is supplied */
  stock?: number;
  coverDays?: number | null;
  reorderFlag?: boolean;
}

export interface RunRateResult {
  daysElapsed: number;
  totalDays: number;
  totalUnits: number;
  categories: RunRateRow[];
  products: RunRateRow[];
}

export interface RunRateOptions {
  daysElapsed: number;
  totalDays: number;
  /** product-name → units on hand (optional) */
  stockByProduct?: Record<string, number>;
  /** reorder alert threshold in days of cover (default 14) */
  reorderDays?: number;
}

export function computeRunRate(
  rows: RawRow[],
  getCategory: GetCategoryFn,
  opts: RunRateOptions,
): RunRateResult {
  const days = Math.max(1, opts.daysElapsed || 1);
  const totalDays = Math.max(days, opts.totalDays || days);
  const reorderDays = opts.reorderDays ?? 14;
  const stock = opts.stockByProduct;

  const catAgg = new Map<string, number>();
  const prodAgg = new Map<string, { units: number; category: string }>();

  for (const row of rows) {
    const units = toUnits(row["Number"] ?? row.number ?? row.qty);
    if (units <= 0) continue;
    const cat = getCategory(row) || "อื่นๆ";
    catAgg.set(cat, (catAgg.get(cat) ?? 0) + units);

    const name = String(
      row["Product (Name)"] ?? row.product_name ?? row.Product ?? "",
    ).trim();
    if (name) {
      const cur = prodAgg.get(name) ?? { units: 0, category: cat };
      cur.units += units;
      prodAgg.set(name, cur);
    }
  }

  const totalUnits = Array.from(catAgg.values()).reduce((s, v) => s + v, 0) || 1;

  const mkRow = (
    key: string,
    label: string,
    units: number,
    sub?: string,
  ): RunRateRow => {
    const unitsPerDay = units / days;
    const row: RunRateRow = {
      key,
      label,
      sub,
      units,
      unitsPerDay,
      projectedUnits: Math.round(unitsPerDay * totalDays),
      sharePct: (units / totalUnits) * 100,
    };
    if (stock && key in stock) {
      const onHand = Number(stock[key]) || 0;
      row.stock = onHand;
      row.coverDays = unitsPerDay > 0 ? onHand / unitsPerDay : null;
      row.reorderFlag = row.coverDays != null && row.coverDays <= reorderDays;
    }
    return row;
  };

  const categories = Array.from(catAgg.entries())
    .map(([cat, units]) => mkRow(cat, cat, units))
    .sort((a, b) => b.unitsPerDay - a.unitsPerDay);

  const products = Array.from(prodAgg.entries())
    .map(([name, v]) => mkRow(name, name, v.units, v.category))
    .sort((a, b) => b.unitsPerDay - a.unitsPerDay);

  return { daysElapsed: days, totalDays, totalUnits, categories, products };
}
