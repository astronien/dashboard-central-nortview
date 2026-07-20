import * as XLSX from "xlsx";

// Parse a stock-on-hand Excel/CSV export into { productKey → qty }.
// The exact columns aren't known yet, so headers are matched flexibly by
// keyword (Thai + English). We capture a product identifier (name and/or
// code/SKU/barcode) and a quantity, keyed by BOTH name and code so the
// run-rate engine can match sales rows by either.

// Note: findHeader matches EXACT first, then "contains". Keep exact tokens
// (e.g. "name", "product", "number") so short headers like the COM7 stock
// export (Product / Name / Number) resolve correctly before any fuzzy hit.
const NAME_KEYS = [
  "product (name)",
  "product name",
  "productname",
  "name",
  "ชื่อสินค้า",
  "สินค้า",
  "description",
  "item",
  "รายการ",
];
const CODE_KEYS = [
  "product (code)",
  "product code",
  "productcode",
  "product",
  "sku",
  "barcode",
  "รหัสสินค้า",
  "รหัส",
  "article",
];
const QTY_KEYS = [
  "number",
  "qty",
  "quantity",
  "stock",
  "on hand",
  "onhand",
  "balance",
  "คงเหลือ",
  "จำนวนคงเหลือ",
  "จำนวน",
  "สต็อก",
  "ยอดคงเหลือ",
];
const COST_KEYS = [
  "cost",
  "unit cost",
  "avg cost",
  "average cost",
  "ต้นทุน",
  "ทุน",
  "ต้นทุนต่อหน่วย",
  "cost price",
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const findHeader = (headers: string[], keys: string[]): string | null => {
  // exact-ish match first
  for (const h of headers) {
    const n = norm(h);
    if (keys.includes(n)) return h;
  }
  // then contains
  for (const h of headers) {
    const n = norm(h);
    if (keys.some((k) => n.includes(k))) return h;
  }
  return null;
};

const toQty = (v: unknown): number =>
  Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;

export interface StockItem {
  name: string;
  code: string;
  qty: number;
}

export interface StockParseResult {
  ok: boolean;
  error?: string;
  itemCount: number;
  /** productName/code (raw string) → qty on hand */
  stockMap: Record<string, number>;
  /** productName/code → unit cost (empty if no cost column) */
  costMap: Record<string, number>;
  /** one entry per product (deduped) — lets the run-rate view show
   *  stock items that had zero sales this period (true dead stock) */
  items: StockItem[];
  hasCost: boolean;
  sample: { key: string; qty: number }[];
}

export async function parseStockExcelFile(file: File): Promise<StockParseResult> {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      return { ok: false, error: "ไม่พบชีตในไฟล์", itemCount: 0, stockMap: {}, sample: [] };
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    if (rows.length === 0) {
      return { ok: false, error: "ไฟล์ว่างเปล่า", itemCount: 0, stockMap: {}, costMap: {}, hasCost: false, sample: [] };
    }

    const headers = Object.keys(rows[0]);
    const nameH = findHeader(headers, NAME_KEYS);
    const codeH = findHeader(headers, CODE_KEYS);
    const qtyH = findHeader(headers, QTY_KEYS);
    const costH = findHeader(headers, COST_KEYS);

    if (!qtyH || (!nameH && !codeH)) {
      return {
        ok: false,
        error: `หาคอลัมน์ไม่เจอ — ต้องมีคอลัมน์จำนวนคงเหลือ และชื่อ/รหัสสินค้า (คอลัมน์ที่พบ: ${headers.join(", ")})`,
        itemCount: 0,
        stockMap: {},
        costMap: {},
        hasCost: false,
        sample: [],
      };
    }

    const stockMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};
    // dedupe products (serialised items repeat one row per serial) by
    // identity = code || name, summing quantity
    const itemMap = new Map<string, StockItem>();
    for (const r of rows) {
      const qty = toQty(qtyH ? r[qtyH] : 0);
      const cost = costH ? toQty(r[costH]) : 0;
      const name = nameH ? String(r[nameH] ?? "").trim() : "";
      const code = codeH ? String(r[codeH] ?? "").trim() : "";
      if (!name && !code) continue;
      // sum in case the same product appears in multiple rows
      if (name) stockMap[name] = (stockMap[name] ?? 0) + qty;
      if (code) stockMap[code] = (stockMap[code] ?? 0) + qty;
      if (costH && cost > 0) {
        if (name) costMap[name] = cost;
        if (code) costMap[code] = cost;
      }
      const id = code || name;
      const cur = itemMap.get(id) ?? { name, code, qty: 0 };
      cur.qty += qty;
      if (!cur.name && name) cur.name = name;
      itemMap.set(id, cur);
    }

    const items = Array.from(itemMap.values());
    const sample = Object.entries(stockMap)
      .slice(0, 5)
      .map(([key, qty]) => ({ key, qty }));

    return {
      ok: true,
      itemCount: items.length,
      stockMap,
      costMap,
      items,
      hasCost: Boolean(costH) && Object.keys(costMap).length > 0,
      sample,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      itemCount: 0,
      stockMap: {},
      costMap: {},
      hasCost: false,
      sample: [],
    };
  }
}
