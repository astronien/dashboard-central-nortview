import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Replicate intersectWithExistingColumns logic from tables-sync.js to test
// the column-detection behavior on legacy databases.
const intersectWithExistingColumns = async (
  tursoExecute,
  table,
  desiredColumns,
) => {
  try {
    const result = await tursoExecute(`PRAGMA table_info(${table})`);
    const present = new Set(
      (result.rows ?? [])
        .map((row) => (Array.isArray(row) ? row[1] : null))
        .filter(Boolean)
        .map((name) => String(name)),
    );
    return new Set(desiredColumns.filter((c) => present.has(c)));
  } catch (e) {
    return new Set(desiredColumns);
  }
};

const SALES_COLUMNS = [
  "period",
  "product_code",
  "product_name",
  "category_name",
  "sub_category",
  "brand",
  "customer_code",
  "model",
  "doc_type",
  "product_type",
  "branch_name",
  "officer_name",
  "doc_no",
  "doc_date",
  "total_price",
  "bill_amount",
  "quantity",
  "customer_name",
  "extra_json",
];

describe("intersectWithExistingColumns (legacy DB compatibility)", () => {
  it("returns all columns when DB has the new schema", async () => {
    const mockExecute = async (sql) => {
      if (sql.startsWith("PRAGMA table_info")) {
        return {
          rows: SALES_COLUMNS.map((c) => [null, c, "TEXT", 0, null, 0]),
        };
      }
      return { rows: [] };
    };
    const result = await intersectWithExistingColumns(
      mockExecute,
      "data_sales",
      SALES_COLUMNS,
    );
    assert.equal(result.size, SALES_COLUMNS.length);
    for (const col of SALES_COLUMNS) {
      assert.ok(result.has(col), `should include ${col}`);
    }
  });

  it("filters out missing columns on legacy DB", async () => {
    const legacyColumns = [
      "id",
      "period",
      "product_code",
      "product_name",
      "category_name",
      "sub_category",
      "branch_name",
      "officer_name",
      "doc_no",
      "doc_date",
      "total_price",
      "bill_amount",
      "quantity",
      "customer_name",
      "extra_json",
    ];
    const mockExecute = async (sql) => {
      if (sql.startsWith("PRAGMA table_info")) {
        return {
          rows: legacyColumns.map((c) => [null, c, "TEXT", 0, null, 0]),
        };
      }
      return { rows: [] };
    };
    const result = await intersectWithExistingColumns(
      mockExecute,
      "data_sales",
      SALES_COLUMNS,
    );
    assert.equal(
      result.size,
      legacyColumns.length - 1,
      "should match all original columns except id",
    );
    assert.ok(!result.has("brand"), "brand should be missing");
    assert.ok(!result.has("customer_code"), "customer_code should be missing");
    assert.ok(!result.has("model"), "model should be missing");
    assert.ok(!result.has("doc_type"), "doc_type should be missing");
    assert.ok(!result.has("product_type"), "product_type should be missing");
  });

  it("returns all columns when PRAGMA fails (e.g. table missing)", async () => {
    const mockExecute = async () => {
      throw new Error("no such table");
    };
    const result = await intersectWithExistingColumns(
      mockExecute,
      "data_sales",
      SALES_COLUMNS,
    );
    assert.equal(result.size, SALES_COLUMNS.length);
  });
});
