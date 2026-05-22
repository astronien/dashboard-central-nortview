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
    console.log("Connecting to Turso database...");
    
    // Check tables in the database
    const tablesResult = await tursoExecute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );
    console.log("Tables in DB:", (tablesResult.rows ?? []).map(r => rowValues(r)[0]));

    // Check count of records in data_sales grouped by period
    const salesGroupResult = await tursoExecute(
      `SELECT period, COUNT(*), 
              SUM(CAST(total_price AS REAL)), 
              SUM(CAST(bill_amount AS REAL)) 
       FROM data_sales 
       GROUP BY period`
    );
    console.log("\nSales records grouped by period:");
    console.log("Columns: period | count | sum(total_price) | sum(bill_amount)");
    for (const r of (salesGroupResult.rows ?? [])) {
      const vals = rowValues(r);
      console.log(`- ${vals[0]} | ${vals[1]} | ${vals[2]} | ${vals[3]}`);
    }

    // Let's check some records from current to see if it matches our expectations
    const sampleResult = await tursoExecute(
      "SELECT DISTINCT branch_name FROM data_sales WHERE period = 'current'"
    );
    console.log("\nDistinct current branch names in DB:");
    console.log((sampleResult.rows ?? []).map(r => rowValues(r)[0]));

    // Check if there are other columns or tables that we need to inspect
    const targetCountResult = await tursoExecute("SELECT COUNT(*) FROM data_targets");
    console.log("\nTarget rows count:", rowValues(targetCountResult.rows?.[0])[0]);

  } catch (error) {
    console.error("Error executing query:", error);
  }
}

main();
