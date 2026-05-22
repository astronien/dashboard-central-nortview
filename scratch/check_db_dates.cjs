require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");
const XLSX = require("xlsx");

async function main() {
  try {
    const dbRows = await loadUploadKind("current");
    console.log("=== Database 'current' Period ===");
    console.log("Total rows:", dbRows.length);
    const dbDates = dbRows.map(r => String(r["Doc Date"] || r["doc date"] || "")).filter(Boolean);
    dbDates.sort();
    console.log("Min Date in DB:", dbDates[0]);
    console.log("Max Date in DB:", dbDates[dbDates.length - 1]);

    const localPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
    const localRows = XLSX.utils.sheet_to_json(XLSX.readFile(localPath).Sheets[XLSX.readFile(localPath).SheetNames[0]]);
    console.log("\n=== Local 'Current May26.xlsx' ===");
    console.log("Total rows:", localRows.length);
    const localDates = localRows.map(r => String(r["Doc Date"] || r["doc date"] || "")).filter(Boolean);
    localDates.sort();
    console.log("Min Date in Local:", localDates[0]);
    console.log("Max Date in Local:", localDates[localDates.length - 1]);

  } catch (err) {
    console.error(err);
  }
}

main();
