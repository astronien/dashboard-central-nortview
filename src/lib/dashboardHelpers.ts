import { cleanOfficerName as sharedCleanOfficerName, matchesOfficer as sharedMatchesOfficer, normalizeText as sharedNormalizeText, toNumber as sharedToNumber, getSalesDate as sharedGetSalesDate, type RawRow } from "./dashboardUtils";

export type UploadKind = "target" | "current" | "today" | "lastMonth" | "lastYear" | "categoryMaster";

export const normalizeText = sharedNormalizeText;
export const toNumber = sharedToNumber;
export const cleanOfficerName = sharedCleanOfficerName;
export const matchesOfficer = sharedMatchesOfficer;
export const getSalesDate = sharedGetSalesDate;

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

export const filterRowsByBranch = (rows: RawRow[], branch: string) => {
  if (!rows?.length) return [];
  const normParam = cleanBranchForMatching(branch);
  if (!normParam) return rows;
  return rows.filter((row) => {
    const rowBranchVal = row["Branch (Name)"] || row["BRANCH NAME"] || (row as any).branch_name || (row as any).shop_name || "";
    const normRow = cleanBranchForMatching(rowBranchVal);
    return normRow && normParam && (normRow.includes(normParam) || normParam.includes(normRow));
  });
};

export const getUploadKind = (headers: string[]): UploadKind => {
  const normalized = headers.map(sharedNormalizeText);
  if (normalized.some((h) => h.includes("cat & sub cat") || h.includes("cat daily"))) return "categoryMaster";
  if (normalized.some((h) => h.includes("staff id") || h.includes("branch name"))) return "target";
  return "current";
};

export const mapTargetCategoryKey = (category: string, subCategory = "", productName = "") => {
  const text = sharedNormalizeText(`${category} ${subCategory} ${productName}`);
  if (text.includes("btb apple") || text.includes("btb(apple)")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  if (text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  if (text.includes("smartphone")) return "Smartphone";
  return category || "Other";
};

export { calculateMetrics } from "./targetAggregations";

export const getRowKey = (row: RawRow) => [
  String(row["Doc No"] ?? "").trim(),
  String(row["Product (Name)"] ?? "").replace(/\s+/g, " ").trim(),
  String(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice ?? "").trim(),
  String(row["Serial"] ?? "").trim(),
  String(row["Doc Date"] ?? "").trim(),
].join("||");

export const getAttachCategoryOptions = (rows: RawRow[]) => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    const category = String(row["CAT Daily"] ?? row["Category (Name)"] ?? (row as any).category ?? "").trim();
    if (category) keys.add(category);
  });
  return ["all", ...Array.from(keys).sort((a, b) => a.localeCompare(b))];
};

export const getCategoryForSalesRow = (row: RawRow): string => {
  const cat = String(row["Category (Name)"] ?? (row as any).category_name ?? (row as any).Category ?? "").trim();
  const sub = String(row["Sub Category"] ?? (row as any).sub_category ?? (row as any).SubCategory ?? "").trim();
  const prod = String(row["Product (Name)"] ?? (row as any).product_name ?? (row as any).Product ?? "").trim();

  const text = normalizeText(`${cat} ${sub} ${prod}`);

  // Corporate checks must come first so device keywords do not steal corporate rows
  if (text.includes("btb apple") || text.includes("btb(apple)")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";

  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";

  if (text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";

  return "Other";
};
