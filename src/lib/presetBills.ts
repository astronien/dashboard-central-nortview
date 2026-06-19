/**
 * parseBills: group RawRow line items into BillSummary objects
 *
 * Ported from /Users/astronien/Downloads/studio7-sales-dashboard-main/utils/parseBills.ts
 * Adapted from typed SaleLineItem to RawRow (Record<string, primitive>).
 */

import type { RawRow } from "./salesAggregations";

export interface BillSummary {
  docNo: string;
  docDate: Date;
  officerName: string;
  officerId: string;
  branchId: string;
  branchName: string;
  customerCode: string;
  customerName: string;
  totalRevenue: number;
  itemCount: number;
  categories: string[];
  hasIPhone: boolean;
  hasIPad: boolean;
  hasSmile: boolean;
  hasAttach: boolean;
  finish: string;
  lineItems: RawRow[];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date number
    const ms = value > 25569 ? (value - 25569) * 86400 * 1000 : 0;
    return new Date(ms);
  }
  const str = String(value).trim();
  if (!str) return null;

  // Strip Thai day abbreviation prefix (e.g. "พฤ. ", "อา. ", "จ. ") BEFORE
  // any Date parsing, because V8 may misinterpret "01/06/2026" as mm/dd/yyyy
  // (Jan 6) instead of dd/mm/yyyy (Jun 1).
  const stripped = str.replace(/^[^\d]+/, "").trim();

  // Try ISO format "2026-06-17" or "2026-06-17T10:00:00" via native Date
  if (/^\d{4}-\d{2}-\d{2}/.test(stripped)) {
    const d = new Date(stripped);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Try dd/mm/yyyy format (Thai/European format — NOT mm/dd/yyyy)
  // This must come BEFORE any native Date() call on slash-separated strings,
  // because V8 treats "01/06/2026" as mm/dd/yyyy (Jan 6) not dd/mm/yyyy (Jun 1).
  const m = stripped.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const d2 = new Date(year, month, day);
    if (!Number.isNaN(d2.getTime())) return d2;
  }

  // Try dd-mm-yyyy format
  const m2 = stripped.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m2) {
    const d3 = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
    if (!Number.isNaN(d3.getTime())) return d3;
  }

  // Fallback: native Date parse
  const d4 = new Date(stripped);
  if (!Number.isNaN(d4.getTime())) return d4;

  return null;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function readStr(row: RawRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function readNum(row: RawRow, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) {
      return toNumber(v);
    }
  }
  return 0;
}

function isInventoryItem(row: RawRow): boolean {
  // Match source repo: strict "Inventory Item" check only
  const t = readStr(row, "Product Type", "product_type", "ProductType");
  return t === "Inventory Item";
}

function getProductType(row: RawRow): string {
  return readStr(row, "Product Type", "product_type", "ProductType");
}

function getCustomerCode(row: RawRow): string {
  return readStr(row, "Customer (Code)", "customer_code", "CustomerCode", "customerCode");
}

function getCategoryName(row: RawRow): string {
  return readStr(row, "Category (Name)", "category_name", "categoryName", "Category");
}

function getSubCategory(row: RawRow): string {
  return readStr(row, "Sub Category", "sub_category", "subCategory", "SubCategory");
}

function getProductName(row: RawRow): string {
  return readStr(row, "Product (Name)", "product_name", "productName", "Product");
}

function getModel(row: RawRow): string {
  return readStr(row, "Model", "model");
}

function getBrand(row: RawRow): string {
  return readStr(row, "Brand", "brand");
}

function getDocType(row: RawRow): string {
  return readStr(row, "Doc Type", "doc_type", "docType");
}

function getProductCode(row: RawRow): string {
  return readStr(row, "Product (Code)", "product_code", "productCode", "ProductCode");
}

function getSerial(row: RawRow): string {
  return readStr(row, "Serial", "serial");
}

function getCatDaily(row: RawRow): string {
  return readStr(row, "catDaily", "CAT Daily", "CatDaily");
}

function getFinish(row: RawRow): string {
  return readStr(row, "Finish", "finish");
}

function getOfficerName(row: RawRow): string {
  return readStr(row, "Officer (Name)", "officer_name", "officerName", "Officer");
}

function getOfficerId(row: RawRow): string {
  return readStr(row, "STAFF ID", "officer_id", "officerId", "OfficerId");
}

function getBranchId(row: RawRow): string {
  return readStr(row, "Branch (Code)", "branch_id", "branchId");
}

function getBranchName(row: RawRow): string {
  return readStr(row, "Branch (Name)", "branch_name", "branchName", "BRANCH NAME");
}

function getDocNo(row: RawRow): string {
  return readStr(row, "Doc No", "doc_no", "docNo", "DocNo");
}

function getTotalPrice(row: RawRow): number {
  return readNum(
    row,
    "ราคาจำหน่าย",
    "ราคาขายตามบิล",
    "Total Price",
    "totalPrice",
    "Bill Amount",
    "bill_amount",
  );
}

function getQuantity(row: RawRow): number {
  return readNum(row, "Number", "number", "qty", "quantity", "Quantity");
}

function getUnitPrice(row: RawRow): number {
  return readNum(row, "Unit Price", "unitPrice", "unit_price");
}

function getCustomerName(row: RawRow): string {
  return readStr(row, "Customer (Name)", "customer_name", "customerName", "Customer");
}

export function parseBills(lineItems: RawRow[]): BillSummary[] {
  const billMap = new Map<string, RawRow[]>();

  lineItems.forEach((item) => {
    const d = toDate(item["Doc Date"] ?? item.doc_date ?? item.docDate);
    const ym = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : "unknown";
    const key = `${getDocNo(item)}|${getBranchId(item)}|${ym}`;
    if (!billMap.has(key)) {
      billMap.set(key, []);
    }
    billMap.get(key)!.push(item);
  });

  const bills: BillSummary[] = [];
  billMap.forEach((items) => {
    const inventoryItems = items.filter((it) => isInventoryItem(it));
    const totalRevenue = inventoryItems.reduce((sum, it) => sum + getTotalPrice(it), 0);
    const itemCount = inventoryItems.length;
    const categories = [...new Set(items.map((it) => getCategoryName(it)).filter(Boolean))];
    const lower = categories.map((c) => c.toLowerCase());
    const hasIPhone = lower.some((c) => c.includes("iphone"));
    const hasIPad = lower.some((c) => c.includes("ipad"));
    const hasSmile = lower.some((c) => c.includes("smile"));
    const hasAttach = hasSmile && (hasIPhone || hasIPad);

    bills.push({
      docNo: getDocNo(items[0]),
      docDate: toDate(items[0]["Doc Date"] ?? items[0].doc_date) ?? new Date(),
      officerName: getOfficerName(items[0]),
      officerId: getOfficerId(items[0]),
      branchId: getBranchId(items[0]),
      branchName: getBranchName(items[0]),
      customerCode: getCustomerCode(items[0]) || "GNR",
      customerName: getCustomerName(items[0]) || "ลูกค้าทั่วไป",
      totalRevenue,
      itemCount,
      categories,
      hasIPhone,
      hasIPad,
      hasSmile,
      hasAttach,
      finish: getFinish(items[0]),
      lineItems: items,
    });
  });

  return bills;
}

export const ROW_READERS = {
  toDate,
  toNumber,
  readStr,
  readNum,
  isInventoryItem,
  getProductType,
  getCustomerCode,
  getCategoryName,
  getSubCategory,
  getProductName,
  getModel,
  getBrand,
  getDocType,
  getProductCode,
  getSerial,
  getCatDaily,
  getFinish,
  getOfficerName,
  getOfficerId,
  getBranchId,
  getBranchName,
  getDocNo,
  getTotalPrice,
  getQuantity,
  getUnitPrice,
  getCustomerName,
};
