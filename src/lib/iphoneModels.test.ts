import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractIphoneModels,
  iphoneModelOf,
  isDemoIphoneRow,
  isExcludedIphoneDeviceRow,
  listIphoneModels,
  mentionsExcludedIphoneModel,
  normalizeDemoIphoneRows,
  shortIphoneModel,
} from "./iphoneModels";
import type { RawRow } from "./salesAggregations";

const device = (sub: string, prod: string): RawRow => ({
  "Category (Name)": "iPhone",
  "Sub Category": sub,
  "Product (Name)": prod,
  Number: 1,
});

describe("iphoneModels", () => {
  it("extracts models from names", () => {
    assert.deepEqual(extractIphoneModels("Apple iPhone 17 Pro Max 256GB Silver"), ["IPHONE 17 PRO MAX"]);
    assert.deepEqual(extractIphoneModels("Apple iPhone 17e 256GB White"), ["IPHONE 17E"]);
    assert.deepEqual(extractIphoneModels("Camera Lens iPhone 18Pro/18Pro Max"), ["IPHONE 18 PRO"]);
    assert.deepEqual(extractIphoneModels("iPhone Duo Folio"), ["IPHONE DUO"]);
    assert.deepEqual(extractIphoneModels("Apple iPhone 15 128GB Black"), ["IPHONE 15"]);
  });

  it("model of a device row comes from Sub Category", () => {
    assert.equal(iphoneModelOf(device("IPHONE 17 PRO MAX", "Apple iPhone 17 Pro Max 256GB")), "IPHONE 17 PRO MAX");
    assert.equal(iphoneModelOf(device("IPHONE AIR", "Apple iPhone Air 256GB")), "IPHONE AIR");
    assert.equal(shortIphoneModel("IPHONE 17 PRO MAX"), "17 Pro Max");
    assert.equal(shortIphoneModel("IPHONE 17E"), "17e");
  });

  it("excludes only the ticked models, never attach items", () => {
    const ex = new Set(["IPHONE 18 PRO MAX"]);
    assert.equal(isExcludedIphoneDeviceRow(device("IPHONE 18 PRO MAX", "Apple iPhone 18 Pro Max 256GB"), ex), true);
    assert.equal(isExcludedIphoneDeviceRow(device("IPHONE 18 PRO", "Apple iPhone 18 Pro 256GB"), ex), false);
    assert.equal(
      isExcludedIphoneDeviceRow(device("COVER+", "COVER+ with AppleCare for iPhone 18 Pro Max"), ex),
      false,
    );
    assert.equal(isExcludedIphoneDeviceRow(device("IPHONE 18 PRO MAX", "x"), new Set()), false);
  });

  it("attach items split by the model they mention", () => {
    const ex = new Set(["IPHONE 18 PRO MAX"]);
    assert.equal(mentionsExcludedIphoneModel({ "Product (Name)": "Film iPhone 18 Pro Max" }, ex), true);
    assert.equal(mentionsExcludedIphoneModel({ "Product (Name)": "Film iPhone 17 Pro Max" }, ex), false);
  });

  it("lists models newest generation first with units", () => {
    const list = listIphoneModels([
      device("IPHONE 17", "Apple iPhone 17 256GB"),
      device("IPHONE 18 PRO", "Apple iPhone 18 Pro 256GB"),
      device("IPHONE 17", "Apple iPhone 17 512GB"),
      device("IPHONE AIR", "Apple iPhone Air"),
      device("FILM", "Film iPhone 17"),
    ]);
    assert.deepEqual(
      list.map((m) => [m.model, m.generation, m.units]),
      [
        ["IPHONE 18 PRO", "18", 1],
        ["IPHONE 17", "17", 2],
        ["IPHONE AIR", "AIR", 1],
      ],
    );
  });

  it("demo iPhones become iPhone devices", () => {
    const demo: RawRow = {
      "Category (Name)": "Apple Demo",
      "Sub Category": "DEMO IPHONE",
      "Product (Name)": "D7@ Apple iPhone 17 Pro Max 256GB Deep Blue",
      "Total Price": 35500,
    };
    const other: RawRow = { "Category (Name)": "Apple Demo", "Product (Name)": "D7@ Apple iPad Air" };
    assert.equal(isDemoIphoneRow(demo), true);
    assert.equal(isDemoIphoneRow(other), false);
    const [n, o] = normalizeDemoIphoneRows([demo, other]);
    assert.equal(n["Category (Name)"], "iPhone");
    assert.equal(n["Sub Category"], "IPHONE 17 PRO MAX");
    assert.equal(n["Category (Raw)"], "Apple Demo");
    assert.equal(o, other);
    const untouched = [other];
    assert.equal(normalizeDemoIphoneRows(untouched), untouched);
  });
});
