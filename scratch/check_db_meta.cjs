require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { tursoExecute } = require("../api/turso");

const cellValue = (cell) => {
  if (cell == null) return null;
  if (typeof cell === "object" && "value" in cell) return cell.value;
  return cell;
};

const rowValues = (row) => {
  if (!Array.isArray(row)) return [];
  return row.map(cellValue);
};

async function main() {
  try {
    const result = await tursoExecute("SELECT * FROM upload_meta");
    console.log("Rows in upload_meta:");
    for (const r of (result.rows ?? [])) {
      const vals = rowValues(r);
      console.log(`- Kind: ${vals[0]} | Row Count: ${vals[1]} | Chunk Count: ${vals[2]} | Updated At: ${vals[3]}`);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
