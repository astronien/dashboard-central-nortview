require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { tursoExecute } = require("../api/turso");

const cellValue = (cell) => {
  if (cell == null) return null;
  if (typeof cell === "object" && "value" in cell) return cell.value;
  return cell;
};

const rowValues = (row) => {
  if (!Array.isArray(row)) return [];
  return row.map(cellValue);
};

async function main() {
  try {
    const result = await tursoExecute(
      "SELECT total_price, bill_amount, quantity FROM data_sales WHERE period = 'current' LIMIT 30"
    );
    console.log("Raw columns from data_sales:");
    for (const r of (result.rows ?? [])) {
      const vals = rowValues(r);
      console.log(`- total_price: ${JSON.stringify(vals[0])} | bill_amount: ${JSON.stringify(vals[1])} | quantity: ${JSON.stringify(vals[2])}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
