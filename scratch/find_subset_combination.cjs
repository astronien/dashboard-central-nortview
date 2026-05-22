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

    // Group by Doc No, Product Code, Price
    const groups = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const target = 51767335;
    
    // Category Value Base Sum
    const baseSumCat = Object.values(groups).reduce((sum, list) => sum + getCategoryValue(list[0]), 0);
    const targetDiffCat = target - baseSumCat;
    console.log(`Base Sum (CategoryValue): ${baseSumCat} | Diff to Target: ${targetDiffCat}`);

    // Price Base Sum
    const baseSumPrice = Object.values(groups).reduce((sum, list) => sum + toNumber(list[0]["ราคาขายตามบิล"]), 0);
    const targetDiffPrice = target - baseSumPrice;
    console.log(`Base Sum (Price): ${baseSumPrice} | Diff to Target: ${targetDiffPrice}`);

    // Build candidates list
    const candidates = [];
    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const serials = list.map(r => String(r.Serial ?? "").trim().toLowerCase());
        const nonEmpty = serials.filter(s => s !== "" && s !== "null" && s !== "undefined");
        const uniqueNonEmpty = [...new Set(nonEmpty)];
        
        if (uniqueNonEmpty.length > 1) {
          const valCat = getCategoryValue(list[0]);
          const valPrice = toNumber(list[0]["ราคาขายตามบิล"]);
          const qty = uniqueNonEmpty.length - 1;
          
          candidates.push({
            key,
            qty,
            valCat,
            valPrice,
            addedCat: qty * valCat,
            addedPrice: qty * valPrice,
            category: String(list[0]["Category (Name)"]).trim(),
            docNo: String(list[0]["Doc No"]).trim()
          });
        }
      }
    });

    console.log(`Candidates count: ${candidates.length}`);

    // Let's do a subset sum solver for both CategoryValue and Price
    // For CategoryValue: find subset of candidates whose sum of addedCat matches targetDiffCat
    // For Price: find subset of candidates whose sum of addedPrice matches targetDiffPrice
    
    console.log("\nSearching for CategoryValue subset...");
    solveSubsetSum(candidates, "addedCat", targetDiffCat);

    console.log("\nSearching for Price subset...");
    solveSubsetSum(candidates, "addedPrice", targetDiffPrice);

  } catch (err) {
    console.error(err);
  }
}

function solveSubsetSum(items, valProp, target) {
  // Let's use a standard meet-in-the-middle or dynamic programming if possible,
  // but since items count is ~30-40, we can use a recursive backtracking with pruning, which is extremely fast.
  let found = false;
  
  // Sort items descending
  const sorted = [...items].sort((a, b) => b[valProp] - a[valProp]);
  
  function search(index, currentSum, subset) {
    if (Math.abs(currentSum - target) < 0.05) {
      console.log(`\nEXACT MATCH FOUND (Prop: ${valProp}, Sum: ${currentSum.toFixed(2)}):`);
      subset.forEach(x => {
        console.log(`  - Doc No: ${x.docNo} | Category: ${x.category} | Added: ${x[valProp]} (Qty: ${x.qty} * ${x[valProp] / x.qty})`);
      });
      
      // Let's print which categories are included in this subset!
      const catCount = {};
      subset.forEach(x => {
        catCount[x.category] = (catCount[x.category] || 0) + 1;
      });
      console.log("Included Categories:", catCount);
      
      found = true;
      return;
    }
    
    if (index >= sorted.length || currentSum > target + 0.1) return;
    
    // Pruning: if even if we sum all remaining items, we can't reach target, prune!
    let remainingSum = 0;
    for (let i = index; i < sorted.length; i++) {
      remainingSum += sorted[i][valProp];
    }
    if (currentSum + remainingSum < target - 0.05) return;
    
    // Option 1: Include sorted[index]
    search(index + 1, currentSum + sorted[index][valProp], [...subset, sorted[index]]);
    if (found) return;
    
    // Option 2: Exclude sorted[index]
    search(index + 1, currentSum, subset);
  }
  
  search(0, 0, []);
  if (!found) {
    console.log("No exact subset found.");
  }
}

main();
