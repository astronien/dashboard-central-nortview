require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");
const XLSX = require("xlsx");

function parseDocDate(str) {
  if (!str) return null;
  const parts = String(str).split(" ");
  if (parts.length < 2) return null;
  const dateStr = parts[1]; // "04/05/2026"
  const dateParts = dateStr.split("/");
  if (dateParts.length < 3) return null;
  
  // time part
  const timeStr = parts[2] || "00:00:00";
  const timeParts = timeStr.split(":");
  
  return new Date(
    parseInt(dateParts[2]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[0]),
    parseInt(timeParts[0] || 0),
    parseInt(timeParts[1] || 0),
    parseInt(timeParts[2] || 0)
  );
}

async function main() {
  try {
    const dbRows = await loadUploadKind("current");
    console.log("=== DB 'current' Rows ===");
    console.log("Count:", dbRows.length);
    const dbParsed = dbRows.map(r => ({ row: r, date: parseDocDate(r["Doc Date"]) })).filter(x => x.date);
    dbParsed.sort((a, b) => a.date - b.date);
    console.log("Min Date in DB:", dbParsed[0].date, "raw:", dbParsed[0].row["Doc Date"]);
    console.log("Max Date in DB:", dbParsed[dbParsed.length - 1].date, "raw:", dbParsed[dbParsed.length - 1].row["Doc Date"]);

    const localPath = "/Users/astronien/Desktop/dashboard new version/Current May26.xlsx";
    const localRows = XLSX.utils.sheet_to_json(XLSX.readFile(localPath).Sheets[XLSX.readFile(localPath).SheetNames[0]]);
    console.log("\n=== Local 'Current May26.xlsx' ===");
    console.log("Count:", localRows.length);
    const localParsed = localRows.map(r => ({ row: r, date: parseDocDate(r["Doc Date"]) })).filter(x => x.date);
    localParsed.sort((a, b) => a.date - b.date);
    console.log("Min Date in Local:", localParsed[0].date, "raw:", localParsed[0].row["Doc Date"]);
    console.log("Max Date in Local:", localParsed[localParsed.length - 1].date, "raw:", localParsed[localParsed.length - 1].row["Doc Date"]);

  } catch (err) {
    console.error(err);
  }
}

main();
