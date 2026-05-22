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

    if (targetDiff < 0) {
      console.log("Base sum is already larger than target.");
      return;
    }

    // Build items list of duplicate choice copies
    const items = [];
    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const val = getCategoryValue(list[0]);
        // We can add up to list.length - 1 copies
        for (let c = 1; c < list.length; c++) {
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

    // Dynamic Programming subset sum
    // dp[w] = index of item that transitioned to weight w, or -1 if unreachable
    const dp = new Array(targetDiff + 1).fill(-1);
    dp[0] = -2; // base case

    for (let i = 0; i < items.length; i++) {
      const val = items[i].val;
      if (val <= 0) continue;
      
      // Update dp array backwards to prevent using the same item multiple times
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
    
    // Reconstruct the subset
    const subset = [];
    let curr = targetDiff;
    while (curr > 0) {
      const itemIdx = dp[curr];
      const item = items[itemIdx];
      subset.push(item);
      curr -= item.val;
    }

    console.log(`Subset size: ${subset.length} items.`);
    
    // Let's analyze if there's any common property among the chosen items!
    // For example, are they from a specific date range, branch, or officer?
    const dates = {};
    const branches = {};
    const categories = {};
    const serialNullCount = subset.filter(x => {
      const s = String(x.row.Serial ?? "").trim().toLowerCase();
      return s === "null" || s === "" || s === "undefined";
    }).length;

    subset.forEach(x => {
      const d = String(x.row["Doc Date"] ?? "").split(" ")[0];
      const b = String(x.row["Branch (Name)"] ?? "").trim();
      const c = String(x.row["Category (Name)"] ?? "").trim();
      dates[d] = (dates[d] || 0) + 1;
      branches[b] = (branches[b] || 0) + 1;
      categories[c] = (categories[c] || 0) + 1;
    });

    console.log("\nChosen Items Analysis:");
    console.log(`- Serial = NULL: ${serialNullCount} / ${subset.length}`);
    console.log("- Dates:", dates);
    console.log("- Branches:", branches);
    console.log("- Categories:", categories);

  } catch (err) {
    console.error(err);
  }
}

main();
