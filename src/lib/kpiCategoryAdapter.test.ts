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
  "Category (Name)": "Smile",
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

  it("rowMatchesKpiCategory matches basic BTB / SIM rows", () => {
    assert.equal(rowMatchesKpiCategory(simRow, "SIM"), true);
    assert.equal(rowMatchesKpiCategory(btbRow, "BTB"), true);
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

  it("AC+ does NOT match rows merely containing the letters 'ac' (Mac/Accessories)", () => {
    // Regression: normalizeText strips "+", so the old AC+ branch fell
    // through to `includes("ac")` and counted every Mac/Accessories row.
    const macRow: RawRow = { "Category (Name)": "Mac", "Product (Name)": "MacBook Air M3", Number: "1" };
    const accRow: RawRow = { "Category (Name)": "Accessories", "Product (Name)": "20W Adapter", Number: "1" };
    assert.equal(rowMatchesKpiCategory(macRow, "AC+"), false);
    assert.equal(rowMatchesKpiCategory(accRow, "AC+"), false);
  });

  it("catDaily is authoritative for grouped categories", () => {
    // A "sim"-substring product the master assigns to another group
    // does not count toward SIM.
    const otherRow: RawRow = { "Product (Name)": "SIM tray tool", catDaily: "Other", Number: "1" };
    assert.equal(rowMatchesKpiCategory(otherRow, "SIM"), false);
    // ...but rows assigned to the group do.
    const simCard: RawRow = { "Product (Name)": "TRUE 5G", catDaily: "SIM", Number: "1" };
    assert.equal(rowMatchesKpiCategory(simCard, "SIM"), true);
  });

  it("7CARE+/COVER+ bundle items count as COVER+ only, never AC+", () => {
    const bundleRow: RawRow = {
      "Category (Name)": "Smile",
      "Product (Name)": "7CARE+ Free for COVER+ with AppleCare Service",
      Number: "1",
    };
    assert.equal(rowMatchesKpiCategory(bundleRow, "COVER+"), true);
    assert.equal(rowMatchesKpiCategory(bundleRow, "AC+"), false);
  });

  it("AC+/COVER+ match on product text regardless of catDaily group", () => {
    // The Category Master has no AC+/COVER+ group — an AppleCare row is
    // assigned to a device group (e.g. Mac) but still counts toward AC+.
    const row: RawRow = { "Product (Name)": "AppleCare+ for Mac", catDaily: "Mac", Number: "1" };
    assert.equal(rowMatchesKpiCategory(row, "AC+"), true);
    assert.equal(rowMatchesKpiCategory(row, "Mac"), true);
    const coverRow: RawRow = { "Product (Name)": "COVER+ 1 Year", catDaily: "Other", Number: "1" };
    assert.equal(rowMatchesKpiCategory(coverRow, "COVER+"), true);
  });

  it("BTB and BTB(Apple) are mutually exclusive on raw text", () => {
    const btbAppleRow: RawRow = { "Category (Name)": "BTB Apple", "Product (Name)": "Case", Number: "1" };
    assert.equal(rowMatchesKpiCategory(btbAppleRow, "BTB(Apple)"), true);
    assert.equal(rowMatchesKpiCategory(btbAppleRow, "BTB"), false);
    assert.equal(rowMatchesKpiCategory(btbRow, "BTB"), true);
  });
});

describe("rowMatchesKpiCategory — data integrity fixes", () => {
  // The user's actual sales data has the `Product Type` column filled
  // with Officer IDs (numeric values), not the string "Inventory Item".
  // The matcher should still pick up BTB / BTB(Apple) rows based on the
  // text content and/or the enriched `catDaily` field.

  it("does NOT exclude rows based on numeric Product Type", () => {
    // The old code had: `if (productType && productType !== "Inventory Item") return false;`
    // which excluded all rows whose Product Type was an Officer ID.
    // The fix removes that early-return; the text and catDaily checks below
    // decide the actual match.
    const row: RawRow = {
      "Category (Name)": "Adapter",
      "Sub Category": "WALL CHARGER",
      "Product Type": "3728",
    };
    // Without catDaily or a BTB substring in the text, the row should NOT
    // be matched as BTB (it would be matched later via catDaily enrichment).
    assert.equal(rowMatchesKpiCategory(row, "BTB"), false);
  });

  it("matches BTB via catDaily enrichment even with numeric Product Type", () => {
    assert.equal(
      rowMatchesKpiCategory(
        {
          "Category (Name)": "Adapter",
          "Sub Category": "WALL CHARGER",
          "Product Type": "3728",
          catDaily: "BTB",
        },
        "BTB",
      ),
      true,
    );
  });

  it("matches BTB(Apple) via catDaily enrichment even with numeric Product Type", () => {
    assert.equal(
      rowMatchesKpiCategory(
        {
          "Category (Name)": "Apple Acc for iPad & iPhone",
          "Sub Category": "CASE",
          "Product Type": "11384",
          catDaily: "BTB(Apple)",
        },
        "BTB(Apple)",
      ),
      true,
    );
  });

  it("uses catDaily enrichment when available (BTB)", () => {
    assert.equal(
      rowMatchesKpiCategory(
        { "Category (Name)": "Foo Bar", catDaily: "BTB" },
        "BTB",
      ),
      true,
    );
  });

  it("uses catDaily enrichment when available (BTB(Apple))", () => {
    assert.equal(
      rowMatchesKpiCategory(
        { "Category (Name)": "Foo Bar", catDaily: "BTB(Apple)" },
        "BTB(Apple)",
      ),
      true,
    );
  });

  it("handles 'BTB Apple' (with space) catDaily as BTB(Apple)", () => {
    assert.equal(
      rowMatchesKpiCategory(
        { "Category (Name)": "Foo Bar", catDaily: "BTB Apple" },
        "BTB(Apple)",
      ),
      true,
    );
  });

  it("matches BTB(Apple) via Category (Name)='Apple Case & Protection' + sub", () => {
    assert.equal(
      rowMatchesKpiCategory(
        {
          "Category (Name)": "Apple Case & Protection",
          "Sub Category": "CASING IPHONE 15 PRO MAX",
          "Product Type": "11384",
          catDaily: "BTB(Apple)",
        },
        "BTB(Apple)",
      ),
      true,
    );
  });

  it("BTB and BTB(Apple) are matched by their respective catDaily", () => {
    const btbAppleRow: RawRow = {
      "Category (Name)": "Apple Acc for iPad & iPhone",
      "Sub Category": "CASE",
      catDaily: "BTB(Apple)",
    };
    assert.equal(rowMatchesKpiCategory(btbAppleRow, "BTB(Apple)"), true);
  });
});
