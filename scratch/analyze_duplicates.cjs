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

    const target = 51767335;
    
    // Group all rows by a fully detailed key
    const groups = {};
    rows.forEach((row, index) => {
      // Create a compound key of all essential identifiers
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}_${row["Serial"]}_${row["Officer (Name)"]}_${row["Doc Date"]}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ row, index });
    });

    const groupKeys = Object.keys(groups);
    console.log("Total unique groups:", groupKeys.length);

    // Let's see how many groups have duplicates
    const duplicates = [];
    const uniques = [];

    groupKeys.forEach(key => {
      const list = groups[key];
      uniques.push(list[0]);
      if (list.length > 1) {
        duplicates.push({
          key,
          count: list.length,
          rows: list
        });
      }
    });

    console.log("Groups with duplicates:", duplicates.length);

    // Let's compute the sum if we keep exactly 1 from each group (de-duplicated sum)
    let sumDeDup = 0;
    uniques.forEach(item => {
      sumDeDup += getCategoryValue(item.row);
    });

    const currentFullSum = rows.reduce((sum, r) => sum + getCategoryValue(r), 0);
    console.log("Current full sum in DB (CategoryValue):", currentFullSum);
    console.log("Fully de-duplicated sum (CategoryValue):", sumDeDup);
    console.log("Difference (Full - DeDup):", currentFullSum - sumDeDup);
    console.log("Expected target:", target);
    console.log("Diff to target from Full:", currentFullSum - target);
    console.log("Diff to target from DeDup:", sumDeDup - target);

    // Let's check other de-duplication definitions and their exact sums
    const keysToTry = [
      { name: "Doc No, Product Code, Price, Serial, Officer, Date", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}_${r["Serial"]}_${r["Officer (Name)"]}_${r["Doc Date"]}` },
      { name: "Doc No, Product Code, Price, Serial, Officer", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}_${r["Serial"]}_${r["Officer (Name)"]}` },
      { name: "Doc No, Product Code, Price, Serial", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}_${r["Serial"]}` },
      { name: "Doc No, Product Code, Price", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}` },
      { name: "Doc No, Product Code", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}` },
      { name: "Doc No, Product Code, Serial", fn: r => `${r["Doc No"]}_${r["Product (Code)"]}_${r["Serial"]}` }
    ];

    keysToTry.forEach(trial => {
      const u = {};
      rows.forEach(r => {
        const k = trial.fn(r);
        u[k] = r;
      });
      let sum = 0;
      Object.values(u).forEach(r => { sum += getCategoryValue(r); });
      console.log(`De-dup key: "${trial.name}" | Count: ${Object.keys(u).length} | Sum: ${sum.toFixed(2)} | Diff: ${(sum - target).toFixed(2)}`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
