import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getKpiMeasureType,
  getKpiRowValue,
  rowMatchesKpiCategory,
  sumKpiActualFromRows,
} from "./kpiCategoryAdapter";
import type { RawRow } from "./salesAggregations";

const simRow: RawRow = {
  "Category (Name)": "Sim Card",
  "Product (Name)": "SIM,STD,TMH2",
  "Product Type": "Inventory Item",
  Number: "3",
  "ราคาขายตามบิล": "0",
};

const btbRow: RawRow = {
  "Category (Name)": "BTB Accessories",
  "Product (Name)": "Apple Acc 20W",
  "Product Type": "Inventory Item",
  "ราคาขายตามบิล": "790",
};

const coverPlusRow: RawRow = {
  "Category (Name)": "Cases",
  "Product (Name)": "iPhone 15 Pro COVER+",
  "Product Type": "Inventory Item",
  Number: "5",
};

const acPlusRow: RawRow = {
  "Category (Name)": "Apple Care",
  "Product (Name)": "AppleCare+ for iPhone",
  "Product Type": "Inventory Item",
  Number: "4",
};

describe("kpiCategoryAdapter", () => {
  it("SIM uses quantity measure type", () => {
    assert.equal(getKpiMeasureType("SIM"), "quantity");
    assert.equal(getKpiRowValue(simRow, "SIM"), 3);
  });

  it("BTB uses revenue measure type", () => {
    assert.equal(getKpiMeasureType("BTB"), "revenue");
    assert.equal(getKpiRowValue(btbRow, "BTB"), 790);
  });

  it("rowMatchesKpiCategory filters inventory rows", () => {
    assert.equal(rowMatchesKpiCategory(simRow, "SIM"), true);
    assert.equal(rowMatchesKpiCategory(btbRow, "BTB"), true);
    assert.equal(
      rowMatchesKpiCategory({ ...btbRow, "Product Type": "Service" }, "BTB"),
      false,
    );
  });

  it("sumKpiActualFromRows aggregates by category rules", () => {
    const rows = [simRow, simRow, btbRow];
    assert.equal(sumKpiActualFromRows(rows, "SIM"), 6);
    assert.equal(sumKpiActualFromRows(rows, "BTB"), 790);
  });

  it("COVER+ and AC+ use quantity measure type", () => {
    assert.equal(getKpiMeasureType("COVER+"), "quantity");
    assert.equal(getKpiMeasureType("AC+"), "quantity");
    assert.equal(getKpiRowValue(coverPlusRow, "COVER+"), 5);
    assert.equal(getKpiRowValue(acPlusRow, "AC+"), 4);
  });

  it("rowMatchesKpiCategory matches COVER+/AC+ by product name", () => {
    assert.equal(rowMatchesKpiCategory(coverPlusRow, "COVER+"), true);
    assert.equal(rowMatchesKpiCategory(acPlusRow, "AC+"), true);
    assert.equal(rowMatchesKpiCategory(simRow, "COVER+"), false);
    assert.equal(rowMatchesKpiCategory(simRow, "AC+"), false);
  });

  it("rowMatchesKpiCategory uses catDaily first-priority for BTB", () => {
    // Raw text doesn't include "BTB" — only enriched catDaily = "BTB"
    const adapterRow: RawRow = {
      "Category (Name)": "Adapter",
      "Sub Category": "Adapters",
      "Product (Name)": "Apple 20W Adapter",
      "Product Type": "Inventory Item",
      "ราคาขายตามบิล": "590",
      catDaily: "BTB",
    };
    assert.equal(rowMatchesKpiCategory(adapterRow, "BTB"), true);
    assert.equal(rowMatchesKpiCategory(adapterRow, "BTB(Apple)"), false);
    assert.equal(sumKpiActualFromRows([adapterRow], "BTB"), 590);
  });

  it("rowMatchesKpiCategory uses catDaily first-priority for BTB(Apple)", () => {
    // Raw text is "Apple Case & Protection CASING BEATS" — no "BTB" word at all
    const appleCaseRow: RawRow = {
      "Category (Name)": "Apple Case & Protection",
      "Sub Category": "CASING BEATS IPHONE 17",
      "Product (Name)": "Caseling Beats",
      "Product Type": "Inventory Item",
      "ราคาขายตามบิล": "1590",
      catDaily: "BTB(Apple)",
    };
    assert.equal(rowMatchesKpiCategory(appleCaseRow, "BTB(Apple)"), true);
    assert.equal(rowMatchesKpiCategory(appleCaseRow, "BTB"), false);
    assert.equal(sumKpiActualFromRows([appleCaseRow], "BTB(Apple)"), 1590);
  });

  it("rowMatchesKpiCategory normalizes BTB apple and BTB(APPLE) variants", () => {
    const variants = ["BTB Apple", "BTB(APPLE)", "btb apple", "btb(apple)"];
    for (const v of variants) {
      const row: RawRow = {
        "Category (Name)": "X",
        "Sub Category": "Y",
        "Product Type": "Inventory Item",
        "ราคาขายตามบิล": "100",
        catDaily: v,
      };
      assert.equal(
        rowMatchesKpiCategory(row, "BTB(Apple)"),
        true,
        `should match catDaily variant "${v}"`,
      );
    }
  });

  it("rowMatchesKpiCategory falls back to raw text when catDaily is absent", () => {
    // Without catDaily, BTB still matches raw "BTB Accessories" text
    const row: RawRow = {
      "Category (Name)": "BTB Accessories",
      "Product (Name)": "X",
      "Product Type": "Inventory Item",
      "ราคาขายตามบิล": "100",
    };
    assert.equal(rowMatchesKpiCategory(row, "BTB"), true);
  });

  it("rowMatchesKpiCategory matches COVER+ by product name with + sign preserved", () => {
    // CRITICAL: normalizeText must preserve "+" so "COVER+" doesn't become "cover"
    const row: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "COVER+ with AppleCare Services for iPhone",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(row, "COVER+"), true);
  });

  it("rowMatchesKpiCategory excludes COVER+ rows from AC+", () => {
    // COVER+ product names contain "Apple Care" too — must NOT count as AC+
    const coverRow: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "COVER+ with AppleCare Services for iPhone",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(coverRow, "COVER+"), true);
    assert.equal(rowMatchesKpiCategory(coverRow, "AC+"), false);
  });

  it("rowMatchesKpiCategory matches AC+ for AppleCare+ products", () => {
    const row: RawRow = {
      "Category (Name)": "Apple Care",
      "Sub Category": "APP FOR IPHONE",
      "Product (Name)": "AppleCare+ for iPhone 17 Pro Max",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(row, "AC+"), true);
    assert.equal(rowMatchesKpiCategory(row, "COVER+"), false);
  });

  it("rowMatchesKpiCategory excludes AppleCare rows from SIM (Smile/INSURANCE)", () => {
    const row: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "AppleCare+ for iPhone",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(row, "SIM"), false);
  });

  it("rowMatchesKpiCategory matches SIM for actual SIM products (Sim Card cat)", () => {
    const row: RawRow = {
      "Category (Name)": "Sim Card",
      "Sub Category": "SIM แบบรายเดือน",
      "Product (Name)": "SIM,STD,TMH2",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(row, "SIM"), true);
  });

  it("COVER+/AC+ sum as units (Number column), not revenue", () => {
    // Real COVER+ row: 1 unit, price 4,999 — sum should be 1, not 4999
    const coverRow: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "COVER+ with AppleCare Services for iPhone Pro",
      "Product Type": "Inventory Item",
      Number: "1",
      "ราคาขายตามบิล": "4999",
    };
    assert.equal(getKpiMeasureType("COVER+"), "quantity");
    assert.equal(getKpiRowValue(coverRow, "COVER+"), 1, "should count as 1 unit, not 4999 baht");
    assert.equal(sumKpiActualFromRows([coverRow, coverRow, coverRow], "COVER+"), 3, "3 rows = 3 units");
  });

  it("AC+ sum as units (Number column), not revenue", () => {
    // Real AC+ row: 1 unit, price 2,510 — sum should be 1, not 2510
    const acRow: RawRow = {
      "Category (Name)": "Apple Care",
      "Sub Category": "APP FOR IPAD",
      "Product (Name)": "AppleCare+ for iPad Air 11-inch (M4)",
      "Product Type": "Inventory Item",
      Number: "1",
      "ราคาขายตามบิล": "2510",
    };
    assert.equal(getKpiMeasureType("AC+"), "quantity");
    assert.equal(getKpiRowValue(acRow, "AC+"), 1, "should count as 1 unit, not 2510 baht");
    assert.equal(sumKpiActualFromRows([acRow, acRow, acRow, acRow, acRow], "AC+"), 5, "5 rows = 5 units");
  });

  it("rowMatchesKpiCategory EXCLUDES 7CARE+ Free from COVER+ (paid only)", () => {
    // 7CARE+ Free for COVER+ is a bonus/companion — should NOT count as COVER+ paid
    const freeBonus: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(freeBonus, "COVER+"), false);
    assert.equal(rowMatchesKpiCategory(freeBonus, "AC+"), false);
  });

  it("rowMatchesKpiCategory EXCLUDES 7CARE+ Free from AC+ too", () => {
    // 7CARE+ Free is a bonus plan, not a paid AppleCare
    const freeBonus: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Services (1-Year)",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(freeBonus, "AC+"), false);
  });

  it("SIM only matches cat=Sim Card (excludes Smile/INSURANCE rows)", () => {
    const smileInsurance: RawRow = {
      "Category (Name)": "Smile",
      "Sub Category": "INSURANCE",
      "Product (Name)": "AppleCare+ for iPhone",
      "Product Type": "Inventory Item",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(smileInsurance, "SIM"), false);
  });
});
