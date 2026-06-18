import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migratePreset } from "./presetStorage";

const TEST_PATTERNS = [/^testxx$/i, /^test\d*$/i, /^ทดสอบ/i, /\btest\b/i];

function isTestName(name: string): boolean {
  return TEST_PATTERNS.some((p) => p.test(name));
}

describe("test-pattern filtering (cleanup logic)", () => {
  it("matches 'testxx' (case-insensitive)", () => {
    assert.equal(isTestName("testxx"), true);
    assert.equal(isTestName("TESTXX"), true);
    assert.equal(isTestName("TestXX"), true);
  });

  it("matches 'test' and 'test1', 'test2' etc", () => {
    assert.equal(isTestName("test"), true);
    assert.equal(isTestName("test1"), true);
    assert.equal(isTestName("test42"), true);
  });

  it("matches 'ทดสอบ' (Thai test)", () => {
    assert.equal(isTestName("ทดสอบ"), true);
    assert.equal(isTestName("ทดสอบ COVER+"), true);
  });

  it("matches any name containing 'test' word", () => {
    assert.equal(isTestName("my test preset"), true);
    assert.equal(isTestName("Production test"), true);
  });

  it("does NOT match production preset names", () => {
    assert.equal(isTestName("Attach Smile"), false);
    assert.equal(isTestName("Attach Film"), false);
    assert.equal(isTestName("Case iPhone"), false);
    assert.equal(isTestName("SIM TURBO"), false);
    assert.equal(isTestName("Production"), false);
  });

  it("does NOT match empty/null", () => {
    assert.equal(isTestName(""), false);
  });

  it("migratePreset handles null safely", () => {
    const out = migratePreset(null);
    assert.deepEqual(out, {});
  });
});
