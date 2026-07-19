import * as XLSX from "xlsx";

// Parse a stock-on-hand Excel/CSV export into { productKey → qty }.
// The exact columns aren't known yet, so headers are matched flexibly by
// keyword (Thai + English). We capture a product identifier (name and/or
// code/SKU/barcode) and a quantity, keyed by BOTH name and code so the
// run-rate engine can match sales rows by either.

const NAME_KEYS = [
  "product (name)",
  "product name",
  "productname",
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
  "sku",
  "barcode",
  "รหัสสินค้า",
  "รหัส",
  "article",
];
const QTY_KEYS = [
  "qty",
  "quantity",
  "stock",
  "on hand",
  "onhand",
  "balance",
  "คงเหลือ",
  "จำนวน",
  "สต็อก",
  "ยอดคงเหลือ",
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

export interface StockParseResult {
  ok: boolean;
  error?: string;
  itemCount: number;
  /** productName/code (raw string) → qty on hand */
  stockMap: Record<string, number>;
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
      return { ok: false, error: "ไฟล์ว่างเปล่า", itemCount: 0, stockMap: {}, sample: [] };
    }

    const headers = Object.keys(rows[0]);
    const nameH = findHeader(headers, NAME_KEYS);
    const codeH = findHeader(headers, CODE_KEYS);
    const qtyH = findHeader(headers, QTY_KEYS);

    if (!qtyH || (!nameH && !codeH)) {
      return {
        ok: false,
        error: `หาคอลัมน์ไม่เจอ — ต้องมีคอลัมน์จำนวนคงเหลือ และชื่อ/รหัสสินค้า (คอลัมน์ที่พบ: ${headers.join(", ")})`,
        itemCount: 0,
        stockMap: {},
        sample: [],
      };
    }

    const stockMap: Record<string, number> = {};
    let count = 0;
    for (const r of rows) {
      const qty = toQty(qtyH ? r[qtyH] : 0);
      const name = nameH ? String(r[nameH] ?? "").trim() : "";
      const code = codeH ? String(r[codeH] ?? "").trim() : "";
      if (!name && !code) continue;
      // sum in case the same product appears in multiple rows
      if (name) stockMap[name] = (stockMap[name] ?? 0) + qty;
      if (code) stockMap[code] = (stockMap[code] ?? 0) + qty;
      count += 1;
    }

    const sample = Object.entries(stockMap)
      .slice(0, 5)
      .map(([key, qty]) => ({ key, qty }));

    return { ok: true, itemCount: count, stockMap, sample };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      itemCount: 0,
      stockMap: {},
      sample: [],
    };
  }
}
