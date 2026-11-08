/**
 * Helper บริสุทธิ์สำหรับจับคู่ชื่อพนักงาน / สาขา และ normalize ข้อความ
 * (แยกจาก App.tsx — ไม่มี state/closure)
 */

/** ตัดช่องว่าง/อักขระพิเศษ ให้เทียบข้อความได้ตรง (ไทย+อังกฤษ+ตัวเลข) */
export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

/** ล้างชื่อสาขาให้เหลือแต่แก่น (ตัดคำว่า Studio7/iStudio/รหัส ฯลฯ) เพื่อเทียบสาขา */
export const cleanBranchForMatching = (val: unknown): string => {
  if (!val) return "";
  let clean = String(val).toLowerCase();
  clean = clean.replace(/id\s*:?\s*\d+/g, "");
  clean = clean.replace(/istudio\s*by\s*spvi/g, "");
  clean = clean.replace(/istudio/g, "");
  clean = clean.replace(/studio\s*7/g, "");
  clean = clean.replace(/studio7/g, "");
  clean = clean.replace(/studio/g, "");
  clean = clean.replace(/spvi/g, "");
  clean = clean.replace(/uficon/g, "");
  clean = clean.replace(/copperwired/g, "");
  clean = clean.replace(/iserve/g, "");
  clean = clean.replace(/dotlife/g, "");
  clean = clean.replace(/banana\s*it/g, "");
  clean = clean.replace(/banana/g, "");
  clean = clean.replace(/plaza/g, "");
  clean = clean.replace(/[^a-z0-9ก-๙]/gi, "");
  return clean.trim();
};

/** กรองเฉพาะแถวของสาขาที่เลือก (เทียบแบบ include สองทาง) */
export const filterRowsByBranch = (rows: any[], branch: string) => {
  if (!rows || !rows.length) return [];
  const normParam = cleanBranchForMatching(branch);
  if (!normParam) return rows;
  return rows.filter((row) => {
    const rowBranchVal =
      row["Branch (Name)"] || row["BRANCH NAME"] || row.branch_name || row.shop_name || "";
    const normRow = cleanBranchForMatching(rowBranchVal);
    return normRow && normParam && (normRow.includes(normParam) || normParam.includes(normRow));
  });
};

/** ล้างชื่อพนักงาน (ตัดคำนำหน้า/ช่องว่าง + แก้สะกดที่พบบ่อย) */
export const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { แพวนภา: "แพรวนภา" };
  let cleaned = normalizeText(name)
    .replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "")
    .replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

/** ชื่อสองอันเป็นคนเดียวกันไหม (ชื่อเต็มเหมือนกัน หรือชื่อแรกตรงกัน) */
export const matchesOfficer = (a: string, b: string) => {
  if (!a || !b) return false;
  const cleanA = cleanOfficerName(a);
  const cleanB = cleanOfficerName(b);
  if (cleanA === cleanB) return true;
  const firstA = cleanOfficerName(a.split(/\s+/)[0] || "");
  const firstB = cleanOfficerName(b.split(/\s+/)[0] || "");
  if (firstA && firstB && firstA === firstB) return true;
  return false;
};
