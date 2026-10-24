import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPreset } from "./presetEngine";
import { parseBills } from "./presetBills";
import { emptyItemFilter, type Preset } from "./presetTypes";
import type { RawRow } from "./salesAggregations";

let doc = 0;
const line = (over: RawRow): RawRow => ({
  "Doc No": `D${++doc}`,
  "Doc Date": "01/10/2026",
  "Officer (Name)": "A",
  "Product Type": "Inventory Item",
  "Total Price": 100,
  Number: 1,
  ...over,
});
const cover = (code: string, name: string, model = "") =>
  line({ "Category (Name)": "Smile", "Sub Category": "INSURANCE", "Product (Code)": code, "Product (Name)": name, Model: model });
const iphone = (sub: string) =>
  line({ "Category (Name)": "iPhone", "Sub Category": sub, "Product (Name)": `Apple ${sub}`, Model: sub });

const coverPreset = (models: string[], productNames: string[] = []): Preset =>
  ({
    id: "c",
    name: "COVER+",
    calcType: "attach",
    filtersA: [{ ...emptyItemFilter(), categories: ["Smile"], models, productNames }],
    filtersB: [{ ...emptyItemFilter(), categories: ["iPhone"], subCategories: ["IPHONE 16", "IPHONE 17", "IPHONE AIR"] }],
  }) as Preset;

const rows = [
  cover("COVERPLUS1001", "COVER+ with AppleCare Services for Apple iPhone 17 Pro / 17 Pro Max (1-Year)", "Cover+ with Apple Care Services (1+1)"),
  cover("COVERPLUS1006", "COVER+ with AppleCare Services for Apple iPhone Duo (1-Year)"),
  cover("COVERPLUS1008", "COVER+ with AppleCare Services for Apple iPhone Duo (1-Year) (New)", "Cover+ with Apple Care Services (1+1)"),
  cover("COVERPLUS2006", "COVER+ with AppleCare Services for Apple iPhone Duo (2-Year)"),
  cover("7CAREFREEC01", "7CARE+ Free for COVER+ with AppleCare Services (1-Year)", "Cover+ with Apple Care Services (1+1)"),
  iphone("IPHONE 17"),
  iphone("IPHONE DUO"),
  iphone("IPHONE 18 PRO MAX"),
  iphone("IPHONE 15"),
  line({ "Category (Name)": "iPhone", "Sub Category": "IPHONE CASE", "Product (Name)": "Case iPhone Duo" }),
];

describe("preset auto-match for new models", () => {
  it("COVER+ preset counts new COVER+ SKUs of the same term, never the 7CARE+ freebie", () => {
    const bills = parseBills(rows);
    // like the default preset: ticked models AND ticked product names
    const all = calcPreset(
      bills,
      coverPreset(
        ["Cover+ with Apple Care Services (1+1)", "Cover+ with Apple Care Services (2Y)"],
        ["COVER+ with AppleCare Services for Apple iPhone 17 Pro / 17 Pro Max (1-Year)"],
      ),
    );
    assert.equal(all.billsWithAandB, 4);
    const oneYearOnly = calcPreset(bills, coverPreset([], ["COVER+ with AppleCare Services for Apple iPhone (1-Year)"]));
    assert.equal(oneYearOnly.billsWithAandB, 3, "2-Year Duo SKU stays out of a 1-Year preset");
  });

  it("iPhone sub list picks up newer / named models, not older ones or attach items", () => {
    const r = calcPreset(parseBills(rows), coverPreset(["COVER PLUS"]));
    // IPHONE 17 (listed) + DUO + 18 PRO MAX; IPHONE 15 is older than the list, IPHONE CASE isn't a model
    assert.equal(r.billsWithB, 3);
  });

  it("keyword presets are left alone", () => {
    const p = coverPreset([]);
    p.filtersA = [{ ...emptyItemFilter(), categories: ["Smile"], productNameContains: ["Duo (2-Year)"] }];
    assert.equal(calcPreset(parseBills(rows), p).billsWithAandB, 1);
  });
});
