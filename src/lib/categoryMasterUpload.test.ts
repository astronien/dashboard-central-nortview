import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCategoryMasterRows,
  resolveCategoryMasterHeaders,
} from "./categoryMasterUpload";
import type { RawRow } from "./dashboardUtils";

describe("categoryMasterUpload", () => {
  it("accepts canonical headers", () => {
    const headers = resolveCategoryMasterHeaders(["Cat & Sub Cat", "CAT Daily", "Note"]);
    assert.equal(headers.catSubCat, "Cat & Sub Cat");
    assert.equal(headers.catDaily, "CAT Daily");
  });

  it("accepts snake_case header aliases", () => {
    const headers = resolveCategoryMasterHeaders(["cat_sub_cat", "cat_daily"]);
    assert.equal(headers.catSubCat, "cat_sub_cat");
    assert.equal(headers.catDaily, "cat_daily");
  });

  it("rejects sales export headers", () => {
    assert.throws(
      () => resolveCategoryMasterHeaders(["Doc Date", "Total Price"]),
      /sales export/,
    );
  });

  it("deduplicates rows and normalizes output keys", () => {
    const rows: RawRow[] = [
      { "Cat & Sub Cat": "A|B", "CAT Daily": "iPhone" },
      { "Cat & Sub Cat": "A|B", "CAT Daily": "iPhone" },
      { "Cat & Sub Cat": "C|D", "CAT Daily": "Mac" },
    ];
    const normalized = normalizeCategoryMasterRows(rows);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0]["Cat & Sub Cat"], "A|B");
    assert.equal(normalized[0]["CAT Daily"], "iPhone");
    assert.equal(normalized[1]["Cat & Sub Cat"], "C|D");
    assert.equal(normalized[1]["CAT Daily"], "Mac");
  });

  it("maps snake_case headers via alias resolution", () => {
    const rows: RawRow[] = [
      { cat_sub_cat: "X|Y", cat_daily: "iPad" },
      { cat_sub_cat: "Z|W", cat_daily: "Mac" },
    ];
    const normalized = normalizeCategoryMasterRows(rows);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0]["CAT Daily"], "iPad");
  });
});
