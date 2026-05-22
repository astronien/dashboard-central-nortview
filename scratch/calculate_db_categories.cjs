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
    console.log("Total rows loaded:", rows.length);

    const catSums = {};
    rows.forEach(row => {
      const cat = String(row["Category (Name)"] ?? "Other").trim();
      const val = getCategoryValue(row);
      const price = toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"]);
      
      if (!catSums[cat]) {
        catSums[cat] = { count: 0, sumVal: 0, sumPrice: 0 };
      }
      catSums[cat].count += 1;
      catSums[cat].sumVal += val;
      catSums[cat].sumPrice += price;
    });

    console.log("\nCategory summaries in database:");
    console.log("Category | count | sum(getCategoryValue) | sum(price)");
    for (const [cat, info] of Object.entries(catSums)) {
      console.log(`- ${cat} | ${info.count} | ${info.sumVal.toFixed(2)} | ${info.sumPrice.toFixed(2)}`);
    }

  } catch (err) {
    console.error(err);
  }
}

main();
