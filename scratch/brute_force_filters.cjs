require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

function parseDocDate(str) {
  if (!str) return null;
  const parts = String(str).split(" ");
  if (parts.length < 2) return null;
  const dateStr = parts[1]; // "04/05/2026"
  const dateParts = dateStr.split("/");
  if (dateParts.length < 3) return null;
  
  // time part
  const timeStr = parts[2] || "00:00:00";
  const timeParts = timeStr.split(":");
  
  return new Date(
    parseInt(dateParts[2]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[0]),
    parseInt(timeParts[0] || 0),
    parseInt(timeParts[1] || 0),
    parseInt(timeParts[2] || 0)
  );
}

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total current rows loaded:", rows.length);

    const target = 51767335;

    // We will parse all dates and keep them
    const parsedRows = rows.map(r => ({
      row: r,
      date: parseDocDate(r["Doc Date"] ?? r["doc date"]),
      val: getCategoryValue(r),
      price: toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]),
      setPrice: toNumber(r["Set Price"]),
      finish: String(r["Finish"] ?? "Unknown").trim(),
      prodType: String(r["Product Type"] ?? "Unknown").trim(),
      vatType: String(r["Vat Type"] ?? "Unknown").trim(),
    }));

    // Find all distinct date cutoff dates (daily)
    const dates = [...new Set(parsedRows.map(x => x.date.toDateString()))].map(dStr => new Date(dStr));
    dates.sort((a, b) => a - b);

    console.log("\nDistinct dates in DB:", dates.length);

    // Let's run brute force over:
    // 1. Cutoff dates
    // 2. Finish status filters (All, only "รับเงินครบแล้ว", only "ยังรับเงินไม่ครบ")
    // 3. De-duplication method (none, unique1: DocNo+ProdCode+Price, unique2: DocNo+ProdCode+Serial, unique3: JSON)
    // 4. Value column (CategoryValue, Price, SetPrice)

    const deDups = [
      { name: "None", fn: (list) => list },
      { name: "De-dup by DocNo+ProdCode+Price", fn: (list) => {
          const unique = {};
          list.forEach(item => {
            const key = `${item.row["Doc No"]}_${item.row["Product (Code)"]}_${item.row["ราคาขายตามบิล"]}`;
            unique[key] = item;
          });
          return Object.values(unique);
        }
      },
      { name: "De-dup by DocNo+ProdCode+Serial", fn: (list) => {
          const unique = {};
          list.forEach(item => {
            const key = `${item.row["Doc No"]}_${item.row["Product (Code)"]}_${item.row["Serial"]}`;
            unique[key] = item;
          });
          return Object.values(unique);
        }
      },
      { name: "De-dup by entire row", fn: (list) => {
          const unique = {};
          list.forEach(item => {
            const key = JSON.stringify(item.row);
            unique[key] = item;
          });
          return Object.values(unique);
        }
      }
    ];

    const valueColumns = ["val", "price", "setPrice"];

    const finishFilters = [
      { name: "All Finish Statuses", fn: () => true },
      { name: "Only 'รับเงินครบแล้ว'", fn: (item) => item.finish === "รับเงินครบแล้ว" },
      { name: "Only 'ยังรับเงินไม่ครบ'", fn: (item) => item.finish === "ยังรับเงินไม่ครบ" }
    ];

    let foundAny = false;

    // Loop through combinations
    for (const deDup of deDups) {
      for (const finishFilter of finishFilters) {
        for (const col of valueColumns) {
          // Loop through all dates as possible cutoffs
          for (let i = 0; i < dates.length; i++) {
            const cutoff = new Date(dates[i]);
            cutoff.setHours(23, 59, 59, 999); // end of day

            // Filter rows up to cutoff and by finish filter
            let filtered = parsedRows.filter(item => item.date <= cutoff && finishFilter.fn(item));
            
            // De-duplicate
            filtered = deDup.fn(filtered);

            // Sum
            let sum = 0;
            filtered.forEach(item => {
              sum += item[col];
            });

            const diff = sum - target;
            if (Math.abs(diff) < 2) {
              console.log(`\n*** EXACT MATCH FOUND! ***`);
              console.log(`De-dup: ${deDup.name}`);
              console.log(`Finish Filter: ${finishFilter.name}`);
              console.log(`Value Column: ${col}`);
              console.log(`Cutoff Date: up to ${cutoff.toDateString()}`);
              console.log(`Sum: ${sum.toFixed(2)} | Target: ${target} | Diff: ${diff.toFixed(2)}`);
              console.log(`Rows count: ${filtered.length}`);
              foundAny = true;
            }
          }
        }
      }
    }

    if (!foundAny) {
      console.log("\nNo exact match found within 2 Baht margin.");
    }

  } catch (err) {
    console.error(err);
  }
}

main();
