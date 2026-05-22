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
    console.log("Total rows:", rows.length);

    const targetDiff = 52537224.23 - 51767335;
    console.log("Target difference to find:", targetDiff);

    // Group by category, branch, officer, customer, brand, sell type, product name, doc date
    const groups = {
      category: {},
      officer: {},
      customer: {},
      brand: {},
      sellType: {},
      docDate: {},
    };

    rows.forEach(row => {
      const val = getCategoryValue(row);
      
      const cat = String(row["Category (Name)"] ?? "Other").trim();
      const officer = String(row["Officer (Name)"] ?? "Other").trim();
      const customer = String(row["Customer (Name)"] ?? "Other").trim();
      const brand = String(row["Brand"] ?? "Other").trim();
      const sellType = String(row["Sell Type"] ?? "Other").trim();
      const docDate = String(row["Doc Date"] ?? "").split(" ")[0]; // just day

      groups.category[cat] = (groups.category[cat] || 0) + val;
      groups.officer[officer] = (groups.officer[officer] || 0) + val;
      groups.customer[customer] = (groups.customer[customer] || 0) + val;
      groups.brand[brand] = (groups.brand[brand] || 0) + val;
      groups.sellType[sellType] = (groups.sellType[sellType] || 0) + val;
      groups.docDate[docDate] = (groups.docDate[docDate] || 0) + val;
    });

    console.log("\n--- Checking for group matching targetDiff ---");
    for (const [groupName, groupObj] of Object.entries(groups)) {
      for (const [key, val] of Object.entries(groupObj)) {
        if (Math.abs(val - targetDiff) < 1) {
          console.log(`MATCH found in ${groupName}: "${key}" sums to ${val}`);
        }
      }
    }

    // Check combinations of categories
    console.log("\n--- Checking combinations of 2 categories ---");
    const catEntries = Object.entries(groups.category);
    for (let i = 0; i < catEntries.length; i++) {
      for (let j = i + 1; j < catEntries.length; j++) {
        const sum = catEntries[i][1] + catEntries[j][1];
        if (Math.abs(sum - targetDiff) < 1) {
          console.log(`MATCH found in category combo: "${catEntries[i][0]}" + "${catEntries[j][0]}" = ${sum}`);
        }
      }
    }

    // Check combination of other groups
    const officerEntries = Object.entries(groups.officer);
    console.log("\n--- Checking combinations of officers ---");
    for (let i = 0; i < officerEntries.length; i++) {
      if (Math.abs(officerEntries[i][1] - targetDiff) < 5) {
        console.log(`CLOSE MATCH in officer: "${officerEntries[i][0]}" = ${officerEntries[i][1]}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}

main();
