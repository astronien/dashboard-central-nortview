// Sales run-rate engine.
//
// From the Current sales rows it computes how fast each category/product
// is selling (units per day), projects month-end units, and — when a
// stock-on-hand map is supplied — how many days of cover are left, when to
// reorder, and (with unit costs) how much cash is tied up. Velocity can be
// measured over the whole month-to-date or a recent window (e.g. last 7
// days) so promos/seasonality don't distort it.

import type { RawRow } from "./salesAggregations";
import { parseDocDate } from "./dateParser";

const DAY_MS = 86_400_000;

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
  /** only when unit costs are supplied: stock × unit cost */
  stockValue?: number;
}

export interface RunRateResult {
  daysElapsed: number;
  totalDays: number;
  totalUnits: number;
  /** how velocity was measured */
  windowLabel: string;
  categories: RunRateRow[];
  products: RunRateRow[];
}

export interface RunRateOptions {
  daysElapsed: number;
  totalDays: number;
  /** product-name/code → units on hand (optional) */
  stockByProduct?: Record<string, number>;
  /** product-name/code → unit cost (optional, for cash-tied-up) */
  costByProduct?: Record<string, number>;
  /** reorder alert threshold in days of cover (default 14) */
  reorderDays?: number;
  /** measure velocity over the last N days of data instead of MTD */
  windowDays?: number;
}

export function computeRunRate(
  rows: RawRow[],
  getCategory: GetCategoryFn,
  opts: RunRateOptions,
): RunRateResult {
  const mtdDays = Math.max(1, opts.daysElapsed || 1);
  const totalDays = Math.max(mtdDays, opts.totalDays || mtdDays);
  const reorderDays = opts.reorderDays ?? 14;
  const stock = opts.stockByProduct;
  const cost = opts.costByProduct;

  // Optionally restrict to the most recent `windowDays` days of data.
  let workRows = rows;
  let days = mtdDays;
  let windowLabel = `ทั้งเดือน (${mtdDays}/${totalDays} วัน)`;
  if (opts.windowDays && opts.windowDays > 0) {
    const w = Math.min(opts.windowDays, mtdDays);
    let latest = 0;
    for (const row of rows) {
      const p = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
      if (p) latest = Math.max(latest, p.getTime());
    }
    if (latest > 0) {
      const cutoff = latest - (w - 1) * DAY_MS - DAY_MS / 2;
      workRows = rows.filter((row) => {
        const p = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
        return p ? p.getTime() >= cutoff : false;
      });
      days = w;
      windowLabel = `${w} วันล่าสุด`;
    }
  }

  const catAgg = new Map<string, number>();
  const prodAgg = new Map<string, { units: number; category: string; code: string }>();

  for (const row of workRows) {
    const units = toUnits(row["Number"] ?? row.number ?? row.qty);
    if (units <= 0) continue;
    const cat = getCategory(row) || "อื่นๆ";
    catAgg.set(cat, (catAgg.get(cat) ?? 0) + units);

    const name = String(
      row["Product (Name)"] ?? row.product_name ?? row.Product ?? "",
    ).trim();
    const code = String(row["Product (Code)"] ?? row.product_code ?? "").trim();
    if (name) {
      const cur = prodAgg.get(name) ?? { units: 0, category: cat, code };
      cur.units += units;
      if (!cur.code && code) cur.code = code;
      prodAgg.set(name, cur);
    }
  }

  const totalUnits = Array.from(catAgg.values()).reduce((s, v) => s + v, 0) || 1;

  const lookup = (map: Record<string, number> | undefined, candidates: string[]) => {
    if (!map) return undefined;
    for (const c of candidates) if (c && c in map) return Number(map[c]) || 0;
    return undefined;
  };

  const mkRow = (
    key: string,
    label: string,
    units: number,
    candidates: string[],
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
    const onHand = lookup(stock, candidates);
    if (onHand !== undefined) {
      row.stock = onHand;
      row.coverDays = unitsPerDay > 0 ? onHand / unitsPerDay : null;
      row.reorderFlag = row.coverDays != null && row.coverDays <= reorderDays;
      const unitCost = lookup(cost, candidates);
      if (unitCost !== undefined) row.stockValue = onHand * unitCost;
    }
    return row;
  };

  const categories = Array.from(catAgg.entries())
    .map(([cat, units]) => mkRow(cat, cat, units, [cat]))
    .sort((a, b) => b.unitsPerDay - a.unitsPerDay);

  const products = Array.from(prodAgg.entries())
    .map(([name, v]) => mkRow(name, name, v.units, [name, v.code], v.category))
    .sort((a, b) => b.unitsPerDay - a.unitsPerDay);

  return { daysElapsed: days, totalDays, totalUnits, windowLabel, categories, products };
}

// ── derived worklists (stock required) ─────────────────────────────────

export interface ReorderItem {
  label: string;
  sub?: string;
  stock: number;
  unitsPerDay: number;
  coverDays: number;
  /** units to order so cover reaches targetCoverDays */
  suggestQty: number;
}

/** Products whose cover is at/under lead time → order now. */
export function buildReorderList(
  products: RunRateRow[],
  leadDays: number,
  targetCoverDays: number,
): ReorderItem[] {
  return products
    .filter(
      (p) =>
        p.stock != null &&
        p.coverDays != null &&
        p.unitsPerDay > 0 &&
        p.coverDays <= leadDays,
    )
    .map((p) => {
      const need = Math.ceil(p.unitsPerDay * targetCoverDays - (p.stock ?? 0));
      return {
        label: p.label,
        sub: p.sub,
        stock: p.stock ?? 0,
        unitsPerDay: p.unitsPerDay,
        coverDays: p.coverDays as number,
        suggestQty: Math.max(0, need),
      };
    })
    .sort((a, b) => a.coverDays - b.coverDays);
}

export interface DeadStockItem {
  label: string;
  sub?: string;
  stock: number;
  unitsPerDay: number;
  coverDays: number | null;
  stockValue?: number;
}

/** Products with stock but (almost) no sales → cash sitting still. */
export function buildDeadStock(
  products: RunRateRow[],
  deadCoverDays: number,
): DeadStockItem[] {
  return products
    .filter(
      (p) =>
        p.stock != null &&
        p.stock > 0 &&
        (p.coverDays == null || p.coverDays >= deadCoverDays),
    )
    .map((p) => ({
      label: p.label,
      sub: p.sub,
      stock: p.stock ?? 0,
      unitsPerDay: p.unitsPerDay,
      coverDays: p.coverDays ?? null,
      stockValue: p.stockValue,
    }))
    .sort((a, b) => (b.stockValue ?? b.stock) - (a.stockValue ?? a.stock));
}
