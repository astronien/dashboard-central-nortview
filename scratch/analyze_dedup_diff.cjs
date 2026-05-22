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
    rows.forEach((row, idx) => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ row, idx });
    });

    // Keeping 1st from each group gives the baseline de-duplicated set
    const uniques = [];
    const duplicates = [];

    Object.entries(groups).forEach(([key, list]) => {
      uniques.push(list[0]);
      if (list.length > 1) {
        // The rest are duplicate copies
        for (let i = 1; i < list.length; i++) {
          duplicates.push(list[i]);
        }
      }
    });

    const sumUniques = uniques.reduce((sum, item) => sum + getCategoryValue(item.row), 0);
    console.log("Baseline Sum (Uniques):", sumUniques);

    const neededDiff = target - sumUniques;
    console.log("Needed Difference:", neededDiff);

    // Let's analyze duplicates
    console.log(`Number of duplicate rows: ${duplicates.length}`);
    
    // Group duplicates by category to see their sums
    const dupByCat = {};
    duplicates.forEach(item => {
      const cat = String(item.row["Category (Name)"] ?? "Other").trim();
      const val = getCategoryValue(item.row);
      if (!dupByCat[cat]) dupByCat[cat] = { count: 0, sum: 0, items: [] };
      dupByCat[cat].count++;
      dupByCat[cat].sum += val;
      dupByCat[cat].items.push(item);
    });

    console.log("\nDuplicates by Category:");
    Object.entries(dupByCat).forEach(([cat, data]) => {
      console.log(`- ${cat}: count=${data.count}, sum=${data.sum.toFixed(2)}`);
    });

    // Let's find if there is an exact subset of duplicates that sums to neededDiff!
    // Since neededDiff is 100720.77, let's see if we can find a combination of duplicate items
    // using a simple subset sum solver.
    console.log("\nSearching for exact subset of duplicates to match neededDiff...");
    const dupItems = duplicates.map(item => ({
      idx: item.idx,
      val: getCategoryValue(item.row),
      row: item.row
    })).filter(x => x.val <= neededDiff + 0.1).sort((a, b) => b.val - a.val);

    console.log("Candidate duplicate items:", dupItems.length);

    let found = false;
    // We can use a simple DP or randomized search for subset sum
    // Let's run a randomized search first
    for (let attempt = 0; attempt < 1000000; attempt++) {
      // Shuffle candidates
      for (let i = dupItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = dupItems[i];
        dupItems[i] = dupItems[j];
        dupItems[j] = temp;
      }

      let currentSum = 0;
      const chosen = [];
      for (const item of dupItems) {
        if (currentSum + item.val <= neededDiff + 0.001) {
          currentSum += item.val;
          chosen.push(item);
          if (Math.abs(currentSum - neededDiff) < 0.001) {
            console.log(`\nEXACT SUBSET MATCH FOUND on attempt ${attempt}!`);
            console.log(`Sum of chosen duplicates: ${currentSum.toFixed(2)}`);
            console.log(`Chosen items count: ${chosen.length}`);
            
            // Let's print the chosen items
            console.log("\nChosen Items details:");
            chosen.forEach(x => {
              console.log(`  - Doc No: ${x.row["Doc No"]} | Product: ${x.row["Product (Name)"]} | Price: ${x.row["ราคาขายตามบิล"]} | Serial: ${x.row["Serial"]} | Category: ${x.row["Category (Name)"]}`);
            });
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }

    if (!found) {
      console.log("No exact subset of duplicates matched neededDiff.");
    }

  } catch (err) {
    console.error(err);
  }
}

main();
