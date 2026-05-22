require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    const target = 51767335;

    // We will analyze all numbers in each column to see if they sum up to target
    // Or if some filter on columns yields target.
    
    // Let's first look at all unique values in "Finish"
    const finishes = [...new Set(rows.map(r => String(r.Finish).trim()))];
    console.log("Unique Finish values:", finishes);

    // Let's look at all unique values in "Sell Type"
    const sellTypes = [...new Set(rows.map(r => String(r["Sell Type"] ?? r.sellType).trim()))];
    console.log("Unique Sell Types:", sellTypes);

    // Let's check some simple filters:
    // Filter 1: Finish = 'รับเงินครบแล้ว'
    // Filter 2: Sell Type = 'เงินเชื่อ' or 'เงินสด' etc.
    // Let's also check if de-duplicating by core Excel columns (excluding autoincrement ID and counter) gives a sum of 52237417.23.
    // Wait, why does the de-duplicated sum differ from 51767335?
    // Let's calculate the difference: 52,237,417.23 - 51,767,335 = 470,082.23.
    // What if 470,082.23 represents some specific transactions?
    // Let's see if 470,082.23 matches a specific day's sales or a specific branch's sales?
    
    // Group de-duplicated rows by date
    const uniqueMap = {};
    rows.forEach(r => {
      const key = `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}_${r["Serial"]}_${r["Officer (Name)"]}_${r["Doc Date"]}`;
      uniqueMap[key] = r;
    });
    const uniqueRows = Object.values(uniqueMap);
    console.log("Unique rows count:", uniqueRows.length);

    const dateSales = {};
    uniqueRows.forEach(r => {
      const dateStr = String(r["Doc Date"] ?? "").split(" ")[0]; // e.g. "พฤ."
      const fullDate = String(r["Doc Date"] ?? "").split(" ")[1]; // e.g. "14/05/2026"
      if (!fullDate) return;
      const val = toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]);
      dateSales[fullDate] = (dateSales[fullDate] || 0) + val;
    });

    console.log("\nSales by Date (De-duplicated):");
    const sortedDates = Object.keys(dateSales).sort((a, b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      if (ya !== yb) return ya - yb;
      if (ma !== mb) return ma - mb;
      return da - db;
    });

    sortedDates.forEach(d => {
      console.log(`- Date: ${d} | Sum: ${dateSales[d].toFixed(2)}`);
    });

    // Let's check if any subset of dates sums to target
    console.log("\nChecking subsets of dates for exact target...");
    function findDateSubset(index, currentSum, subset) {
      if (Math.abs(currentSum - target) < 5) {
        console.log(`MATCH FOUND: subset ${subset.join(", ")} = ${currentSum}`);
      }
      for (let i = index; i < sortedDates.length; i++) {
        findDateSubset(i + 1, currentSum + dateSales[sortedDates[i]], [...subset, sortedDates[i]]);
      }
    }
    findDateSubset(0, 0, []);

  } catch (err) {
    console.error(err);
  }
}

main();
