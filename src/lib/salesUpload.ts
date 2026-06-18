import * as XLSX from "xlsx";
import type { RawRow } from "./dashboardUtils";

/**
 * Parse an Excel/CSV sales export into a normalized RawRow[].
 *
 * Headers in the wild are messy — this parser:
 *   - trims leading/trailing whitespace from every header (the "  " column
 *     we saw in Current May26.xlsx is a real example)
 *   - maps known synonyms to canonical field names (Product (Name) vs
 *     product_name vs ProductName, etc.)
 *   - falls back to "" for missing fields
 *
 * Output row shape matches what the existing dashboard code (wonderConfig,
 * reportBuilder, kpiCategoryAdapter) expects to find under canonical keys
 * like "Product (Name)", "Category (Name)", "ราคาขายตามบิล", "Customer Code", etc.
 */

const ALIASES = {
  productCode: ["Product (Code)", "product_code", "ProductCode", "Product (Code) "],
  productName: ["Product (Name)", "product_name", "ProductName", "Product (Name) "],
  number: ["Number", "number", "qty", "quantity"],
  totalPrice: ["Total Price", "totalPrice", "Total_Price", "Total Price "],
  sellingPrice: ["ราคาจำหน่าย", "selling_price", "Selling Price"],
  billAmount: ["ราคาขายตามบิล", "bill_amount", "Bill Amount"],
  category: ["Category (Name)", "category", "category_name", "Cat", "Category (Name) "],
  subCategory: ["Sub Category", "sub_category", "SubCategory", "subcategory", "Sub Category "],
  brand: ["Brand", "brand", "Brands", "Brand Name", "Brand "],
  model: ["Model", "model", "Models", "Model Name", "Model "],
  customerCode: [
    "Customer (Code)",
    "Customer Code",
    "customer_code",
    "customerCodes",
    "CustomerCode",
    "Cust Code",
    "Customer (Code) ",
  ],
  branch: ["Branch (Name)", "BRANCH NAME", "branch_name", "Branch", "Branch (Name) "],
  branchId: ["Branch (ID)", "Branch ID", "branch_id", "Branch (ID) "],
  officer: ["Officer (Name)", "Officer Name", "officer_name", "Officer", "Officer (Name) "],
  officerId: ["Officer (ID)", "Officer ID", "officer_id", "Officer (ID) "],
  docNo: ["Doc No", "doc_no", "DocNo", "Doc No "],
  docDate: ["Doc Date", "doc_date", "DocDate", "Doc Date "],
  customerName: ["Customer (Name)", "Customer Name", "customer_name", "Customer (Name) "],
  productType: ["Product Type", "product_type", "ProductType", "Product Type "],
  docType: ["Doc Type", "doc_type", "DocType", "Doc Type "],
  serial: ["Serial", "serial", "Serial Number", "SN"],
} as const;

const pickField = (row: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return "";
};

const pickFieldOrUndefined = (row: Record<string, unknown>, keys: readonly string[]): string | undefined => {
  const v = pickField(row, keys);
  return v !== "" ? v : undefined;
};

const workbookToRows = (workbook: XLSX.WorkBook): RawRow[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rawRows.map((raw) => {
    // Normalize: trim every header key so "  " (leading whitespace) matches
    // "Product (Code)" exactly.
    const norm: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      norm[k.trim()] = v;
    }

    return {
      "Product (Code)": pickField(norm, ALIASES.productCode),
      "Product (Name)": pickField(norm, ALIASES.productName),
      "Number": pickField(norm, ALIASES.number),
      "Total Price": pickFieldOrUndefined(norm, ALIASES.totalPrice),
      "ราคาจำหน่าย": pickFieldOrUndefined(norm, ALIASES.sellingPrice),
      "ราคาขายตามบิล": pickFieldOrUndefined(norm, ALIASES.billAmount),
      "Category (Name)": pickField(norm, ALIASES.category),
      "Sub Category": pickField(norm, ALIASES.subCategory),
      "Brand": pickField(norm, ALIASES.brand),
      "Model": pickField(norm, ALIASES.model),
      "Customer Code": pickField(norm, ALIASES.customerCode),
      "Branch (Name)": pickField(norm, ALIASES.branch),
      "Branch (ID)": pickField(norm, ALIASES.branchId),
      "Officer (Name)": pickField(norm, ALIASES.officer),
      "Officer (ID)": pickField(norm, ALIASES.officerId),
      "Doc No": pickField(norm, ALIASES.docNo),
      "Doc Date": pickField(norm, ALIASES.docDate),
      "Customer (Name)": pickField(norm, ALIASES.customerName),
      "Product Type": pickField(norm, ALIASES.productType) || "Inventory Item",
      "Doc Type": pickField(norm, ALIASES.docType),
      "Serial": pickField(norm, ALIASES.serial),
    };
  });
};

export const parseSalesExcelFile = async (file: File): Promise<RawRow[]> => {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  const workbook =
    lower.endsWith(".csv") || lower.endsWith(".txt")
      ? XLSX.read(new TextDecoder().decode(buffer), { type: "string" })
      : XLSX.read(buffer, { type: "array" });
  return workbookToRows(workbook);
};

/**
 * For testing only — exposes the row-normalization step so unit tests
 * can pass a synthetic workbook without round-tripping through File.
 */
export const _internalNormalize = workbookToRows;
