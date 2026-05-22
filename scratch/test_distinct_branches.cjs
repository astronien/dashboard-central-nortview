require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

async function main() {
  const rows = await loadUploadKind("current");
  const branches = [...new Set(rows.map(r => String(r["Branch (Name)"] ?? "").trim()))];
  console.log("Distinct Branch (Name) in current rows:", branches);
}
main();
