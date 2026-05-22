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
    
    // We will try different keys for grouping / de-duplication
    const fieldsSets = [
      ["Doc No", "Product (Code)", "ราคาขายตามบิล"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล", "Officer (Name)"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล", "Number"],
      ["Doc No", "Product (Code)", "Serial"],
      ["Doc No", "Product (Code)", "Serial", "ราคาขายตามบิล"],
      ["Doc No", "Product (Code)"],
      ["Doc No", "Product (Code)", "Number"],
      ["Doc No", "Product (Code)", "Officer (Name)"],
      ["Doc No", "Product (Code)", "Doc Date"],
      ["Doc No", "Product (Code)", "Doc Date", "ราคาขายตามบิล"],
      ["Doc No", "Product (Code)", "Doc Date", "Number"],
    ];

    fieldsSets.forEach(fields => {
      const unique = {};
      rows.forEach(row => {
        const key = fields.map(f => row[f]).join("_");
        unique[key] = row;
      });

      let sumCategory = 0;
      let sumPrice = 0;
      Object.values(unique).forEach(row => {
        sumCategory += getCategoryValue(row);
        sumPrice += toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"]);
      });

      console.log(`De-dup by [${fields.join(", ")}]:`);
      console.log(`  Count: ${Object.keys(unique).length}`);
      console.log(`  Sum CategoryValue: ${sumCategory.toFixed(2)} (diff: ${(sumCategory - target).toFixed(2)})`);
      console.log(`  Sum Price: ${sumPrice.toFixed(2)} (diff: ${(sumPrice - target).toFixed(2)})`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
