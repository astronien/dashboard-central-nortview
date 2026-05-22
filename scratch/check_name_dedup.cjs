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
    console.log("Total rows:", rows.length);

    // Group by Doc No, Product (Name), ราคาขายตามบิล
    const uniq = {};
    rows.forEach(r => {
      const key = `${r["Doc No"]}_${r["Product (Name)"]}_${r["ราคาขายตามบิล"]}`;
      uniq[key] = r;
    });

    const sum = Object.values(uniq).reduce((s, r) => s + getCategoryValue(r), 0);
    console.log("De-dup by [Doc No, Product (Name), ราคาขายตามบิล] Sum:", sum);
    console.log("Diff from 51767335.23:", sum - 51767335.23);

  } catch (err) {
    console.error(err);
  }
}

main();
