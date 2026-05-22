require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

// Parse date string like "พฤ. 14/05/2026 18:33:00" to Date object
function parseDocDate(str) {
  if (!str) return null;
  const parts = str.split(" ");
  if (parts.length < 2) return null;
  const dateStr = parts[1]; // "14/05/2026"
  const dateParts = dateStr.split("/");
  if (dateParts.length < 3) return null;
  return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
}

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    const target = 51767335;

    // Parse all rows with Date objects and values
    const parsedRows = rows.map(row => {
      const date = parseDocDate(row["Doc Date"] ?? row["doc date"]);
      return {
        row,
        date,
        dateStr: date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` : 'Unknown',
        val: getCategoryValue(row),
        price: toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"])
      };
    }).filter(r => r.date !== null);

    // Get all unique date strings
    const uniqueDates = [...new Set(parsedRows.map(r => r.dateStr))].sort((a,b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      if (ya !== yb) return ya - yb;
      if (ma !== mb) return ma - mb;
      return da - db;
    });

    console.log("Unique dates count:", uniqueDates.length);

    let found = false;

    // Loop through all start and end date combinations
    for (let i = 0; i < uniqueDates.length; i++) {
      for (let j = i; j < uniqueDates.length; j++) {
        const startDateStr = uniqueDates[i];
        const endDateStr = uniqueDates[j];

        const [sda, sma, sya] = startDateStr.split("/").map(Number);
        const [eda, ema, eya] = endDateStr.split("/").map(Number);

        const startDate = new Date(sya, sma - 1, sda);
        const endDate = new Date(eya, ema - 1, eda);
        endDate.setHours(23, 59, 59, 999);

        // Filter rows in this date range
        const rangeRows = parsedRows.filter(r => r.date >= startDate && r.date <= endDate);

        // Try different sums:
        // 1. Plain CategoryValue sum
        let sumVal = 0;
        rangeRows.forEach(r => sumVal += r.val);

        // 2. Plain Price sum
        let sumPrice = 0;
        rangeRows.forEach(r => sumPrice += r.price);

        // 3. De-duplicated by DocNo+ProdCode+Price CategoryValue sum
        const unique1 = {};
        rangeRows.forEach(r => {
          const key = `${r.row["Doc No"]}_${r.row["Product (Code)"]}_${r.row["ราคาขายตามบิล"]}`;
          unique1[key] = r;
        });
        let sumValDedup = 0;
        let sumPriceDedup = 0;
        Object.values(unique1).forEach(r => {
          sumValDedup += r.val;
          sumPriceDedup += r.price;
        });

        if (Math.abs(sumVal - target) < 2) {
          console.log(`MATCH (Plain CategoryValue) | Range: ${startDateStr} to ${endDateStr} | Sum: ${sumVal} | Target: ${target}`);
          found = true;
        }
        if (Math.abs(sumPrice - target) < 2) {
          console.log(`MATCH (Plain Price) | Range: ${startDateStr} to ${endDateStr} | Sum: ${sumPrice} | Target: ${target}`);
          found = true;
        }
        if (Math.abs(sumValDedup - target) < 2) {
          console.log(`MATCH (Dedup CategoryValue) | Range: ${startDateStr} to ${endDateStr} | Sum: ${sumValDedup} | Target: ${target}`);
          found = true;
        }
        if (Math.abs(sumPriceDedup - target) < 2) {
          console.log(`MATCH (Dedup Price) | Range: ${startDateStr} to ${endDateStr} | Sum: ${sumPriceDedup} | Target: ${target}`);
          found = true;
        }
      }
    }

    if (!found) {
      console.log("No matching date ranges found.");
    }

  } catch (err) {
    console.error(err);
  }
}

main();
