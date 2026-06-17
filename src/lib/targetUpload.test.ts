import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { _internalNormalize as normalizeTarget } from "./targetUpload";

const buildWorkbook = (rows: Record<string, unknown>[]) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
};

describe("parseTargetExcelFile (via _internalNormalize)", () => {
  it("returns [] for an empty workbook", () => {
    const wb = XLSX.utils.book_new();
    const result = normalizeTarget(wb);
    assert.equal(result.length, 0);
  });

  it("parses a complete target row (TGMay26 sample)", () => {
    const wb = buildWorkbook([
      {
        ID: "1",
        "BRANCH NAME": "ID104 : iStudio by SPVI-Central World",
        RSM: "ชนจันทร์",
        ASM: "สุธิดา",
        "STAFF ID": "25293",
        NAME: "ฟารีดา",
        SURNAME: "มะโนรัตน์",
        DAY: "22",
        POSISION: "Sales Specialist",
        Total: "500000",
        Mac: "0",
        iPad: "0",
      },
    ]);
    const [row] = normalizeTarget(wb);
    assert.equal(row["BRANCH NAME"], "ID104 : iStudio by SPVI-Central World");
    assert.equal(row["RSM"], "ชนจันทร์");
    assert.equal(row["ASM"], "สุธิดา");
    assert.equal(row["STAFF ID"], "25293");
    assert.equal(row["NAME"], "ฟารีดา");
    assert.equal(row["SURNAME"], "มะโนรัตน์");
    assert.equal(row["DAY"], "22");
    assert.equal(row["POSISION"], "Sales Specialist");
    assert.equal(row["Total"], "500000");
    assert.equal(row["Mac"], "0");
    assert.equal(row["iPad"], "0");
  });

  it("falls back to empty string for missing fields", () => {
    const wb = buildWorkbook([
      {
        "BRANCH NAME": "iStudio Iconsiam",
        "STAFF ID": "12345",
        NAME: "สมชาย",
        SURNAME: "ใจดี",
        Total: "300000",
      },
    ]);
    const [row] = normalizeTarget(wb);
    assert.equal(row["BRANCH NAME"], "iStudio Iconsiam");
    assert.equal(row["STAFF ID"], "12345");
    assert.equal(row["NAME"], "สมชาย");
    assert.equal(row["SURNAME"], "ใจดี");
    assert.equal(row["Total"], "300000");
    assert.equal(row["DAY"], "");
    assert.equal(row["POSISION"], "");
    assert.equal(row["Mac"], "");
    assert.equal(row["iPad"], "");
    assert.equal(row["iPhone"], "");
    assert.equal(row["Apple Watch"], "");
    assert.equal(row["SIM"], "");
    assert.equal(row["BTB"], "");
    assert.equal(row["Smartphone"], "");
  });

  it("trims leading/trailing whitespace in headers", () => {
    const wb = buildWorkbook([
      {
        "BRANCH NAME ": "iStudio Asiatique", // trailing space
        " STAFF ID": "999", // leading space
        Total: "100000",
      },
    ]);
    const [row] = normalizeTarget(wb);
    assert.equal(row["BRANCH NAME"], "iStudio Asiatique");
    assert.equal(row["STAFF ID"], "999");
    assert.equal(row["Total"], "100000");
  });

  it("uses first sheet when workbook has multiple", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ "BRANCH NAME": "Sheet1Branch", "STAFF ID": "1" }]),
      "Sheet1",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ "BRANCH NAME": "Sheet2Branch", "STAFF ID": "2" }]),
      "Sheet2",
    );
    const result = normalizeTarget(wb);
    assert.equal(result.length, 1);
    assert.equal(result[0]["BRANCH NAME"], "Sheet1Branch");
  });
});
