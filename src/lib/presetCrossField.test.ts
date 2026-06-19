import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPreset } from "./presetEngine";
import type { BillSummary } from "./presetBills";
import type { Preset } from "./presetTypes";

const makeItem = (overrides: Record<string, unknown> = {}) => ({
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

const makeBill = (items: ReturnType<typeof makeItem>[]): BillSummary => ({
  docNo: "DOC-1",
  docDate: new Date("2026-05-15"),
  officerName: "Officer A",
  officerId: "EMP1",
  branchId: "B1",
  branchName: "Branch 1",
  customerCode: "C1",
  customerName: "Customer 1",
  totalRevenue: items.reduce((s, i) => s + Number(i["Total Price"]), 0),
  itemCount: items.length,
  categories: [...new Set(items.map((i) => i["Category (Name"] as string))],
  hasIPhone: items.some((i) => /iphone/i.test(i["Category (Name"] as string)),
  hasIPad: false,
  hasSmile: false,
  hasAttach: false,
  finish: "",
  lineItems: items,
});

describe("Cross-field matching (user-friendly preset filter)", () => {
  it("subCategories also matches Product (Name)", () => {
    // Real-world scenario: user puts product name in subCategories field
    // Actual data: subCategory="INSURANCE", productName="7CARE+ Free for COVER+..."
    const items = [
      makeItem({
        "Category (Name)": "Smile",
        "Sub Category": "INSURANCE",
        "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
        "Product (Code)": "7C1",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "coverPlusCross",
      name: "COVER+",
      calcType: "attach",
      labelA: "COVER+",
      labelB: "iPhone",
      color: "green",
      filtersA: [
        {
          categories: ["Smile"],
          subCategories: [
            "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
          ],
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

    const result = calcPreset([bill], preset);
    // With cross-field matching, the Smile+productName row counts toward COVER+
    assert.equal(result.billsWithAandB, 1);
  });

  it("subCategories still works for exact Sub Category match", () => {
    const items = [
      makeItem({
        "Category (Name)": "Cases",
        "Sub Category": "CASE IPHONE",
        "Product (Name)": "iPhone 15 Case",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "casePreset",
      name: "Case",
      calcType: "attach",
      labelA: "Cases",
      labelB: "iPhone",
      color: "blue",
      filtersA: [
        {
          categories: [],
          subCategories: ["CASE IPHONE"],
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

    const result = calcPreset([bill], preset);
    assert.equal(result.billsWithAandB, 1);
  });

  it("productNames still works for exact Product (Name) match", () => {
    const items = [
      makeItem({
        "Category (Name)": "Smile",
        "Sub Category": "INSURANCE",
        "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "coverPlusProductName",
      name: "COVER+",
      calcType: "attach",
      labelA: "COVER+",
      labelB: "iPhone",
      color: "green",
      filtersA: [
        {
          categories: ["Smile"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [
            "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
          ],
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

    const result = calcPreset([bill], preset);
    assert.equal(result.billsWithAandB, 1);
  });

  it("subCategories with no match returns 0", () => {
    const items = [
      makeItem({
        "Category (Name)": "iPhone",
        "Sub Category": "iPhone 15",
        "Product (Name)": "iPhone 15 Pro",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "noMatch",
      name: "noMatch",
      calcType: "attach",
      labelA: "A",
      labelB: "B",
      color: "coral",
      filtersA: [
        {
          categories: [],
          subCategories: ["NonexistentCategory"],
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

    const result = calcPreset([bill], preset);
    assert.equal(result.billsWithAandB, 0);
  });

  it("substring match: categories=['COVER+'] matches product name containing 'COVER+'", () => {
    // Real-world bug: user sets categories: ["COVER+"] but there is no Category="COVER+"
    // The actual product name is "7CARE+ Free for COVER+ with AppleCare Services..."
    // Substring match should find "COVER+" inside the product name
    const items = [
      makeItem({
        "Category (Name)": "Smile",
        "Sub Category": "INSURANCE",
        "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
        "Product (Code)": "7C1",
      }),
      makeItem({
        "Category (Name)": "Smile",
        "Sub Category": "INSURANCE",
        "Product (Name)": "COVER+ with AppleCare Services for Apple iPhone (1-Year)",
        "Product (Code)": "CV1",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "coverSubstr",
      name: "COVER+",
      calcType: "attach",
      labelA: "COVER+",
      labelB: "iPhone",
      color: "green",
      filtersA: [
        {
          categories: ["COVER+"],
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

    const result = calcPreset([bill], preset);
    // Both COVER+ items should match via substring on product name
    assert.equal(result.billsWithAandB, 2);
  });

  it("substring match is case-insensitive: 'cover+' matches 'COVER+'", () => {
    const items = [
      makeItem({
        "Category (Name)": "Smile",
        "Sub Category": "INSURANCE",
        "Product (Name)": "COVER+ with AppleCare Services",
        "Product (Code)": "CV1",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "caseInsensitive",
      name: "cover+",
      calcType: "unit",
      labelA: "cover+",
      labelB: "",
      color: "green",
      filtersA: [
        {
          categories: ["cover+"],
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

    const result = calcPreset([bill], preset);
    assert.equal(result.billsWithAandB, 1);
  });

  it("exact match still takes priority over substring", () => {
    // If categories: ["iPhone"] and Category (Name) = "iPhone", exact match wins
    // This should NOT accidentally match "iPhone Acc for iPad" as a substring
    // because "iPhone" is an exact match for Category="iPhone"
    const items = [
      makeItem({
        "Category (Name)": "iPhone",
        "Sub Category": "iPhone 15",
        "Product (Name)": "iPhone 15 Pro",
      }),
    ];
    const bill = makeBill(items);

    const preset: Preset = {
      id: "exactPriority",
      name: "iPhone",
      calcType: "unit",
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

    const result = calcPreset([bill], preset);
    assert.equal(result.billsWithAandB, 1);
  });
});
