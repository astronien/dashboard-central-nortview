const XLSX = require("xlsx");

const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);

const numericColumns = {};

currentRows.forEach(row => {
  for (const [key, val] of Object.entries(row)) {
    const num = Number(String(val ?? "").replace(/[^\d.-]/g, ""));
    if (!isNaN(num) && typeof val !== "boolean") {
      numericColumns[key] = (numericColumns[key] || 0) + num;
    }
  }
});

console.log("=== Column Sums (Raw numeric values) ===");
for (const [col, sum] of Object.entries(numericColumns)) {
  console.log(`${col}: ${sum}`);
}

console.log("\n=== Checking combinations of quantity multiplication ===");
let sumQtyTimesBillAmount = 0;
let sumQtyTimesUnitPrice = 0;
let sumQtyTimesTotalPrice = 0;
let sumQtyTimesSetPrice = 0;

currentRows.forEach(row => {
  const qty = Number(row["Number"] || row["qty"] || 0);
  const billAmount = Number(row["ราคาขายตามบิล"] || 0);
  const unitPrice = Number(row["ราคาขาย/หน่วย"] || 0);
  const totalPrice = Number(row["Total Price"] || 0);
  const setPrice = Number(row["Set Price"] || 0);

  sumQtyTimesBillAmount += qty * billAmount;
  sumQtyTimesUnitPrice += qty * unitPrice;
  sumQtyTimesTotalPrice += qty * totalPrice;
  sumQtyTimesSetPrice += qty * setPrice;
});

console.log("Qty * billAmount:", sumQtyTimesBillAmount);
console.log("Qty * unitPrice:", sumQtyTimesUnitPrice);
console.log("Qty * totalPrice:", sumQtyTimesTotalPrice);
console.log("Qty * setPrice:", sumQtyTimesSetPrice);
