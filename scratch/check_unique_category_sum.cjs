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

    // Let's test different de-duplication definitions!
    // Definition 1: unique by Doc No, Product (Code), and price
    const unique1 = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      unique1[key] = row;
    });
    let sum1 = 0;
    Object.values(unique1).forEach(row => { sum1 += getCategoryValue(row); });
    console.log("Unique 1 (Doc No, Product Code, Price) - Count:", Object.keys(unique1).length, "Sum:", sum1);

    // Definition 2: unique by Doc No, Serial (excluding Serial = "NULL" or "null")
    // Definition 3: unique by all fields
    const unique3 = {};
    rows.forEach(row => {
      const key = JSON.stringify(row);
      unique3[key] = row;
    });
    let sum3 = 0;
    Object.values(unique3).forEach(row => { sum3 += getCategoryValue(row); });
    console.log("Unique 3 (Entire JSON identical) - Count:", Object.keys(unique3).length, "Sum:", sum3);

    // Let's see if there is any other standard de-duplication that sums to 51767335
    // What if we de-duplicate by Product (Code), Doc No, and Sum Number?
    const unique4 = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}`;
      unique4[key] = row;
    });
    let sum4 = 0;
    Object.values(unique4).forEach(row => { sum4 += getCategoryValue(row); });
    console.log("Unique 4 (Doc No, Product Code) - Count:", Object.keys(unique4).length, "Sum:", sum4);

  } catch (err) {
    console.error(err);
  }
}

main();
