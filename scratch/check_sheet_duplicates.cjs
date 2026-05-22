const XLSX = require("xlsx");
const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);

console.log("Total rows in Current May26.xlsx:", currentRows.length);

const rowCounts = {};
let duplicatesCount = 0;
let duplicateSum = 0;
const toNumber = (val) => Number(String(val ?? "").replace(/[^\d.-]/g, "")) || 0;

currentRows.forEach(row => {
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

console.log("Unique rows count in Excel:", uniqueRows.length);
console.log("Sum of unique rows prices in Excel:", sumUnique);
console.log("Duplicates rows count in Excel:", duplicatesCount);
console.log("Sum of duplicate rows prices in Excel:", duplicateSum);
