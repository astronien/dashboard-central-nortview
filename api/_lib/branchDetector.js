/**
 * Branch detector for LINE Bot uploads.
 *
 * The user's Excel file contains a `Branch (ID)` column (e.g. "645",
 * "700", "9999"). The bot reads this to determine which branch the
 * upload belongs to. If the file contains multiple distinct branch
 * IDs, we reject the upload (Q-B: error on mixed).
 *
 * Usage:
 *   const result = detectBranchFromRows(rows);
 *   if (result.error) { /* reject *\/ }
 *   const branchId = result.branchId; // "645"
 */

const BRANCH_FIELD_CANDIDATES = [
  "Branch (ID)",
  "Branch ID",
  "branch_id",
  "BRANCH ID",
  "emp_shop_code",
  "emp_shop_code",
  "Shop ID",
  "shop_id",
];

function pickField(row, keys) {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/**
 * Read Branch (ID) from the first non-empty row.
 * Returns an object with:
 *   - branchId:  string (the detected branch ID) or null
 *   - error:     string (error message) or null
 *   - allBranches: string[] (all distinct branch IDs found)
 */
export function detectBranchFromRows(rows) {
  if (!rows || rows.length === 0) {
    return { branchId: null, error: "ไฟล์ว่างเปล่า ไม่สามารถระบุสาขาได้", allBranches: [] };
  }

  const branches = new Set();
  for (const r of rows) {
    const b = pickField(r, BRANCH_FIELD_CANDIDATES);
    if (b) branches.add(b);
  }

  if (branches.size === 0) {
    return {
      branchId: null,
      error: "ไม่พบ Branch (ID) ในไฟล์ — กรุณาตรวจสอบว่าคอลัมน์ Branch (ID) มีข้อมูล",
      allBranches: [],
    };
  }

  if (branches.size > 1) {
    return {
      branchId: null,
      error: `พบหลายสาขาในไฟล์ (${Array.from(branches).join(", ")}) กรุณาตรวจสอบไฟล์`,
      allBranches: Array.from(branches),
    };
  }

  return {
    branchId: Array.from(branches)[0],
    error: null,
    allBranches: Array.from(branches),
  };
}
