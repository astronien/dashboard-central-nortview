require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

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

async function main() {
  try {
    const rows = await loadUploadKind("current");
    const categoryMap = new Map();
    const catRows = await loadUploadKind("categoryMaster");
    catRows.forEach((row) => {
      const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
      const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
      if (key) categoryMap.set(key, value);
    });

    const target = 51767335;

    // Group rows by mapped category
    const catRowsMap = {};
    rows.forEach(row => {
      const categoryName = String(row["Category (Name)"] ?? "Other").trim();
      const sub = String(row["Sub Category"] ?? "").trim();
      const product = String(row["Product (Name)"] ?? "").trim();
      const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);
      
      const key = normalizeText(mapped);
      if (!catRowsMap[key]) catRowsMap[key] = [];
      catRowsMap[key].push(row);
    });

    console.log("=== Category Sums (Case A: De-dup, Case B: Full) ===");
    const catKeys = Object.keys(catRowsMap);
    const catData = {};

    catKeys.forEach(cat => {
      const list = catRowsMap[cat];
      // Case B: full sum
      let sumFull = 0;
      list.forEach(r => sumFull += getCategoryValue(r));

      // Case A: de-dup sum
      const unique = {};
      list.forEach(r => {
        const key = `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}`;
        unique[key] = r;
      });
      let sumDedup = 0;
      Object.values(unique).forEach(r => sumDedup += getCategoryValue(r));

      catData[cat] = { sumFull, sumDedup, diff: sumFull - sumDedup };
      console.log(`Category "${cat}":`);
      console.log(`  Full Sum: ${sumFull.toFixed(2)}`);
      console.log(`  De-dup Sum: ${sumDedup.toFixed(2)}`);
      console.log(`  Diff: ${(sumFull - sumDedup).toFixed(2)}`);
    });

    // Let's do a search to see if any subset of categories being full, and the rest being de-duplicated, sums to target
    console.log("\nSearching for combination of full vs de-dup categories...");
    function search(index, currentSum, config) {
      if (index === catKeys.length) {
        if (Math.abs(currentSum - target) < 1) {
          console.log(`\nEXACT MATCH FOUND (sum: ${currentSum.toFixed(2)}):`);
          console.log(config);
        }
        return;
      }
      const cat = catKeys[index];
      // Try de-dup
      search(index + 1, currentSum + catData[cat].sumDedup, { ...config, [cat]: "dedup" });
      // Try full
      search(index + 1, currentSum + catData[cat].sumFull, { ...config, [cat]: "full" });
    }

    search(0, 0, {});

  } catch (err) {
    console.error(err);
  }
}

main();
