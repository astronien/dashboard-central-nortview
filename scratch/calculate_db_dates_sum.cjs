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

    const daily = {};
    rows.forEach(row => {
      const parts = String(row["Doc Date"] ?? "").split(" ");
      const docDate = parts[1] || "Unknown";
      if (!daily[docDate]) {
        daily[docDate] = 0;
      }
      daily[docDate] += getCategoryValue(row);
    });

    const sortedDates = Object.keys(daily).sort((a,b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      if (ya !== yb) return ya - yb;
      if (ma !== mb) return ma - mb;
      return da - db;
    });

    let runningSum = 0;
    console.log("=== Running Sums ===");
    sortedDates.forEach(date => {
      runningSum += daily[date];
      console.log(`- Date: ${date} | Daily Sum: ${daily[date].toFixed(2)} | Running Sum: ${runningSum.toFixed(2)}`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
