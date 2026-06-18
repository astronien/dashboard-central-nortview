import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migratePreset } from "./presetStorage";

describe("presetStorage.migratePreset", () => {
  it("converts old filterA/filterB to filtersA/filtersB", () => {
    const old = {
      id: "1",
      name: "Old",
      color: "green",
      labelA: "A",
      labelB: "B",
      filterA: { categories: ["iPhone"], subCategories: [], models: [] },
      filterB: { categories: ["Mac"], subCategories: [], models: [] },
    };
    const migrated = migratePreset(old);
    assert.ok(Array.isArray(migrated.filtersA));
    assert.ok(Array.isArray(migrated.filtersB));
    assert.equal(migrated.filtersA.length, 1);
    assert.equal(migrated.filtersB.length, 1);
    assert.equal(migrated.filtersA[0].categories[0], "iPhone");
    assert.equal(migrated.filtersB[0].categories[0], "Mac");
  });

  it("migrates nested filters in new format", () => {
    const input = {
      id: "1",
      name: "New",
      color: "blue",
      labelA: "A",
      labelB: "B",
      filtersA: [
        {
          categories: ["X"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
      filtersB: [
        {
          categories: ["Y"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
    };
    const out = migratePreset(input);
    assert.equal(out.filtersA[0].categories[0], "X");
    assert.equal(out.filtersB[0].categories[0], "Y");
  });

  it("migrates old single field name to array", () => {
    const old = {
      id: "1",
      name: "Legacy",
      color: "amber",
      labelA: "A",
      labelB: "B",
      filterA: { category: "iPhone", subCategory: "iPhone 15", model: "Pro" },
      filterB: { category: "Mac" },
    };
    const out = migratePreset(old);
    assert.deepEqual(out.filtersA[0].categories, ["iPhone"]);
    assert.deepEqual(out.filtersA[0].subCategories, ["iPhone 15"]);
    assert.deepEqual(out.filtersA[0].models, ["Pro"]);
    assert.deepEqual(out.filtersB[0].categories, ["Mac"]);
  });

  it("handles null input", () => {
    const out = migratePreset(null);
    assert.deepEqual(out, {});
  });
});
