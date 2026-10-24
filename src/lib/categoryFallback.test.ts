import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFallbackMasterRows,
  findUnmappedCategoryPairs,
  pairKey,
  toCategoryChoice,
} from "./categoryFallback";
import { buildCatDailyLookup, enrichSalesRowsWithCatDaily } from "./presetCatDaily";
import type { RawRow } from "./salesAggregations";

const master: RawRow[] = [
  { "Cat & Sub Cat": "Apple Case & ProtectionCASING IPHONE 17 PRO", "CAT Daily": "BTB(Apple)" },
  { "Cat & Sub Cat": "Apple Case & ProtectionCASING IPHONE 17", "CAT Daily": "BTB(Apple)" },
  { "Cat & Sub Cat": "Film for Mobile and TabletFILM IPHONE", "CAT Daily": "BTB" },
  { "Cat & Sub Cat": "Film for Mobile and TabletFILM IPAD", "CAT Daily": "BTB" },
  { "Cat & Sub Cat": "Mixed StuffA", "CAT Daily": "BTB" },
  { "Cat & Sub Cat": "Mixed StuffB", "CAT Daily": "BTB(Apple)" },
  { "Cat & Sub Cat": "SmileINSURANCE", "CAT Daily": "Other" },
];

const sale = (cat: string, sub: string, price: number, brand = "APPLE"): RawRow => ({
  "Category (Name)": cat,
  "Sub Category": sub,
  "Total Price": price,
  Brand: brand,
});

describe("categoryFallback", () => {
  it("finds unmapped pairs and suggests from the Category family", () => {
    const pairs = findUnmappedCategoryPairs(
      {
        current: [
          sale("Apple Case & Protection", "CASING IPHONE 18 PRO MAX", 1990),
          sale("Apple Case & Protection", "CASING IPHONE 18 PRO MAX", 1990),
          sale("Film for Mobile and Tablet", "CAMERA FILM", 990, "AMAZINGTHING"),
          sale("Mixed Stuff", "C", 100),
          sale("Smile", "INSURANCE", 5000), // อยู่ใน master แล้ว
          sale("iPhone", "IPHONE 18 PRO", 50000), // ตัวเครื่อง ไม่ผ่าน master
          sale("Selling Expense", "BAG", 0), // ยอด 0 ไม่ต้องเตือน
        ],
      },
      master,
    );
    const byKey = Object.fromEntries(pairs.map((p) => [p.subCategory, p]));
    assert.deepEqual(Object.keys(byKey).sort(), ["C", "CAMERA FILM", "CASING IPHONE 18 PRO MAX"]);
    assert.equal(byKey["CASING IPHONE 18 PRO MAX"].suggestion, "BTB(Apple)");
    assert.equal(byKey["CASING IPHONE 18 PRO MAX"].revenue, 3980);
    assert.equal(byKey["CASING IPHONE 18 PRO MAX"].appleShare, 1);
    assert.equal(byKey["CAMERA FILM"].suggestion, "BTB");
    assert.equal(byKey["CAMERA FILM"].appleShare, 0);
    assert.equal(byKey["C"].suggestion, null, "mixed family → no guess");
    assert.equal(pairs[0].subCategory, "CASING IPHONE 18 PRO MAX", "sorted by revenue");
  });

  it("builds master rows: user choice wins, unknown stays out", () => {
    const pairs = findUnmappedCategoryPairs(
      { current: [sale("Film for Mobile and Tablet", "CAMERA FILM", 990), sale("Mixed Stuff", "C", 100)] },
      master,
    );
    const auto = buildFallbackMasterRows(pairs, {});
    assert.deepEqual(
      auto.map((r) => [r["Cat & Sub Cat"], r["CAT Daily"]]),
      [["Film for Mobile and TabletCAMERA FILM", "BTB"]],
    );
    const chosen = buildFallbackMasterRows(pairs, {
      [pairKey("Film for Mobile and Tablet", "CAMERA FILM")]: "BTB(Apple)",
      [pairKey("Mixed Stuff", "C")]: "Other",
    });
    assert.deepEqual(
      chosen.map((r) => [r["Cat & Sub Cat"], r["CAT Daily"], r.__fallback]),
      [
        ["Film for Mobile and TabletCAMERA FILM", "BTB(Apple)", "user"],
        ["Mixed StuffC", "Other", "user"],
      ],
    );
  });

  it("fallback rows are picked up by the CAT Daily lookup", () => {
    const row = sale("Apple Case & Protection", "CASING IPHONE DUO", 3095);
    const pairs = findUnmappedCategoryPairs({ current: [row] }, master);
    const lookup = buildCatDailyLookup([...master, ...buildFallbackMasterRows(pairs, {})]);
    assert.equal(enrichSalesRowsWithCatDaily([row], lookup)[0].catDaily, "BTB(Apple)");
  });

  it("normalizes CAT Daily spellings", () => {
    assert.equal(toCategoryChoice("BTB Apple"), "BTB(Apple)");
    assert.equal(toCategoryChoice("btb(apple)"), "BTB(Apple)");
    assert.equal(toCategoryChoice("BTB"), "BTB");
    assert.equal(toCategoryChoice("Other"), "Other");
    assert.equal(toCategoryChoice("iPhone"), null);
  });

  it("no master → nothing to warn about", () => {
    assert.deepEqual(findUnmappedCategoryPairs({ current: [sale("X", "Y", 10)] }, []), []);
  });
});
