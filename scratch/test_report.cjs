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

const calculateMetrics = (target, actual, currentDay, totalDays, lastMonth, lastYear) => {
  const achPercent = target ? (actual / target) * 100 : 0;
  const forecast = currentDay ? (actual / currentDay) * totalDays : 0;
  const forecastPercent = target ? (forecast / target) * 100 : 0;
  const momPercent = lastMonth ? ((actual - lastMonth) / lastMonth) * 100 : 0;
  const yoyPercent = lastYear ? ((actual - lastYear) / lastYear) * 100 : 0;
  const targetPerDay = totalDays ? (target / totalDays) * currentDay : 0;
  const diffPerDay = actual - targetPerDay;
  return { achPercent, forecast, forecastPercent, momPercent, yoyPercent, targetPerDay, diffPerDay };
};

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

  const branchSummary = new Map();
  const officerSummary = new Map();
  const categorySummary = new Map();

  // Pre-populate branchSummary from target branches
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

  // Pre-calculate Category Targets by summing them up across all targetRows
  const catsToSum = ["iPhone", "Mac", "iPad", "Apple Watch", "SIM", "BTB"];
  targetRows.forEach((row) => {
    catsToSum.forEach((cat) => {
      const key = normalizeText(cat);
      const targetVal = toNumber(row[cat] ?? row[cat.toLowerCase()]);
      const catItem = categorySummary.get(key) ?? { actual: 0, target: 0 };
      catItem.target += targetVal;
      categorySummary.set(key, catItem);
    });
  });

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
      if (period === "current") branchItem.actual += actual; else if (period === "lastMonth") branchItem.lastMonth += actual; else branchItem.lastYear += actual;
      branchSummary.set(branchKey, branchItem);
      
      // Update Category summary (only count actual sales in CURRENT period)
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
  mergeSales(lastMonthRows, "lastMonth"); 
  mergeSales(lastYearRows, "lastYear");

  // Post-calculate officer achievement rates
  officerSummary.forEach((state) => {
    state.rate = state.target ? Math.round((state.actual / state.target) * 100) : 0;
  });

  const branches = [...branchSummary.values()].map((r) => ({ ...r, ...calculateMetrics(r.target, r.actual, r.currentDay, r.totalDays, r.lastMonth, r.lastYear) }));
  const categories = [...categorySummary.entries()].map(([category, value]) => ({ category, actual: value.actual, target: value.target || Math.max(value.actual, 1), share: 0 }));
  const totalActual = categories.reduce((s, r) => s + r.actual, 0) || 1; categories.forEach((c) => { c.share = Math.round((c.actual / totalActual) * 100); });
  return { branches, categories, officers: [...officerSummary.values()], fileName };
};

async function main() {
  try {
    const targetRows = await loadUploadKind("target");
    const currentRows = await loadUploadKind("current");
    const lastMonthRows = await loadUploadKind("lastMonth");
    const lastYearRows = await loadUploadKind("lastYear");
    const categoryRows = await loadUploadKind("categoryMaster");

    const report = buildReport(targetRows, currentRows, lastMonthRows, lastYearRows, categoryRows, "test");
    
    console.log("=== Report Summary ===");
    console.log("Branches length:", report.branches.length);
    report.branches.forEach(b => {
      console.log(`- ${b.label}: target=${b.target}, actual=${b.actual}, lastMonth=${b.lastMonth}, lastYear=${b.lastYear}`);
    });

    const totalSales = report.branches.reduce((sum, branch) => sum + branch.actual, 0);
    console.log("\nComputed totalSales of all branches:", totalSales);
    
    const totalCategorySales = report.categories.reduce((sum, c) => sum + c.actual, 0);
    console.log("Computed totalCategorySales:", totalCategorySales);

    // Let's print categories and their actuals
    console.log("\nCategories actuals:");
    report.categories.forEach(c => {
      console.log(`- ${c.category}: ${c.actual}`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
