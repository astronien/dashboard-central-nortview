import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseThaiDate, parseDocDate, stripThaiDatePrefix } from "./dateParser";

const fmt = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "null";

describe("parseThaiDate", () => {
  it("parses ISO YYYY-MM-DD", () => {
    assert.equal(fmt(parseThaiDate("2026-06-26")), "2026-06-26");
  });
  it("parses ISO YYYY/MM/DD", () => {
    assert.equal(fmt(parseThaiDate("2026/06/26")), "2026-06-26");
  });
  it("parses dd/mm/yyyy (Thai)", () => {
    assert.equal(fmt(parseThaiDate("26/06/2026")), "2026-06-26");
  });
  it("parses dd/mm/yyyy with Buddhist year", () => {
    assert.equal(fmt(parseThaiDate("26/06/2569")), "2026-06-26");
  });
  it("parses dd/mm/yyyy first-day ambiguous as Thai", () => {
    assert.equal(fmt(parseThaiDate("01/06/2026")), "2026-06-01");
  });
  it("detects US m/d when day > 12", () => {
    assert.equal(fmt(parseThaiDate("06/26/2026")), "2026-06-26");
  });
  it("parses Thai text month", () => {
    assert.equal(fmt(parseThaiDate("26 มิ.ย. 2026")), "2026-06-26");
  });
  it("parses Thai text + Buddhist year", () => {
    assert.equal(fmt(parseThaiDate("26 มิ.ย. 2569")), "2026-06-26");
  });
  it("strips Thai day-of-week prefix", () => {
    assert.equal(fmt(parseDocDate("พ.ค. 26/06/2026")), "2026-06-26");
  });
  it("handles Excel serial", () => {
    const d = parseThaiDate(45678);
    assert.ok(d instanceof Date);
    assert.ok(d!.getFullYear() > 2020);
  });
  it("returns null for empty", () => {
    assert.equal(parseThaiDate(""), null);
  });
  it("returns null for invalid", () => {
    assert.equal(parseThaiDate("not a date"), null);
  });
});
