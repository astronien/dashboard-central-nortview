import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncPiaFromOfficers } from "./piSync";

/**
 * Mock helpers — test the syncPiaFromOfficers behavior by passing
 * empty officer lists and a few edge cases that don't hit the DB.
 *
 * For full integration testing, see seed-admin script.
 */
describe("piSync pure logic", () => {
  it("empty officer list returns 0 created, 0 skipped, no errors", async () => {
    const r = await syncPiaFromOfficers([]);
    assert.equal(r.created, 0);
    assert.equal(r.skipped, 0);
    assert.equal(r.errors.length, 0);
  });

  it("officers without empId are skipped", async () => {
    // Stub getUserByUsername to always return null (no existing users)
    // The function will try to call getUserByUsername → fails because
    // turso isn't configured in tests. So we expect errors, not a clean run.
    // For now just verify skipped count for the empty empId case.
    const r = await syncPiaFromOfficers([
      { name: "John", empId: "", branch: "BKK" },
      { name: "Jane", empId: null, branch: null },
    ]);
    // Each call to getUserByUsername throws because turso not configured
    // Errors get caught and added to errors[]. empId-empty ones are skipped
    // before the user lookup, so they should be skipped (not errored).
    assert.ok(r.skipped >= 2, `expected at least 2 skipped, got ${r.skipped}`);
  });
});
