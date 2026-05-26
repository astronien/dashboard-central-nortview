import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RawRow } from "./salesAggregations";
import {
  getCategoryTargetFromUploadRow,
  getOfficerCategoryKpi,
  resolveOfficerId,
  sumOfficerCategoryActual,
} from "./officerCategoryKpi";
import { rawTargetRowsToRecords } from "./targetAggregations";

const exactMatch = (a: string, b: string) => a.trim() === b.trim();

const targetRow: RawRow = {
  NAME: "กัญญภัทร",
  SURNAME: "ชุมประยูร",
  Total: "5000000",
  iPhone: "2700000",
  Mac: "550000",
  iPad: "900000",
  "Apple Watch": "250000",
  BTB: "250000",
  "BTB(Apple)": "350000",
};

const salesRow: RawRow = {
  "Officer (Name)": "กัญญภัทร ชุมประยูร",
  "Category (Name)": "Smartphone",
  "Sub Category": "iPhone 16",
  "Product (Name)": "iPhone 16 128GB",
  "Product Type": "Inventory Item",
  "ราคาขายตามบิล": "32900",
  "Doc Date": "Mon. 26/05/2026 10:00:00",
};

describe("officerCategoryKpi", () => {
  it("resolveOfficerId reads STAFF ID from sales when target row has no emp_id", () => {
    const id = resolveOfficerId(
      "กัญญภัทร ชุมประยูร",
      [targetRow],
      rawTargetRowsToRecords([targetRow]),
      [{ ...salesRow, "STAFF ID": "E12345" }],
      exactMatch,
    );
    assert.equal(id, "E12345");
  });

  it("getCategoryTargetFromUploadRow parses per-category targets", () => {
    assert.equal(getCategoryTargetFromUploadRow(targetRow, "iPhone"), 2700000);
    assert.equal(getCategoryTargetFromUploadRow(targetRow, "Mac"), 550000);
  });

  it("sumOfficerCategoryActual aggregates by officer name and mapped category", () => {
    const getCategory = () => "iPhone";
    const total = sumOfficerCategoryActual(
      [salesRow, { ...salesRow, "ราคาขายตามบิล": "10000" }],
      "iPhone",
      "กัญญภัทร ชุมประยูร",
      "",
      getCategory,
      exactMatch,
    );
    assert.equal(total, 42900);
  });

  it("getOfficerCategoryKpi works without officerId when target row exists", () => {
    const periodStart = "2026-05-01";
    const periodEnd = "2026-05-31";
    const getCategory = () => "iPhone";
    const result = getOfficerCategoryKpi({
      category: "iPhone",
      officerName: "กัญญภัทร ชุมประยูร",
      officerId: "",
      officerTargetRow: targetRow,
      targetRecords: rawTargetRowsToRecords([targetRow]),
      currentRows: [salesRow],
      lastMonthRows: [],
      lastYearRows: [],
      periodStart,
      periodEnd,
      getCategory,
      matchesOfficer: exactMatch,
    });
    assert.equal(result.target, 2700000);
    assert.equal(result.actual, 32900);
  });
});
