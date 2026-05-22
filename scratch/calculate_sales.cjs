const XLSX = require("xlsx");
const path = require("path");

const targetPath = "/Users/astronien/Desktop/dashboard new version/Staff.xlsx";
const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const categoryMasterPath = "/Users/astronien/Desktop/dashboard new version/Category MasterFeb.xlsx";

const targetRows = XLSX.utils.sheet_to_json(XLSX.readFile(targetPath).Sheets[XLSX.readFile(targetPath).SheetNames[0]]);
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);
const categoryMasterRows = XLSX.utils.sheet_to_json(XLSX.readFile(categoryMasterPath).Sheets[XLSX.readFile(categoryMasterPath).SheetNames[0]]);

const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();
const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const cleanOfficerName = (name) => {
  const aliases = { "แพวนภา": "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

const mapTargetCategoryKey = (category, subCategory = "", productName = "") => {
  const text = normalizeText(`${category} ${subCategory} ${productName}`);
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  if (text.includes("btb") || text.includes("business") || text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  return category || "Other";
};

// SIMULATE buildReport
const categoryMap = new Map();
categoryMasterRows.forEach((row) => {
  const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
  const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
  if (key) categoryMap.set(key, value);
});

const branchTargets = new Map();
const targetByOfficer = new Map();
targetRows.forEach((row) => {
  const branchKey = normalizeText(row["BRANCH NAME"]);
  const officerKey = cleanOfficerName(`${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim());
  
  const targetVal = toNumber(row.Total);
  const days = toNumber(row.DAY) || 30;
  
  const currentBranchTarget = branchTargets.get(branchKey) ?? { totalTarget: 0, days: 30 };
  currentBranchTarget.totalTarget += targetVal;
  currentBranchTarget.days = Math.max(currentBranchTarget.days, days);
  branchTargets.set(branchKey, currentBranchTarget);
  
  targetByOfficer.set(officerKey, [...(targetByOfficer.get(officerKey) ?? []), row]);
});

const branchSummary = new Map();
const officerSummary = new Map();
const categorySummary = new Map();

branchTargets.forEach((info, branchKey) => {
  const targetRow = targetRows.find((row) => normalizeText(row["BRANCH NAME"]) === branchKey);
  const branchName = String(targetRow?.["BRANCH NAME"] ?? "Unknown Branch").trim();
  const totalDays = info.days || 30;
  const currentDay = Math.min(totalDays, new Date().getDate());
  
  branchSummary.set(branchKey, {
    label: branchName,
    target: info.totalTarget,
    actual: 0,
    lastMonth: 0,
    lastYear: 0,
    currentDay,
    totalDays,
  });
});

targetRows.forEach((row) => {
  const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
  if (!name) return;
  const officerKey = cleanOfficerName(name);
  const branch = String(row["BRANCH NAME"] ?? "").trim();
  officerSummary.set(officerKey, {
    name,
    branch,
    actual: 0,
    target: toNumber(row.Total),
    rate: 0,
  });
});

const mergeSales = (rows, period) => {
  rows.forEach((row) => {
    const branch = String(row["Branch (Name)"] ?? "Unknown Branch").trim();
    const officer = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
    const categoryName = String(row["Category (Name)"] ?? "Other").trim();
    const sub = String(row["Sub Category"] ?? "").trim();
    const product = String(row["Product (Name)"] ?? "").trim();
    const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);
    
    const branchKey = normalizeText(branch);
    const targetInfo = branchTargets.get(branchKey);
    const totalDays = targetInfo?.days || 30;
    const currentDay = Math.min(totalDays, new Date().getDate());
    const actual = getCategoryValue(row);
    
    // Update Branch summary
    const branchItem = branchSummary.get(branchKey) ?? { label: branch, target: 0, actual: 0, lastMonth: 0, lastYear: 0, currentDay, totalDays };
    branchItem.target = targetInfo ? targetInfo.totalTarget : branchItem.target;
    if (period === "current") branchItem.actual += actual;
    branchSummary.set(branchKey, branchItem);
    
    // Update Category summary
    const catKey = normalizeText(mapped);
    const catItem = categorySummary.get(catKey) ?? { actual: 0, target: 0 };
    if (period === "current") {
      catItem.actual += actual;
    }
    categorySummary.set(catKey, catItem);
    
    // Update Officer summary
    const officerKey = cleanOfficerName(officer);
    let officerState = officerSummary.get(officerKey);
    if (!officerState) {
      officerState = { name: officer, branch, actual: 0, target: 0, rate: 0 };
      officerSummary.set(officerKey, officerState);
    }
    if (period === "current") {
      officerState.actual += actual;
    }
  });
};

mergeSales(currentRows, "current");

// Summaries
const totalBranchActual = [...branchSummary.values()].reduce((sum, b) => sum + b.actual, 0);
const totalCategoryActual = [...categorySummary.values()].reduce((sum, c) => sum + c.actual, 0);
const totalOfficerActual = [...officerSummary.values()].reduce((sum, o) => sum + o.actual, 0);

console.log("totalBranchActual:", totalBranchActual);
console.log("totalCategoryActual:", totalCategoryActual);
console.log("totalOfficerActual:", totalOfficerActual);
console.log("Branches in summary:", [...branchSummary.values()].map(b => b.label));
