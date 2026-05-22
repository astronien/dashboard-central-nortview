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
    console.log("Loading current upload from Turso...");
    const rows = await loadUploadKind("current");
    console.log("Number of current rows:", rows.length);
    
    let sumBillAmount = 0;
    let sumTotalPrice = 0;
    let sumCategoryValue = 0;

    rows.forEach(row => {
      sumBillAmount += toNumber(row["ราคาขายตามบิล"]);
      sumTotalPrice += toNumber(row["Total Price"]);
      sumCategoryValue += getCategoryValue(row);
    });

    console.log("Sum bill_amount (parsed JS):", sumBillAmount);
    console.log("Sum total_price (parsed JS):", sumTotalPrice);
    console.log("Sum getCategoryValue (parsed JS):", sumCategoryValue);
    
    // Check if there are multiple branch names in the database
    const branches = [...new Set(rows.map(r => r["Branch (Name)"]))];
    console.log("Unique branches in database:", branches);

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
