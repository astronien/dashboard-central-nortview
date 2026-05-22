const XLSX = require("xlsx");

const files = [
  "Current May26.xlsx",
  "Last YOY APR25.xlsx",
  "Last mom Mar26.xlsx",
  "Staff.xlsx",
  "Category MasterFeb.xlsx"
];

files.forEach(file => {
  const filePath = "/Users/astronien/Desktop/dashboard new version/" + file;
  try {
    const wb = XLSX.readFile(filePath);
    console.log(`\n=== File: ${file} ===`);
    console.log("Sheet names:", wb.SheetNames);
    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      console.log(`  Sheet: "${sheetName}" - Rows count: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`    Keys in first row:`, Object.keys(rows[0]));
      }
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
