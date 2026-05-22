require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { tursoExecute } = require("../api/turso");

async function main() {
  try {
    console.log("Searching Turso database...");
    
    // Search in upload_meta
    const meta = await tursoExecute("SELECT * FROM upload_meta");
    console.log("upload_meta rows:", meta.rows);

    // Search for 51767335 in data_sales
    const sales = await tursoExecute(
      "SELECT * FROM data_sales WHERE total_price LIKE '%51767335%' OR bill_amount LIKE '%51767335%'"
    );
    console.log("data_sales search by price matches:", sales.rows?.length);

    // Search for 51767335 in data_targets
    const targets = await tursoExecute(
      "SELECT * FROM data_targets WHERE total_target LIKE '%51767335%' OR iphone LIKE '%51767335%'"
    );
    console.log("data_targets search by target matches:", targets.rows?.length);

    // Let's do a general check on the sum of data_targets
    const targetsSum = await tursoExecute(
      "SELECT SUM(CAST(total_target AS REAL)) FROM data_targets"
    );
    console.log("Sum of total_target in data_targets:", targetsSum.rows?.[0]);

  } catch (err) {
    console.error(err);
  }
}

main();
