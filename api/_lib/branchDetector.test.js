import { describe, it } from "node:test";
import { detectBranchFromRows } from "./branchDetector.js";

describe("branchDetector.detectBranchFromRows", () => {
  it("returns error on empty rows", () => {
    const r = detectBranchFromRows([]);
    if (r.error === null) throw new Error("expected error for empty rows");
    if (r.branchId !== null) throw new Error("expected null branchId");
  });

  it("returns error when Branch (ID) is missing", () => {
    const r = detectBranchFromRows([{ "Other Column": "x" }]);
    if (r.error === null) throw new Error("expected error for missing branch");
    if (r.branchId !== null) throw new Error("expected null branchId");
  });

  it("returns the single branch when all rows match", () => {
    const r = detectBranchFromRows([
      { "Branch (ID)": "645" },
      { "Branch (ID)": "645" },
      { "Branch (ID)": "645" },
    ]);
    if (r.branchId !== "645") throw new Error(`expected 645, got ${r.branchId}`);
    if (r.error !== null) throw new Error(`expected no error, got ${r.error}`);
  });

  it("returns error when multiple branches are mixed", () => {
    const r = detectBranchFromRows([
      { "Branch (ID)": "645" },
      { "Branch (ID)": "700" },
    ]);
    if (r.branchId !== null) throw new Error("expected null branchId for mixed");
    if (r.error === null) throw new Error("expected error for mixed branches");
    if (r.allBranches.length !== 2) throw new Error(`expected 2 branches, got ${r.allBranches.length}`);
  });

  it("accepts Branch ID / branch_id aliases", () => {
    const r = detectBranchFromRows([{ "Branch ID": "645" }]);
    if (r.branchId !== "645") throw new Error("expected 645 from Branch ID alias");
    const r2 = detectBranchFromRows([{ "branch_id": "700" }]);
    if (r2.branchId !== "700") throw new Error("expected 700 from branch_id alias");
  });
});
