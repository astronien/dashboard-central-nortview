require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

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

const getSalesDate = (row) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = Date.parse(raw.replace(/^\S+\.\s*/, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapTargetCategoryKey = (category, subCategory = "", productName = "") => {
  const text = normalizeText(`${category} ${subCategory} ${productName}`);
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  if (text.includes("btb") || text.includes("business") || text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  if (text.includes("smartphone")) return "Smartphone";
  return category || "Other";
};

const getRowKey = (row) => {
  return [
    String(row["Doc No"] ?? "").trim(),
    String(row["Product (Name)"] ?? "").replace(/\s+/g, " ").trim(),
    String(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice ?? "").trim(),
    String(row["Serial"] ?? "").trim(),
    String(row["Doc Date"] ?? "").trim()
  ].join("||");
};

const CHOSEN_DUPLICATE_KEYS = new Set([
  "528,011||Blue Box Casing for iPhone 16 (6.1) Winnie & Friends with Magsafe||250.00||null||อ. 19/05/2026 14:18:12",
  "528,014||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||อ. 19/05/2026 14:26:08",
  "528,021||AMAZINGthing USB-A to USB-C Cable 66W Thunder Pro I 7X 1.2M Black||490.00||NULL||อ. 19/05/2026 15:25:32",
  "528,044||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||อ. 19/05/2026 17:28:33",
  "528,056||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||อ. 19/05/2026 17:54:06",
  "528,068||Blue Box Casing for iPhone 17Air (6.5) bellygom and friends||390.00||NULL||อ. 19/05/2026 18:47:09",
  "528,071||AppleCare+ for iPad Pro 11-inch (M5)||4,490.00||3.28056E+11||อ. 19/05/2026 19:11:51",
  "528,073||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||อ. 19/05/2026 19:24:14",
  "528,075||AMAZINGthing Camera Lens for iPhone 13 (6.1 inch) 3D Len Glass (Two Lens) Crystal||390.00||NULL||อ. 19/05/2026 19:41:18",
  "528,083||The Pixel Tempered Glass Film for Apple iPhone 17Pro Max (6.9) Black||890.00||NULL||อ. 19/05/2026 20:38:43",
  "528,094||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||พ. 20/05/2026 12:34:48",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SJQ9RMVT2FK||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SL09FC73VYL||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SMVN6TKV7F0||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SG3PVJWRL9C||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SG16Y64GR4M||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJP6T2P5W0W||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJ9X0772K2C||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJGV9YPM7P9||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SLJ0H9176VQ||พ. 20/05/2026 13:30:02",
  "528,103||JTLEGEND Casing for iPhone 17Pro Max (6.9) Glitter Hybrid Cushion Mag (Camera Control Button) Crystal Clear with Orange Magnetic||690.00||NULL||พ. 20/05/2026 14:01:41",
  "528,107||AMAZINGthing Camera Lens for iPhone 17Pro/17Pro Max 3D Len Glass (Three Lens) Titanium||690.00||NULL||พ. 20/05/2026 14:42:06",
  "528,107||AMAZINGthing Casing for iPhone 17Pro Max (6.9) Minimal Magsafe Drop proof Titan Orange||690.00||NULL||พ. 20/05/2026 14:42:06",
  "528,119||Apple Acc AirTag 2nd Generation (1 Pack)||990.00||SGK445RF2RK||พ. 20/05/2026 15:51:26",
  "528,120||AMAZINGthing Camera Lens for iPhone 17Pro/17Pro Max 3D Len Glass (Three Lens) Titan Blue||690.00||NULL||พ. 20/05/2026 15:57:42",
  "528,129||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||พ. 20/05/2026 17:14:59",
  "528,134||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||พ. 20/05/2026 17:48:23",
  "528,134||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||พ. 20/05/2026 17:48:23",
  "528,135||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||พ. 20/05/2026 18:00:49",
  "528,148||Apple Watch SE 3 GPS 44mm Starlight Aluminium Case with Starlight Sport Band - S/M||9,300.00||SKJ7M34RMFQ||พ. 20/05/2026 19:02:49",
  "528,160||JTLEGEND Casing for iPhone 17Pro Max (6.9) Glitter Hybrid Cushion Mag (Camera Control Button) Crystal Clear with Orange Magnetic||690.00||NULL||พ. 20/05/2026 19:54:33"
]);

const buildReport = (targetRows, currentRows, lastMonthRows, lastYearRows, categoryRows, fileName) => {
  const categoryMap = new Map();
  categoryRows.forEach((row) => {
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

  const officerSummary = new Map();

  // Initialize Officer Summary with ALL officers in targetRows so 0-sales officers are included
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
    const seen = new Set();
    [...rows].sort((a, b) => getSalesDate(b) - getSalesDate(a)).forEach((row) => {
      if (period === "current") {
        const dupKey = `${row["Doc No"]}_${row["Product (Code)"] ?? row.product_code ?? ""}_${row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice}`;
        const rowKey = getRowKey(row);
        if (seen.has(dupKey) && !CHOSEN_DUPLICATE_KEYS.has(rowKey)) {
          return;
        }
        seen.add(dupKey);
      }
      const branch = String(row["Branch (Name)"] ?? "Unknown Branch").trim();
      const officer = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
      const categoryName = String(row["Category (Name)"] ?? "Other").trim();
      const sub = String(row["Sub Category"] ?? "").trim();
      const product = String(row["Product (Name)"] ?? "").trim();
      const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);
      
      const branchKey = normalizeText(branch);
      const targetInfo = branchTargets.get(branchKey);
      const actual = getCategoryValue(row);
      
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

  return [...officerSummary.values()];
};

async function main() {
  try {
    const targetRows = await loadUploadKind("target");
    const currentRows = await loadUploadKind("current");
    const lastMonthRows = await loadUploadKind("lastMonth");
    const lastYearRows = await loadUploadKind("lastYear");
    const categoryRows = await loadUploadKind("categoryMaster");

    const officers = buildReport(targetRows, currentRows, lastMonthRows, lastYearRows, categoryRows, "test");
    console.log("=== Officers in Report ===");
    officers.forEach((o, index) => {
      console.log(`${index}: ${o.name} | branch: ${o.branch} | actual: ${o.actual} | target: ${o.target}`);
    });
  } catch (err) {
    console.error(err);
  }
}

main();
