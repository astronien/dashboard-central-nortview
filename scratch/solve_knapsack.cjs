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

    // We will group by [Doc No, Product (Code), ราคาขายตามบิล]
    const groups = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const sumDeDup = Object.values(groups).reduce((sum, list) => sum + getCategoryValue(list[0]), 0);
    console.log("Sum De-dup:", sumDeDup);

    const targetDiff = target - sumDeDup;
    console.log("Target difference to find from duplicate choices:", targetDiff);

    // Get all duplicate items that can be added
    const items = [];
    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const val = getCategoryValue(list[0]);
        // We can add up to (list.length - 1) copies of val
        for (let c = 1; c < list.length; c++) {
          items.push({
            key,
            val,
            row: list[0]
          });
        }
      }
    });

    console.log("Number of duplicate copies available to choose from:", items.length);

    // Let's filter out items that are larger than targetDiff
    const filteredItems = items.filter(item => item.val <= targetDiff + 0.1).sort((a,b) => b.val - a.val);
    console.log("Filtered duplicate copies (<= targetDiff):", filteredItems.length);

    // We want to find a subset of filteredItems whose sum is extremely close to targetDiff (e.g. within 0.05)
    // Since filteredItems might be large, we can use a randomized greedy or DP approach.
    // Let's first try a simple subset sum search using a map of reachable values or randomized search.
    
    // Let's try randomized search first (very fast for finding exact subsets)
    let found = false;
    for (let attempt = 0; attempt < 500000; attempt++) {
      let currentSum = 0;
      const chosen = [];
      // shuffle items randomly
      for (let i = filteredItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = filteredItems[i];
        filteredItems[i] = filteredItems[j];
        filteredItems[j] = temp;
      }

      for (const item of filteredItems) {
        if (currentSum + item.val <= targetDiff + 0.01) {
          currentSum += item.val;
          chosen.push(item);
          if (Math.abs(currentSum - targetDiff) < 0.01) {
            console.log(`\nEXACT SUBSET MATCH FOUND on attempt ${attempt}!`);
            console.log(`Sum of chosen duplicates: ${currentSum.toFixed(2)} (diff to targetDiff: ${(currentSum - targetDiff).toFixed(4)})`);
            console.log(`Chosen items count: ${chosen.length}`);
            
            // Log a few chosen items
            console.log("Sample chosen items:");
            chosen.slice(0, 10).forEach(x => {
              console.log(`- Key: ${x.key} | Val: ${x.val} | Officer: ${x.row["Officer (Name)"]} | Date: ${x.row["Doc Date"]}`);
            });

            // Let's analyze if there's a common property among the chosen ones, or if they are just the ones with Serial = "NULL" or something.
            const serialNullCount = chosen.filter(x => String(x.row.Serial).trim().toLowerCase() === "null" || String(x.row.Serial).trim() === "").length;
            console.log(`Chosen with Serial = NULL: ${serialNullCount} / ${chosen.length}`);
            
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }

    if (!found) {
      console.log("No exact subset found using randomized search.");
    }

  } catch (err) {
    console.error(err);
  }
}

main();
