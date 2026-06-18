import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPreset, formatPresetValue } from "./presetEngine";
import type { BillSummary } from "./presetBills";
import type { Preset } from "./presetTypes";

const baseItem = (overrides: Record<string, unknown> = {}) => ({
  "Category (Name)": "iPhone",
  "Sub Category": "iPhone 15",
  "Product (Name)": "iPhone 15 Pro",
  "Product (Code)": "IP15P",
  "Serial": "",
  "Doc No": "DOC-1",
  "Doc Type": "ใบกำกับภาษี",
  "Officer (Name)": "Officer A",
  "STAFF ID": "EMP1",
  "Branch (Code)": "B1",
  "Branch (Name)": "Branch 1",
  "Customer (Code)": "C1",
  "Customer (Name)": "Customer 1",
  "Product Type": "Inventory Item",
  "Number": 1,
  "ราคาจำหน่าย": 40000,
  "Total Price": 40000,
  "Model": "iPhone 15 Pro",
  "Brand": "Apple",
  "Doc Date": "2026-05-15",
  ...overrides,
});

const makeCoverPlusBill = (officer: string, coverPlusCount: number, iphoneCount: number): BillSummary => {
  const coverPlusItems = Array.from({ length: coverPlusCount }).map((_, i) =>
    baseItem({
      "Category (Name)": "Cases",
      "Sub Category": "Cover+",
      "Product (Name)": "COVER+",
      "Product (Code)": `CV${i}`,
      "Officer (Name)": officer,
    }),
  );
  const iphoneItems = Array.from({ length: iphoneCount }).map((_, i) =>
    baseItem({
      "Product (Code)": `IP${i}`,
      "Officer (Name)": officer,
    }),
  );
  return {
    docNo: `DOC-${officer}`,
    docDate: new Date("2026-05-15"),
    officerName: officer,
    officerId: `EMP-${officer}`,
    branchId: "B1",
    branchName: "Branch 1",
    customerCode: "C1",
    customerName: "Customer 1",
    totalRevenue: 40000 * iphoneCount + 3000 * coverPlusCount,
    itemCount: coverPlusCount + iphoneCount,
    categories: ["Cases", "iPhone"],
    hasIPhone: true,
    hasIPad: false,
    hasSmile: false,
    hasAttach: false,
    finish: "",
    lineItems: [...coverPlusItems, ...iphoneItems],
  };
};

const coverPlusPreset: Preset = {
  id: "coverPlusPreset",
  name: "COVER+",
  calcType: "attach",
  labelA: "COVER+",
  labelB: "iPhone",
  color: "green",
  filtersA: [
    {
      categories: ["Cases"],
      subCategories: ["Cover+"],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  ],
  filtersB: [
    {
      categories: ["iPhone"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  ],
};

describe("COVER+ per-officer calculation", () => {
  it("สิทธิโชค: 16 COVER+ / 54 iPhone = 29.6%", () => {
    const bill = makeCoverPlusBill("สิทธิโชค", 16, 54);
    const r = calcPreset([bill], coverPlusPreset);
    assert.equal(r.billsWithAandB, 16);
    assert.equal(r.billsWithB, 54);
    assert.equal(Math.round(r.attachRate * 10) / 10, 29.6);
  });

  it("วีภา: 8 COVER+ / 51 iPhone = 15.7%", () => {
    const bill = makeCoverPlusBill("วีภา", 8, 51);
    const r = calcPreset([bill], coverPlusPreset);
    assert.equal(r.billsWithAandB, 8);
    assert.equal(r.billsWithB, 51);
    assert.equal(Math.round(r.attachRate * 10) / 10, 15.7);
  });

  it("ยุทธนา: 9 COVER+ / 44 iPhone = 20.5%", () => {
    const bill = makeCoverPlusBill("ยุทธนา", 9, 44);
    const r = calcPreset([bill], coverPlusPreset);
    assert.equal(r.billsWithAandB, 9);
    assert.equal(r.billsWithB, 44);
    assert.equal(Math.round(r.attachRate * 10) / 10, 20.5);
  });

  it("ต่อศักดิ์: 11 COVER+ / 35 iPhone = 31.4%", () => {
    const bill = makeCoverPlusBill("ต่อศักดิ์", 11, 35);
    const r = calcPreset([bill], coverPlusPreset);
    assert.equal(r.billsWithAandB, 11);
    assert.equal(r.billsWithB, 35);
    assert.equal(Math.round(r.attachRate * 10) / 10, 31.4);
  });

  it("formatPresetValue produces '29.6%' for attach calcType", () => {
    const r = calcPreset([makeCoverPlusBill("Officer", 16, 54)], coverPlusPreset);
    assert.equal(formatPresetValue(r), "29.6%");
  });

  it("returns '-' format when billsWithB is 0", () => {
    const bill = makeCoverPlusBill("Officer", 5, 0);
    const r = calcPreset([bill], coverPlusPreset);
    assert.equal(r.billsWithB, 0);
    assert.equal(r.attachRate, 0);
  });
});
