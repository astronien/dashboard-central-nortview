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

    // Analyze by Finish status
    const finishGroups = {};
    // Analyze by Sell Type
    const sellTypeGroups = {};
    // Analyze by Product Type
    const productTypeGroups = {};
    // Analyze by Vat Type
    const vatTypeGroups = {};

    rows.forEach(row => {
      const val = getCategoryValue(row);
      const finish = String(row["Finish"] ?? "Unknown").trim();
      const sellType = String(row["Sell Type"] ?? "Unknown").trim();
      const productType = String(row["Product Type"] ?? "Unknown").trim();
      const vatType = String(row["Vat Type"] ?? "Unknown").trim();

      finishGroups[finish] = (finishGroups[finish] || 0) + val;
      sellTypeGroups[sellType] = (sellTypeGroups[sellType] || 0) + val;
      productTypeGroups[productType] = (productTypeGroups[productType] || 0) + val;
      vatTypeGroups[vatType] = (vatTypeGroups[vatType] || 0) + val;
    });

    console.log("\n=== Finish Status Groups ===");
    for (const [k, v] of Object.entries(finishGroups)) {
      console.log(`- ${k}: ${v.toFixed(2)} (diff: ${(v - target).toFixed(2)})`);
    }

    console.log("\n=== Sell Type Groups ===");
    for (const [k, v] of Object.entries(sellTypeGroups)) {
      console.log(`- ${k}: ${v.toFixed(2)} (diff: ${(v - target).toFixed(2)})`);
    }

    console.log("\n=== Product Type Groups ===");
    for (const [k, v] of Object.entries(productTypeGroups)) {
      console.log(`- ${k}: ${v.toFixed(2)} (diff: ${(v - target).toFixed(2)})`);
    }

    console.log("\n=== Vat Type Groups ===");
    for (const [k, v] of Object.entries(vatTypeGroups)) {
      console.log(`- ${k}: ${v.toFixed(2)} (diff: ${(v - target).toFixed(2)})`);
    }

  } catch (err) {
    console.error(err);
  }
}

main();
