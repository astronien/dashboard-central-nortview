require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    // Let's count duplicate rows
    const rowCounts = {};
    let duplicatesCount = 0;
    let duplicateSum = 0;

    const toNumber = (val) => Number(String(val ?? "").replace(/[^\d.-]/g, "")) || 0;

    rows.forEach(row => {
      // Create a unique key for the row
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}_${row["Officer (Name)"]}`;
      if (!rowCounts[key]) {
        rowCounts[key] = { count: 0, row };
      }
      rowCounts[key].count += 1;
    });

    const uniqueRows = [];
    let sumUnique = 0;

    for (const [key, info] of Object.entries(rowCounts)) {
      uniqueRows.push(info.row);
      const price = toNumber(info.row["ราคาขายตามบิล"] ?? info.row["Total Price"]);
      sumUnique += price;
      if (info.count > 1) {
        duplicatesCount += (info.count - 1);
        duplicateSum += price * (info.count - 1);
      }
    }

    console.log("Unique rows count:", uniqueRows.length);
    console.log("Sum of unique rows prices:", sumUnique);
    console.log("Duplicates rows count:", duplicatesCount);
    console.log("Sum of duplicate rows prices:", duplicateSum);

    // Print some examples of duplicates
    console.log("\nSome duplicates examples:");
    let printed = 0;
    for (const [key, info] of Object.entries(rowCounts)) {
      if (info.count > 1 && printed < 5) {
        console.log(`- Key: ${key} | Count: ${info.count} | Price: ${info.row["ราคาขายตามบิล"]}`);
        printed += 1;
      }
    }

  } catch (err) {
    console.error(err);
  }
}

main();
