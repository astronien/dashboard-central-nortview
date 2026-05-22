require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

async function checkPeriod(periodName) {
  try {
    const rows = await loadUploadKind(periodName);
    console.log(`=== Period: ${periodName} ===`);
    console.log("Number of rows:", rows.length);
    if (!rows.length) return;

    let sumBillAmount = 0;
    let sumTotalPrice = 0;
    let sumCategoryValue = 0;

    rows.forEach(row => {
      sumBillAmount += toNumber(row["ราคาขายตามบิล"] ?? row["bill_amount"]);
      sumTotalPrice += toNumber(row["Total Price"] ?? row["total_price"]);
      sumCategoryValue += getCategoryValue(row);
    });

    console.log("Sum bill_amount (parsed JS):", sumBillAmount.toFixed(2));
    console.log("Sum total_price (parsed JS):", sumTotalPrice.toFixed(2));
    console.log("Sum getCategoryValue (parsed JS):", sumCategoryValue.toFixed(2));

    // Also check unique rows count and price sum
    const unique = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      unique[key] = row;
    });
    let sumPriceDedup = 0;
    Object.values(unique).forEach(row => {
      sumPriceDedup += toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"]);
    });
    console.log("Unique rows count:", Object.keys(unique).length);
    console.log("Sum unique Price:", sumPriceDedup.toFixed(2));

  } catch (error) {
    console.error(`Error checking period ${periodName}:`, error);
  }
}

async function main() {
  await checkPeriod("current");
  await checkPeriod("lastMonth");
  await checkPeriod("lastYear");
}

main();
