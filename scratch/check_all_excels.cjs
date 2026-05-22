const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const dir = "/Users/astronien/Desktop/dashboard new version";

const files = fs.readdirSync(dir).filter(f => f.endsWith(".xlsx"));

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`\n=== File: ${file} ===`);
    workbook.SheetNames.forEach(sheetName => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log(`  Sheet: ${sheetName} | Rows: ${rows.length}`);
      if (rows.length > 0) {
        // Print column headers
        console.log("  Headers:", Object.keys(rows[0]));
        // Try calculating sums
        let sumBill = 0;
        let sumTotal = 0;
        let sumCatVal = 0;
        rows.forEach(row => {
          sumBill += toNumber(row["ราคาขายตามบิล"] ?? row["bill_amount"]);
          sumTotal += toNumber(row["Total Price"] ?? row["total_price"]);
          sumCatVal += getCategoryValue(row);
        });
        console.log(`    Sum bill_amount: ${sumBill.toFixed(2)}`);
        console.log(`    Sum total_price: ${sumTotal.toFixed(2)}`);
        console.log(`    Sum CategoryValue: ${sumCatVal.toFixed(2)}`);
        
        // De-dup by Doc No, Product Code, Price
        const u = {};
        rows.forEach(row => {
          const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
          u[key] = row;
        });
        let sumUniqueBill = 0;
        let sumUniqueCatVal = 0;
        Object.values(u).forEach(row => {
          sumUniqueBill += toNumber(row["ราคาขายตามบิล"]);
          sumUniqueCatVal += getCategoryValue(row);
        });
        console.log(`    Unique rows: ${Object.keys(u).length}`);
        console.log(`    Unique Sum bill_amount: ${sumUniqueBill.toFixed(2)}`);
        console.log(`    Unique Sum CategoryValue: ${sumUniqueCatVal.toFixed(2)}`);
      }
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
