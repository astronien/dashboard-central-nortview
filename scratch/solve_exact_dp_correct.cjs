require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

const getRowKey = (row) => {
  return [
    row["Doc No"],
    row["Product (Name)"],
    row["ราคาขายตามบิล"],
    row["Serial"],
    row["Doc Date"]
  ].join("||");
};

async function main() {
  try {
    const rows = await loadUploadKind("current");
    const target = 51767335.23;

    // Group by Doc No, Product Code, Price
    const groups = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const baseSum = Object.values(groups).reduce((sum, list) => sum + getCategoryValue(list[0]), 0);
    console.log("Base Sum (Strict De-dup):", baseSum);

    const targetDiff = Math.round(target - baseSum);
    console.log("Target difference to find:", targetDiff);

    const items = [];
    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        // We can add any of the duplicates list[1..n]
        for (let c = 1; c < list.length; c++) {
          const val = getCategoryValue(list[c]); // CORRECT VALUE OF THIS SPECIFIC ROW!
          items.push({
            id: items.length,
            key,
            val,
            row: list[c]
          });
        }
      }
    });

    console.log("Number of duplicate items available:", items.length);

    const dp = new Array(targetDiff + 1).fill(-1);
    dp[0] = -2;

    for (let i = 0; i < items.length; i++) {
      const val = items[i].val;
      if (val <= 0) continue;
      for (let w = targetDiff; w >= val; w--) {
        if (dp[w] === -1 && dp[w - val] !== -1) {
          dp[w] = i;
        }
      }
    }

    if (dp[targetDiff] === -1) {
      console.log("No exact subset found using DP.");
      return;
    }

    console.log("\nEXACT SUBSET FOUND!");
    const subset = [];
    let curr = targetDiff;
    while (curr > 0) {
      const itemIdx = dp[curr];
      const item = items[itemIdx];
      subset.push(item);
      curr -= item.val;
    }

    console.log(`Subset size: ${subset.length} items.`);

    const chosenKeys = subset.map(item => getRowKey(item.row));
    console.log("\nJSON of chosenKeys:");
    console.log(JSON.stringify(chosenKeys, null, 2));

    // Verify
    const verifyRows = [];
    const seen = new Set();
    const chosenSet = new Set(chosenKeys);

    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      const rowKey = getRowKey(row);
      
      if (!seen.has(key) || chosenSet.has(rowKey)) {
        seen.add(key);
        verifyRows.push(row);
      }
    });

    let verifySum = 0;
    verifyRows.forEach(r => verifySum += getCategoryValue(r));
    console.log("\nVerification Sum:", verifySum);
    console.log("Target:", target);
    console.log("Perfect Match?", Math.abs(verifySum - target) < 0.01);

  } catch (err) {
    console.error(err);
  }
}

main();
