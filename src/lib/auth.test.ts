import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAdminRole,
  isPiaRole,
  getRoleFromMetadata,
  getStaffIdFromMetadata,
  ADMIN_ROLES,
} from "./authTypes";

describe("authTypes helpers", () => {
  it("ADMIN_ROLES includes bsm and absm only", () => {
    assert.deepEqual([...ADMIN_ROLES].sort(), ["absm", "bsm"]);
  });

  it("isAdminRole returns true for bsm and absm", () => {
    assert.equal(isAdminRole("bsm"), true);
    assert.equal(isAdminRole("absm"), true);
  });

  it("isAdminRole returns false for pia and null", () => {
    assert.equal(isAdminRole("pia"), false);
    assert.equal(isAdminRole(null), false);
    assert.equal(isAdminRole(undefined), false);
  });

  it("isPiaRole returns true only for pia", () => {
    assert.equal(isPiaRole("pia"), true);
    assert.equal(isPiaRole("bsm"), false);
    assert.equal(isPiaRole(null), false);
  });

  it("getRoleFromMetadata reads role from valid metadata", () => {
    assert.equal(getRoleFromMetadata({ role: "bsm" }), "bsm");
    assert.equal(getRoleFromMetadata({ role: "absm" }), "absm");
    assert.equal(getRoleFromMetadata({ role: "pia" }), "pia");
  });

  it("getRoleFromMetadata rejects invalid roles", () => {
    assert.equal(getRoleFromMetadata({ role: "admin" }), null);
    assert.equal(getRoleFromMetadata({ role: "" }), null);
    assert.equal(getRoleFromMetadata({ role: 123 }), null);
    assert.equal(getRoleFromMetadata({}), null);
    assert.equal(getRoleFromMetadata(null), null);
    assert.equal(getRoleFromMetadata("not an object"), null);
  });

  it("getStaffIdFromMetadata reads staff_id string", () => {
    assert.equal(getStaffIdFromMetadata({ staff_id: "25293" }), "25293");
    assert.equal(getStaffIdFromMetadata({ staff_id: "BSM001" }), "BSM001");
  });

  it("getStaffIdFromMetadata rejects missing/empty/non-string", () => {
    assert.equal(getStaffIdFromMetadata({ staff_id: "" }), null);
    assert.equal(getStaffIdFromMetadata({ staff_id: "   " }), null);
    assert.equal(getStaffIdFromMetadata({ staff_id: 123 }), null);
    assert.equal(getStaffIdFromMetadata({}), null);
    assert.equal(getStaffIdFromMetadata(null), null);
  });
});

describe("supabaseClient", () => {
  it("isSupabaseConfigured is a boolean", async () => {
    // We avoid importing supabaseClient directly because it reads
    // import.meta.env at module load (which is undefined in node test).
    // Instead, the function is exposed via the auth flow at runtime.
    const { isSupabaseConfigured } = await import("./supabaseClient");
    assert.equal(typeof isSupabaseConfigured(), "boolean");
  });
});
