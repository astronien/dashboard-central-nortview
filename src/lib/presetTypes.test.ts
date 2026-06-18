import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyItemFilter,
  DEFAULT_PRESETS,
} from "./presetTypes";

describe("presetTypes", () => {
  it("DEFAULT_PRESETS has 3 entries: Attach Smile, Film, Case", () => {
    assert.equal(DEFAULT_PRESETS.length, 3);
    assert.deepEqual(
      DEFAULT_PRESETS.map((d) => d.name),
      ["Attach Smile", "Attach Film", "Attach Case"],
    );
  });

  it("emptyItemFilter returns empty arrays", () => {
    const f = emptyItemFilter();
    assert.deepEqual(f.categories, []);
    assert.deepEqual(f.subCategories, []);
    assert.deepEqual(f.models, []);
    assert.deepEqual(f.brands, []);
    assert.deepEqual(f.customerCodes, []);
    assert.deepEqual(f.productNames, []);
    assert.deepEqual(f.docTypes, []);
    assert.equal(f.includeNonInventory, false);
  });
});
