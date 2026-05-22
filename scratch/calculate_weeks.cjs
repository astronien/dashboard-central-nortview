require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

// Parse date string like "พฤ. 14/05/2026 18:33:00" to Date object
function parseDocDate(str) {
  if (!str) return null;
  const parts = str.split(" ");
  if (parts.length < 2) return null;
  const dateStr = parts[1]; // "14/05/2026"
  const dateParts = dateStr.split("/");
  if (dateParts.length < 3) return null;
  return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
}

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows in database:", rows.length);

    let week1Rows = [];
    let week2Rows = [];

    const cutOffDate = new Date(2026, 4, 10, 23, 59, 59); // May 10, 2026

    rows.forEach(row => {
      const date = parseDocDate(row["Doc Date"] ?? row["doc date"]);
      if (date && date <= cutOffDate) {
        week1Rows.push(row);
      } else {
        week2Rows.push(row);
      }
    });

    console.log(`\n--- Week 1 (May 4 - May 10) ---`);
    console.log("Rows count:", week1Rows.length);
    let sum1Val = 0, sum1Price = 0;
    week1Rows.forEach(r => { sum1Val += getCategoryValue(r); sum1Price += toNumber(r["ราคาขายตามบิล"]); });
    console.log("Sum CategoryValue:", sum1Val);
    console.log("Sum Price:", sum1Price);

    console.log(`\n--- Week 2 (May 11 - May 17) ---`);
    console.log("Rows count:", week2Rows.length);
    let sum2Val = 0, sum2Price = 0;
    week2Rows.forEach(r => { sum2Val += getCategoryValue(r); sum2Price += toNumber(r["ราคาขายตามบิล"]); });
    console.log("Sum CategoryValue:", sum2Val);
    console.log("Sum Price:", sum2Price);

    // De-duplicating each week
    const deDup = (wRows) => {
      const unique = {};
      wRows.forEach(row => {
        const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
        unique[key] = row;
      });
      return Object.values(unique);
    };

    const w1Unique = deDup(week1Rows);
    const w2Unique = deDup(week2Rows);

    console.log(`\n--- De-duplicated sums ---`);
    let u1Price = 0, u1Val = 0;
    w1Unique.forEach(r => { u1Val += getCategoryValue(r); u1Price += toNumber(r["ราคาขายตามบิล"]); });
    console.log("Week 1 Unique Price Sum:", u1Price);

    let u2Price = 0, u2Val = 0;
    w2Unique.forEach(r => { u2Val += getCategoryValue(r); u2Price += toNumber(r["ราคาขายตามบิล"]); });
    console.log("Week 2 Unique Price Sum:", u2Price);
    
    console.log("Combined Unique Price Sum:", u1Price + u2Price);

  } catch (err) {
    console.error(err);
  }
}

main();
