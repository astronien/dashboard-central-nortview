require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const cleanOfficerName = (name) => {
  const aliases = { "แพวนภา": "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

async function main() {
  try {
    const targetRows = await loadUploadKind("target");
    const currentRows = await loadUploadKind("current");

    console.log("Targets count:", targetRows.length);
    console.log("Current sales count:", currentRows.length);

    const targetOfficerKeys = new Set();
    targetRows.forEach(row => {
      const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
      if (name) {
        targetOfficerKeys.add(cleanOfficerName(name));
      }
    });

    console.log("Target officer keys count:", targetOfficerKeys.size);

    let sumWithAllOfficers = 0;
    let sumWithMatchedOfficersOnly = 0;
    let sumWithNoOfficerMatched = 0;

    currentRows.forEach(row => {
      const val = getCategoryValue(row);
      const officerName = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
      const officerKey = cleanOfficerName(officerName);
      
      sumWithAllOfficers += val;
      if (targetOfficerKeys.has(officerKey)) {
        sumWithMatchedOfficersOnly += val;
      } else {
        sumWithNoOfficerMatched += val;
      }
    });

    console.log("Sum with all officers:", sumWithAllOfficers);
    console.log("Sum with matched officers only:", sumWithMatchedOfficersOnly);
    console.log("Sum with unmatched officers:", sumWithNoOfficerMatched);

  } catch (err) {
    console.error(err);
  }
}

main();
