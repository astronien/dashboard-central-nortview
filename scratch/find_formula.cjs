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

    // Formula 1: De-duplicate strictly by [Doc No, Product (Code), ราคาขายตามบิล]
    const uniq1 = {};
    rows.forEach(r => {
      const key = `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}`;
      uniq1[key] = r;
    });
    const sum1 = Object.values(uniq1).reduce((s, r) => s + getCategoryValue(r), 0);
    console.log("Formula 1: Sum CategoryValue:", sum1, "diff:", sum1 - target);

    // Formula 2: Group by [Doc No, Product (Code), ราคาขายตามบิล]
    // But keep duplicates if they have different non-empty Serial numbers!
    const uniq2 = [];
    const seen2 = {};
    rows.forEach(row => {
      const docNo = String(row["Doc No"]).trim();
      const prodCode = String(row["Product (Code)"]).trim();
      const price = String(row["ราคาขายตามบิล"]).trim();
      const serial = String(row["Serial"] ?? "").trim().toLowerCase();
      
      const key = `${docNo}_${prodCode}_${price}`;
      if (!seen2[key]) {
        seen2[key] = [];
      }
      
      // Check if we already have this exact row or same serial
      const isDuplicate = seen2[key].some(item => {
        const itemSerial = String(item["Serial"] ?? "").trim().toLowerCase();
        // If serial is not empty and not 'null', check for identical serial
        if (serial && serial !== "null" && serial !== "undefined" && itemSerial && itemSerial !== "null" && itemSerial !== "undefined") {
          return itemSerial === serial;
        }
        // If serial is empty, we treat it as a duplicate anyway
        return true;
      });

      if (!isDuplicate) {
        seen2[key].push(row);
        uniq2.push(row);
      }
    });

    const sum2 = uniq2.reduce((s, r) => s + getCategoryValue(r), 0);
    console.log("Formula 2 (Different Serial kept): Sum CategoryValue:", sum2, "diff:", sum2 - target);

    // Formula 3: De-deduplicate by entire Excel fields:
    // [Doc No, Product (Code), ราคาขายตามบิล, Serial, Officer (Name), Doc Date]
    const uniq3 = {};
    rows.forEach(r => {
      const key = `${r["Doc No"]}_${r["Product (Code)"]}_${r["ราคาขายตามบิล"]}_${r["Serial"]}_${r["Officer (Name)"]}_${r["Doc Date"]}`;
      uniq3[key] = r;
    });
    const sum3 = Object.values(uniq3).reduce((s, r) => s + getCategoryValue(r), 0);
    console.log("Formula 3 (Strict row de-dup): Sum CategoryValue:", sum3, "diff:", sum3 - target);

    // Formula 4: What if we only de-duplicate when Serial is exactly identical (if serial exists), and we do NOT de-duplicate when serial is empty?
    const uniq4 = [];
    const seen4 = {};
    rows.forEach(row => {
      const serial = String(row["Serial"] ?? "").trim().toLowerCase();
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      
      if (serial && serial !== "null" && serial !== "undefined" && serial !== "") {
        const dupKey = `${key}_${serial}`;
        if (!seen4[dupKey]) {
          seen4[dupKey] = true;
          uniq4.push(row);
        }
      } else {
        // If serial is empty, we de-duplicate by key!
        if (!seen4[key]) {
          seen4[key] = true;
          uniq4.push(row);
        }
      }
    });
    const sum4 = uniq4.reduce((s, r) => s + getCategoryValue(r), 0);
    console.log("Formula 4 (De-dup empty serial, distinct non-empty serial): Sum CategoryValue:", sum4, "diff:", sum4 - target);

  } catch (err) {
    console.error(err);
  }
}

main();
