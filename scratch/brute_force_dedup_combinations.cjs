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

    // We will test various subsets of fields to use as de-duplication keys
    const fieldCombos = [
      ["Doc No"],
      ["Doc No", "Product (Code)"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล", "Serial"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล", "Serial", "Officer (Name)"],
      ["Doc No", "Product (Code)", "ราคาขายตามบิล", "Serial", "Officer (Name)", "Doc Date"],
      ["Doc No", "Product (Code)", "Serial"],
      ["Doc No", "Serial"],
      ["Doc No", "Product (Code)", "Doc Date"],
    ];

    console.log("\n=== Checking Standard Field Combinations ===");
    for (const fields of fieldCombos) {
      // 1. Strict de-duplication: keep only one (the last or first)
      const uniq = {};
      rows.forEach(r => {
        const key = fields.map(f => String(r[f] ?? "")).join("||");
        uniq[key] = r;
      });
      const uniqueList = Object.values(uniq);

      let sumCat = 0;
      let sumPrice = 0;
      uniqueList.forEach(r => {
        sumCat += getCategoryValue(r);
        sumPrice += toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]);
      });

      console.log(`Key: [${fields.join(", ")}] | Unique Count: ${uniqueList.length}`);
      console.log(`  - CategoryValue Sum: ${sumCat.toFixed(2)} | Diff: ${(sumCat - target).toFixed(2)}`);
      console.log(`  - Price Sum: ${sumPrice.toFixed(2)} | Diff: ${(sumPrice - target).toFixed(2)}`);
      
      if (Math.abs(sumCat - target) < 100 || Math.abs(sumPrice - target) < 100) {
        console.log(`  *** CLOSE MATCH FOUND! ***`);
      }
    }

    // 2. Conditional de-duplication:
    // e.g. group by [Doc No, Product Code, Price] but keep duplicates if serial is unique non-empty
    console.log("\n=== Checking Conditional Serial De-duplication ===");
    // Rule: Group by [Doc No, Product Code, Price].
    // If we have unique non-empty serials, keep one per unique serial.
    // If serial is empty, keep only one.
    const uniqCond = [];
    const seenCond = {};
    rows.forEach(row => {
      const docNo = String(row["Doc No"]).trim();
      const prodCode = String(row["Product (Code)"]).trim();
      const price = String(row["ราคาขายตามบิล"]).trim();
      const serial = String(row["Serial"] ?? "").trim().toLowerCase();
      
      const key = `${docNo}_${prodCode}_${price}`;
      if (!seenCond[key]) {
        seenCond[key] = [];
      }
      
      const isDuplicate = seenCond[key].some(item => {
        const itemSerial = String(item["Serial"] ?? "").trim().toLowerCase();
        if (serial && serial !== "null" && serial !== "undefined" && itemSerial && itemSerial !== "null" && itemSerial !== "undefined") {
          return itemSerial === serial;
        }
        return true;
      });

      if (!isDuplicate) {
        seenCond[key].push(row);
        uniqCond.push(row);
      }
    });

    let sumCondCat = 0;
    let sumCondPrice = 0;
    uniqCond.forEach(r => {
      sumCondCat += getCategoryValue(r);
      sumCondPrice += toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]);
    });
    console.log(`Conditional Serial Count: ${uniqCond.length}`);
    console.log(`  - CategoryValue Sum: ${sumCondCat.toFixed(2)} | Diff: ${(sumCondCat - target).toFixed(2)}`);
    console.log(`  - Price Sum: ${sumCondPrice.toFixed(2)} | Diff: ${(sumCondPrice - target).toFixed(2)}`);

  } catch (err) {
    console.error(err);
  }
}

main();
