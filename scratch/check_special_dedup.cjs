require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    const target = 51767335;

    // We will try different special de-duplication rules:
    // 1. Only deduplicate if Serial is not NULL/null/empty. If Serial is NULL, keep all.
    const unique1 = [];
    const seen1 = new Set();
    rows.forEach(row => {
      const serial = String(row["Serial"] ?? "").trim().toLowerCase();
      if (serial === "null" || serial === "" || serial === "undefined") {
        unique1.push(row);
      } else {
        const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["Serial"]}`;
        if (!seen1.has(key)) {
          seen1.add(key);
          unique1.push(row);
        }
      }
    });

    let sumVal1 = 0, sumPrice1 = 0;
    unique1.forEach(r => { sumVal1 += getCategoryValue(r); sumPrice1 += toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]); });
    console.log("Rule 1 (Deduplicate only if Serial is not NULL) - Count:", unique1.length);
    console.log("  Sum CategoryValue:", sumVal1.toFixed(2), "diff:", (sumVal1 - target).toFixed(2));
    console.log("  Sum Price:", sumPrice1.toFixed(2), "diff:", (sumPrice1 - target).toFixed(2));

    // 2. Deduplicate by JSON stringified row (entire row matches exactly)
    const unique2 = {};
    rows.forEach(row => {
      // clean keys like Counter or ID before comparison?
      const key = JSON.stringify(row);
      unique2[key] = row;
    });
    let sumVal2 = 0, sumPrice2 = 0;
    Object.values(unique2).forEach(r => { sumVal2 += getCategoryValue(r); sumPrice2 += toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]); });
    console.log("\nRule 2 (Deduplicate by entire JSON row) - Count:", Object.values(unique2).length);
    console.log("  Sum CategoryValue:", sumVal2.toFixed(2), "diff:", (sumVal2 - target).toFixed(2));
    console.log("  Sum Price:", sumPrice2.toFixed(2), "diff:", (sumPrice2 - target).toFixed(2));

    // 3. What if there was a duplicate upload, meaning each chunk/file was uploaded twice?
    // Let's analyze if there's any row key that appears exactly N times for almost all duplicates!
    const keyCounts = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}_${row["Serial"]}_${row["Officer (Name)"]}_${row["Doc Date"]}`;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    });
    const counts = Object.values(keyCounts);
    const freq = {};
    counts.forEach(c => freq[c] = (freq[c] || 0) + 1);
    console.log("\nRow duplication frequencies:", freq);

  } catch (err) {
    console.error(err);
  }
}

main();
