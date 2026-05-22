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
    const target = 51767335.23;

    const groups = {};
    rows.forEach(row => {
      const key = `${row["Doc No"]}_${row["Product (Code)"]}_${row["ราคาขายตามบิล"]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const baseSum = Object.values(groups).reduce((sum, list) => sum + getCategoryValue(list[0]), 0);
    const targetDiff = Math.round(target - baseSum);

    const items = [];
    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const val = getCategoryValue(list[0]);
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
      console.log("No exact subset found.");
      return;
    }

    const subset = [];
    let curr = targetDiff;
    while (curr > 0) {
      const itemIdx = dp[curr];
      const item = items[itemIdx];
      subset.push(item);
      curr -= item.val;
    }

    console.log("Chosen rows fields details:");
    subset.forEach((item, index) => {
      const r = item.row;
      console.log(`[${index + 1}] Doc: ${r["Doc No"]} | Code: ${r["Product (Code)"]} | Name: ${r["Product (Name)"]} | Price: ${item.val} | Serial: ${r["Serial"]} | Finish: ${r["Finish"]} | SellType: ${r["Sell Type"]} | Date: ${r["Doc Date"]}`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
