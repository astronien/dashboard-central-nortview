import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { _internalNormalize as normalizeSales } from "./salesUpload";

const makeWorkbook = (rows: Record<string, unknown>[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.book_new().Sheets
    ? { Sheets: { Sheet1: ws }, SheetNames: ["Sheet1"] }
    : (() => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        return wb;
      })();
};

const buildWorkbook = (rows: Record<string, unknown>[]) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
};

describe("parseSalesExcelFile (via _internalNormalize)", () => {
  it("returns [] for an empty workbook", () => {
    const wb = XLSX.utils.book_new();
    const result = normalizeSales(wb);
    assert.equal(result.length, 0);
  });

  it("trims leading/trailing whitespace in headers", () => {
    // Reproduce the real Current May26 issue: first header is "  " (just whitespace)
    const wb = buildWorkbook([
      {
        " ": "01 035 0088", // leading-space header
        "Product (Name)": "iPhone 16 Pro",
        "Number": "1",
        "ราคาขายตามบิล": "40000",
        "Category (Name)": "iPhone",
        "Sub Category": "IPHONE 16 PRO",
        "Brand": "APPLE",
      },
    ]);
    const [row] = normalizeSales(wb);
    // The trimmed key " " (single space) doesn't match our canonical
    // "Product (Code)" alias directly, so it stays empty. But the
    // product name and category MUST survive.
    assert.equal(row["Product (Name)"], "iPhone 16 Pro");
    assert.equal(row["Category (Name)"], "iPhone");
    assert.equal(row["Sub Category"], "IPHONE 16 PRO");
    assert.equal(row["Brand"], "APPLE");
    assert.equal(row["Number"], "1");
    assert.equal(row["ราคาขายตามบิล"], "40000");
  });

  it("maps Customer (Code) → Customer Code", () => {
    const wb = buildWorkbook([
      {
        "Category (Name)": "iPhone",
        "Product (Name)": "iPhone 16",
        "Customer (Code)": "UFUND PERSONAL",
        "Number": "1",
      },
    ]);
    const [row] = normalizeSales(wb);
    assert.equal(row["Customer Code"], "UFUND PERSONAL");
  });

  it("falls back to empty string for missing fields", () => {
    const wb = buildWorkbook([
      {
        "Category (Name)": "iPhone",
        "Product (Name)": "iPhone 16",
      },
    ]);
    const [row] = normalizeSales(wb);
    assert.equal(row["Category (Name)"], "iPhone");
    assert.equal(row["Product (Name)"], "iPhone 16");
    assert.equal(row["Brand"], "");
    assert.equal(row["Customer Code"], "");
    assert.equal(row["Number"], "");
    assert.equal(row["ราคาขายตามบิล"], undefined);
    // Product Type defaults to "Inventory Item" when missing
    assert.equal(row["Product Type"], "Inventory Item");
  });

  it("uses first sheet when workbook has multiple", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ "Category (Name)": "iPhone", "Product (Name)": "row1" }]),
      "Sheet1",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ "Category (Name)": "Mac", "Product (Name)": "row2" }]),
      "Sheet2",
    );
    const result = normalizeSales(wb);
    assert.equal(result.length, 1);
    assert.equal(result[0]["Product (Name)"], "row1");
  });

  it("extracts all 17 sales fields from a complete row", () => {
    const wb = buildWorkbook([
      {
        "Product (Code)": "PC001",
        "Product (Name)": "iPhone 16 Pro",
        "Number": "2",
        "Total Price": "80000",
        "ราคาขายตามบิล": "40000",
        "Category (Name)": "iPhone",
        "Sub Category": "IPHONE 16 PRO",
        "Brand": "APPLE",
        "Model": "iPhone16,2",
        "Customer Code": "GNR",
        "Branch (Name)": "ID114 : Studio 7-Central-Ladprao",
        "Branch (ID)": "114",
        "Officer (Name)": "กิ่งกาญจน์",
        "Officer (ID)": "25293",
        "Doc No": "1011952",
        "Doc Date": "จ. 01/06/2026 16:57:28",
        "Customer (Name)": "ลูกค้าบุคคลทั่วไป",
      },
    ]);
    const [row] = normalizeSales(wb);
    assert.equal(row["Product (Code)"], "PC001");
    assert.equal(row["Product (Name)"], "iPhone 16 Pro");
    assert.equal(row["Number"], "2");
    assert.equal(row["Total Price"], "80000");
    assert.equal(row["ราคาขายตามบิล"], "40000");
    assert.equal(row["Category (Name)"], "iPhone");
    assert.equal(row["Sub Category"], "IPHONE 16 PRO");
    assert.equal(row["Brand"], "APPLE");
    assert.equal(row["Model"], "iPhone16,2");
    assert.equal(row["Customer Code"], "GNR");
    assert.equal(row["Branch (Name)"], "ID114 : Studio 7-Central-Ladprao");
    assert.equal(row["Branch (ID)"], "114");
    assert.equal(row["Officer (Name)"], "กิ่งกาญจน์");
    assert.equal(row["Officer (ID)"], "25293");
    assert.equal(row["Doc No"], "1011952");
    assert.equal(row["Doc Date"], "จ. 01/06/2026 16:57:28");
    assert.equal(row["Customer (Name)"], "ลูกค้าบุคคลทั่วไป");
  });

  // suppress unused warning for helper above
  it("(helper)", () => {
    const wb = makeWorkbook([]);
    assert.ok(wb);
  });
});
