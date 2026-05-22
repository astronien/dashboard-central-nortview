const XLSX = require("xlsx");

const targetPath = "/Users/astronien/Desktop/dashboard new version/Staff.xlsx";
const currentPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";

const targetRows = XLSX.utils.sheet_to_json(XLSX.readFile(targetPath).Sheets[XLSX.readFile(targetPath).SheetNames[0]]);
const currentRows = XLSX.utils.sheet_to_json(XLSX.readFile(currentPath).Sheets[XLSX.readFile(currentPath).SheetNames[0]]);

console.log("Target Sheet Rows count:", targetRows.length);
console.log("First target row:", targetRows[0]);
const targetBranches = [...new Set(targetRows.map(r => r["BRANCH NAME"]))];
console.log("Unique target branches:", targetBranches);

console.log("\nSales Sheet Rows count:", currentRows.length);
console.log("First sales row:", currentRows[0]);
const salesBranches = [...new Set(currentRows.map(r => r["Branch (Name)"]))];
console.log("Unique sales branches:", salesBranches);
