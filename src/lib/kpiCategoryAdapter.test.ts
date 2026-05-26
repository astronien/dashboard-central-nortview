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
});
