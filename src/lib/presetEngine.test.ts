import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcPreset,
  calcAllPresets,
  formatPresetValue,
  presetDisplayValue,
} from "./presetEngine";
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

const macItem = baseItem({
  "Category (Name)": "Mac",
  "Sub Category": "MacBook Pro",
  "Product (Name)": "MacBook Pro 14",
  "Product (Code)": "MBP14",
  "Number": 1,
  "Total Price": 60000,
  "ราคาจำหน่าย": 60000,
  "Model": "MacBook Pro 14",
});

const smileItem = baseItem({
  "Category (Name)": "Smile",
  "Sub Category": "Insurance",
  "Product (Name)": "Smile Care",
  "Product (Code)": "SMILE1",
  "Number": 1,
  "Total Price": 3000,
  "ราคาจำหน่าย": 3000,
  "Model": "",
});

const bill1: BillSummary = {
  docNo: "DOC-1",
  docDate: new Date("2026-05-15"),
  officerName: "Officer A",
  officerId: "EMP1",
  branchId: "B1",
  branchName: "Branch 1",
  customerCode: "C1",
  customerName: "Customer 1",
  totalRevenue: 103000,
  itemCount: 3,
  categories: ["iPhone", "Mac", "Smile"],
  hasIPhone: true,
  hasIPad: false,
  hasSmile: true,
  hasAttach: true,
  finish: "",
  lineItems: [baseItem(), macItem, smileItem],
};

describe("presetEngine", () => {
  it("calcPreset attach = quantityA / quantityB * 100", () => {
    const preset: Preset = {
      id: "p1",
      name: "Attach Mac to iPhone",
      calcType: "attach",
      labelA: "Mac",
      labelB: "iPhone",
      color: "green",
      filtersA: [
        {
          categories: ["Mac"],
          subCategories: [],
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
    const result = calcPreset([bill1], preset);
    // 1 Mac, 1 iPhone → 100%
    assert.equal(result.billsWithAandB, 1);
    assert.equal(result.billsWithB, 1);
    assert.equal(result.attachRate, 100);
  });

  it("calcPreset unit returns count of A", () => {
    const preset: Preset = {
      id: "p1",
      name: "Count Mac",
      calcType: "unit",
      labelA: "Mac",
      labelB: "",
      color: "blue",
      filtersA: [
        {
          categories: ["Mac"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
          includeNonInventory: false,
        },
      ],
      filtersB: [],
    };
    const result = calcPreset([bill1], preset);
    assert.equal(result.billsWithAandB, 1);
    assert.equal(result.calcType, "unit");
  });

  it("calcPreset baht returns total revenue of A", () => {
    const preset: Preset = {
      id: "p1",
      name: "Baht Mac",
      calcType: "baht",
      labelA: "Mac",
      labelB: "",
      color: "amber",
      filtersA: [
        {
          categories: ["Mac"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
          includeNonInventory: false,
        },
      ],
      filtersB: [],
    };
    const result = calcPreset([bill1], preset);
    assert.equal(result.totalBaht, 60000);
  });

  it("calcPreset bahtRate returns bahtA / bahtB * 100", () => {
    const preset: Preset = {
      id: "p1",
      name: "BahtRate Smile/iPhone",
      calcType: "bahtRate",
      labelA: "Smile",
      labelB: "iPhone",
      color: "purple",
      filtersA: [
        {
          categories: ["Smile"],
          subCategories: [],
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
    const result = calcPreset([bill1], preset);
    assert.equal(result.totalBaht, 3000);
    assert.equal(result.totalBahtB, 40000);
    // 3000/40000*100 = 7.5
    assert.equal(result.bahtRate, 7.5);
  });

  it("calcPreset catBaht sums by catDaily", () => {
    const preset: Preset = {
      id: "p1",
      name: "CatBaht Smile",
      calcType: "catBaht",
      labelA: "Smile",
      labelB: "",
      catDailyFilter: "Smile",
      color: "teal",
      filtersA: [],
      filtersB: [],
    };
    const enrichedBill: BillSummary = {
      ...bill1,
      lineItems: [{ ...smileItem, catDaily: "Smile" } as any],
    };
    const result = calcPreset([enrichedBill], preset);
    assert.equal(result.totalBaht, 3000);
  });

  it("calcPreset returns 0 attachRate when B is 0", () => {
    const preset: Preset = {
      id: "p1",
      name: "Empty",
      calcType: "attach",
      labelA: "X",
      labelB: "Y",
      color: "coral",
      filtersA: [],
      filtersB: [
        {
          categories: ["NonExistent"],
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
    const result = calcPreset([bill1], preset);
    assert.equal(result.billsWithB, 0);
    assert.equal(result.attachRate, 0);
  });

  it("calcAllPresets processes array of presets", () => {
    const p1: Preset = {
      id: "1",
      name: "Mac",
      calcType: "baht",
      labelA: "Mac",
      labelB: "",
      color: "green",
      filtersA: [
        {
          categories: ["Mac"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
          includeNonInventory: false,
        },
      ],
      filtersB: [],
    };
    const p2: Preset = {
      id: "2",
      name: "iPhone",
      calcType: "baht",
      labelA: "iPhone",
      labelB: "",
      color: "blue",
      filtersA: [
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
      filtersB: [],
    };
    const results = calcAllPresets([bill1], [p1, p2]);
    assert.equal(results.length, 2);
    assert.equal(results[0].totalBaht, 60000);
    assert.equal(results[1].totalBaht, 40000);
  });

  it("formatPresetValue returns formatted string per calcType", () => {
    const baseResult = {
      presetId: "p1",
      presetName: "Test",
      color: "green",
      billsWithB: 0,
      billsWithAandB: 0,
      attachRate: 0,
      totalBaht: 12345,
      totalBahtB: 0,
      bahtRate: 0,
    };
    assert.equal(formatPresetValue({ ...baseResult, calcType: "baht" }), "฿12,345");
    assert.equal(formatPresetValue({ ...baseResult, calcType: "catBaht" }), "฿12,345");
    assert.equal(
      formatPresetValue({ ...baseResult, calcType: "attach", attachRate: 50 }),
      "50.0%",
    );
    assert.equal(
      formatPresetValue({ ...baseResult, calcType: "unit", billsWithAandB: 99 }),
      "99",
    );
  });

  it("presetDisplayValue returns the right number for each calcType", () => {
    const r = {
      presetId: "x",
      presetName: "x",
      color: "x",
      billsWithB: 10,
      billsWithAandB: 5,
      attachRate: 50,
      totalBaht: 1000,
      totalBahtB: 2000,
      bahtRate: 50,
    };
    assert.equal(presetDisplayValue({ ...r, calcType: "baht" }), 1000);
    assert.equal(presetDisplayValue({ ...r, calcType: "catBaht" }), 1000);
    assert.equal(presetDisplayValue({ ...r, calcType: "unit" }), 5);
    assert.equal(presetDisplayValue({ ...r, calcType: "catQty" }), 5);
    assert.equal(presetDisplayValue({ ...r, calcType: "bahtRate" }), 50);
    assert.equal(presetDisplayValue({ ...r, calcType: "catAttach" }), 50);
    assert.equal(presetDisplayValue({ ...r, calcType: "attach" }), 50);
  });
});
