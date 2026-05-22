const XLSX = require("xlsx");
const path = require("path");

const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);

console.log("Total rows in Current May26.xlsx:", currentRows.length);

const daily = {};
const toNumber = (val) => Number(String(val ?? "").replace(/[^\d.-]/g, "")) || 0;

currentRows.forEach(row => {
  const docDate = String(row["Doc Date"] ?? "").split(" ")[1] || "Unknown";
  if (!daily[docDate]) {
    daily[docDate] = { count: 0, sum: 0 };
  }
  daily[docDate].count += 1;
  daily[docDate].sum += toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"]);
});

console.log("=== Daily Counts and Sums in Excel ===");
const sortedDates = Object.keys(daily).sort();
sortedDates.forEach(date => {
  console.log(`- Date: ${date} | Count: ${daily[date].count} | Sum: ${daily[date].sum.toFixed(2)}`);
});
