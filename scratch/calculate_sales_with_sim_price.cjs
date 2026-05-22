const XLSX = require("xlsx");

const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

let totalSalesWithSimPrice = 0;
let totalSalesWithSimUnit = 0;

currentRows.forEach(row => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  const price = toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
  const qty = toNumber(row.Number ?? row.number ?? row.qty);
  
  if (category.includes("sim")) {
    totalSalesWithSimUnit += qty;
    totalSalesWithSimPrice += price;
  } else {
    totalSalesWithSimUnit += price;
    totalSalesWithSimPrice += price;
  }
});

console.log("Total sales with SIM counted as units (original logic):", totalSalesWithSimUnit);
console.log("Total sales with SIM counted as price (monetary logic):", totalSalesWithSimPrice);
