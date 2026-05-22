require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    const groups = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const target = 51767335;
    const baseSum = Object.values(groups).reduce((sum, list) => sum + getCategoryValue(list[0]), 0);
    console.log("Base Sum (Strict De-dup):", baseSum);
    console.log("Difference needed to reach target:", target - baseSum);

    // Let's analyze groups with size > 1
    const dupGroups = Object.entries(groups).filter(([k, list]) => list.length > 1);
    console.log("Total groups with duplicates:", dupGroups.length);

    // Let's look at the serial numbers in these duplicates
    let serialMatches = 0;
    let serialDiffs = 0;
    let serialNulls = 0;

    dupGroups.forEach(([key, list]) => {
      const serials = list.map(r => String(r.Serial ?? "").trim().toLowerCase());
      const allNull = serials.every(s => s === "" || s === "null" || s === "undefined");
      if (allNull) {
        serialNulls++;
      } else {
        // Check if there are distinct non-empty serials
        const nonEmpty = serials.filter(s => s !== "" && s !== "null" && s !== "undefined");
        const uniqueNonEmpty = new Set(nonEmpty);
        if (uniqueNonEmpty.size > 1) {
          serialDiffs++;
        } else {
          serialMatches++;
        }
      }
    });

    console.log(`Groups where all serials are empty/null: ${serialNulls}`);
    console.log(`Groups where serials are identical: ${serialMatches}`);
    console.log(`Groups where serials are distinct/different: ${serialDiffs}`);

    // Let's print the groups with distinct/different serials
    console.log("\n=== Groups with Distinct/Different Serials ===");
    let distinctSerialsAddedSum = 0;
    dupGroups.forEach(([key, list]) => {
      const serials = list.map(r => String(r.Serial ?? "").trim().toLowerCase());
      const nonEmpty = serials.filter(s => s !== "" && s !== "null" && s !== "undefined");
      const uniqueNonEmpty = new Set(nonEmpty);
      if (uniqueNonEmpty.size > 1) {
        // If we keep one copy per unique serial, how much is added?
        const val = getCategoryValue(list[0]);
        // We add (uniqueNonEmpty.size - 1) * val
        const added = (uniqueNonEmpty.size - 1) * val;
        distinctSerialsAddedSum += added;
        console.log(`Key: ${key} | Val: ${val} | Unique Serials: [${[...uniqueNonEmpty].join(", ")}] | Added: ${added}`);
      }
    });

    console.log("\nSum added by keeping distinct serials:", distinctSerialsAddedSum);
    console.log("Resulting sum (Strict De-dup + Distinct Serials):", baseSum + distinctSerialsAddedSum);
    console.log("Diff from target:", (baseSum + distinctSerialsAddedSum) - target);

  } catch (err) {
    console.error(err);
  }
}

main();
