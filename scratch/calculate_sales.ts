import * as XLSX from "xlsx";
import * as path from "path";

const filePath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows: any[] = XLSX.utils.sheet_to_json(sheet);

console.log("Total rows:", rows.length);

const toNumber = (val: any) => Number(String(val ?? "").replace(/[^\d.-]/g, "")) || 0;

let sumTotalPrice = 0;
let sumBillingPrice = 0;
let sumWithSimQty = 0;
let sumWithSimPrice = 0;

rows.forEach((row, i) => {
  const tp = toNumber(row["Total Price"] ?? row["totalPrice"]);
  const bp = toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
  const cat = String(row["Category (Name)"] ?? row.category ?? row.cat ?? "").toLowerCase();
  
  sumTotalPrice += tp;
  sumBillingPrice += bp;

  // Simulate getCategoryValue logic
  if (cat.includes("sim")) {
    const qty = toNumber(row["Number"] ?? row["number"] ?? row["qty"]);
    sumWithSimQty += qty;
    sumWithSimPrice += bp;
  } else {
    sumWithSimQty += bp;
    sumWithSimPrice += bp;
  }
});

console.log("sumTotalPrice:", sumTotalPrice);
console.log("sumBillingPrice:", sumBillingPrice);
console.log("sumWithSimQty (original logic):", sumWithSimQty);
console.log("sumWithSimPrice (correct revenue logic for all):", sumWithSimPrice);
