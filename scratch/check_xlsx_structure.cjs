const XLSX = require("xlsx");

const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
const workbook = XLSX.readFile(currentPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log("Total rows in Current May26.xlsx:", rows.length);

// 1. Check if there are any rows with Number > 1
const multipleQty = rows.filter(r => (Number(r.Number) || 0) > 1);
console.log("Rows with Number > 1:", multipleQty.length);
if (multipleQty.length > 0) {
  console.log("Sample rows with Number > 1:");
  multipleQty.slice(0, 5).forEach(r => {
    console.log(`- Doc No: ${r["Doc No"]} | Product: ${r["Product (Name)"]} | Qty: ${r.Number} | Price: ${r["ราคาขายตามบิล"]}`);
  });
}

// 2. Check if there are any duplicate rows in the original Excel file!
// Group by [Doc No, Product (Code), ราคาขายตามบิล]
const groups = {};
rows.forEach(r => {
  const key = `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}`;
  if (!groups[key]) groups[key] = [];
  groups[key].push(r);
});

const duplicates = Object.entries(groups).filter(([k, list]) => list.length > 1);
console.log("\nGroups with duplicates in original Excel file:", duplicates.length);
if (duplicates.length > 0) {
  console.log("Sample duplicates in original Excel:");
  duplicates.slice(0, 5).forEach(([k, list]) => {
    console.log(`- Key: ${k} | Count: ${list.length}`);
    list.forEach(r => {
      console.log(`  - Serial: ${r.Serial} | Officer: ${r["Officer (Name)"]} | Date: ${r["Doc Date"]}`);
    });
  });
}
