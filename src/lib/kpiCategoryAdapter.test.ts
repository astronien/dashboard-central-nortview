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
