import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatDailyLookup,
  enrichSalesRowsWithCatDaily,
  getCategoryMasterCatDailies,
} from "./presetCatDaily";
import type { RawRow } from "./salesAggregations";

describe("presetCatDaily", () => {
  it("buildCatDailyLookup returns Map<CatAndSubCat, CatDaily>", () => {
    const rows: RawRow[] = [
      { "Cat & Sub Cat": "Smartphone", "CAT Daily": "Smile" },
      { "Cat & Sub Cat": "Smartphone > iPhone", "CAT Daily": "iPhone" },
    ];
    const lookup = buildCatDailyLookup(rows);
    assert.equal(lookup.get("smartphone"), "Smile");
    assert.equal(lookup.get("smartphone > iphone"), "iPhone");
  });

  it("buildCatDailyLookup skips rows with empty values", () => {
    const rows: RawRow[] = [
      { "Cat & Sub Cat": "", "CAT Daily": "X" },
      { "Cat & Sub Cat": "Y", "CAT Daily": "" },
    ];
    const lookup = buildCatDailyLookup(rows);
    assert.equal(lookup.size, 0);
  });

  it("enrichSalesRowsWithCatDaily copies catDaily onto sales rows", () => {
    const lookup = new Map<string, string>([
      ["iphone", "iPhone"],
    ]);
    const salesRows: RawRow[] = [
      { "Category (Name)": "iPhone" },
    ];
    const enriched = enrichSalesRowsWithCatDaily(salesRows, lookup);
    assert.equal(enriched[0].catDaily, "iPhone");
  });

  it("enrichSalesRowsWithCatDaily leaves rows unchanged when no match", () => {
    const lookup = new Map<string, string>();
    const salesRows: RawRow[] = [
      { "Category (Name)": "iPhone" },
    ];
    const enriched = enrichSalesRowsWithCatDaily(salesRows, lookup);
    assert.equal(enriched[0].catDaily, undefined);
  });

  it("getCategoryMasterCatDailies returns unique values", () => {
    const rows: RawRow[] = [
      { "Cat & Sub Cat": "A", "CAT Daily": "Smile" },
      { "Cat & Sub Cat": "B", "CAT Daily": "iPhone" },
      { "Cat & Sub Cat": "C", "CAT Daily": "Smile" },
      { "Cat & Sub Cat": "D", "CAT Daily": "" },
    ];
    const list = getCategoryMasterCatDailies(rows);
    assert.equal(list.length, 2);
    assert.ok(list.includes("Smile"));
    assert.ok(list.includes("iPhone"));
  });
});
