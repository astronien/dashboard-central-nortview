require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

async function main() {
  try {
    const rows = await loadUploadKind("current");
    console.log("Total rows:", rows.length);

    const decimalRows = [];
    rows.forEach(r => {
      const price = toNumber(r["ราคาขายตามบิล"] ?? r["Total Price"]);
      if (price % 1 !== 0) {
        decimalRows.push({
          docNo: r["Doc No"],
          prodCode: r["Product (Code)"],
          prodName: r["Product (Name)"],
          category: r["Category (Name)"],
          price,
          date: r["Doc Date"]
        });
      }
    });

    console.log(`\nFound ${decimalRows.length} rows with non-zero decimal parts:`);
    decimalRows.forEach(x => {
      console.log(`- Doc No: ${x.docNo} | Code: ${x.prodCode} | Category: ${x.category} | Price: ${x.price} | Date: ${x.date}`);
    });

  } catch (err) {
    console.error(err);
  }
}

main();
