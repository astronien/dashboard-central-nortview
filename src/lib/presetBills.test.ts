import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBills, ROW_READERS } from "./presetBills";
import type { RawRow } from "./salesAggregations";

const baseRow = (overrides: Record<string, unknown> = {}): RawRow => ({
  "Doc No": "DOC-1",
  "Doc Date": "2026-05-15",
  "Doc Type": "ใบกำกับภาษี",
  "Officer (Name)": "Officer A",
  "STAFF ID": "EMP1",
  "Branch (Code)": "B1",
  "Branch (Name)": "Branch 1",
  "Customer (Code)": "C1",
  "Customer (Name)": "Customer 1",
  "Category (Name)": "iPhone",
  "Sub Category": "iPhone 15",
  "Product (Name)": "iPhone 15 Pro",
  "Product (Code)": "IP15P",
  "Product Type": "Inventory Item",
  "Number": 1,
  "ราคาจำหน่าย": 40000,
  "Total Price": 40000,
  "Model": "iPhone 15 Pro",
  "Brand": "Apple",
  "Serial": "SN-1",
  ...overrides,
});

describe("ROW_READERS", () => {
  it("toNumber parses numeric strings and strips non-digits", () => {
    assert.equal(ROW_READERS.toNumber("40,000"), 40000);
    assert.equal(ROW_READERS.toNumber("฿12,345.67"), 12345.67);
    assert.equal(ROW_READERS.toNumber(0), 0);
    assert.equal(ROW_READERS.toNumber("abc"), 0);
  });

  it("toDate parses common formats", () => {
    const d = ROW_READERS.toDate("2026-05-15");
    assert.ok(d instanceof Date);
    assert.equal(d?.getFullYear(), 2026);
  });

  it("isInventoryItem returns true for Inventory Item, false for Service", () => {
    assert.equal(ROW_READERS.isInventoryItem(baseRow({ "Product Type": "Inventory Item" })), true);
    assert.equal(ROW_READERS.isInventoryItem(baseRow({ "Product Type": "Service" })), false);
  });

  it("readStr falls back to alternate keys", () => {
    const row: RawRow = { category_name: "iPhone" };
    assert.equal(ROW_READERS.getCategoryName(row), "iPhone");
  });
});

describe("parseBills", () => {
  it("groups rows by Doc No + Branch + YearMonth", () => {
    const rows = [
      baseRow({ "Doc No": "DOC-1", "Total Price": 40000, "ราคาจำหน่าย": 40000 }),
      baseRow({ "Doc No": "DOC-1", "Product (Name)": "AirPods", "Product (Code)": "AP1", "Total Price": 5000, "ราคาจำหน่าย": 5000 }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills.length, 1);
    assert.equal(bills[0].docNo, "DOC-1");
    assert.equal(bills[0].totalRevenue, 45000);
    assert.equal(bills[0].itemCount, 2);
  });

  it("separates bills with same Doc No but different branch", () => {
    const rows = [
      baseRow({ "Doc No": "DOC-1", "Branch (Code)": "B1" }),
      baseRow({ "Doc No": "DOC-1", "Branch (Code)": "B2" }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills.length, 2);
  });

  it("separates bills with same Doc No in different months", () => {
    const rows = [
      baseRow({ "Doc No": "DOC-1", "Doc Date": "2026-05-15" }),
      baseRow({ "Doc No": "DOC-1", "Doc Date": "2026-04-15" }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills.length, 2);
  });

  it("revenue is sum of Inventory Item rows only", () => {
    const rows = [
      baseRow({ "Product Type": "Inventory Item", "Total Price": 10000, "ราคาจำหน่าย": 10000 }),
      baseRow({ "Product Type": "Service", "Total Price": 99999, "ราคาจำหน่าย": 99999, "Product (Name)": "Service" }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills[0].totalRevenue, 10000);
  });

  it("detects hasIPhone / hasIPad / hasSmile / hasAttach flags", () => {
    const rows = [
      baseRow({ "Category (Name)": "iPhone" }),
      baseRow({ "Category (Name)": "Smile", "Product (Name)": "Smile 1", "Product (Code)": "S1" }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills[0].hasIPhone, true);
    assert.equal(bills[0].hasIPad, false);
    assert.equal(bills[0].hasSmile, true);
    assert.equal(bills[0].hasAttach, true); // Smile + iPhone
  });

  it("hasAttach is false when only Smile, no iPhone/iPad", () => {
    const rows = [
      baseRow({ "Category (Name)": "Smile", "Product (Name)": "Smile 1", "Product (Code)": "S1" }),
    ];
    const bills = parseBills(rows);
    assert.equal(bills[0].hasSmile, true);
    assert.equal(bills[0].hasAttach, false);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(parseBills([]), []);
  });
});
