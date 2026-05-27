require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { ensureRelationalSchema } = require("../api/tables-sync");
const { tursoExecute } = require("../api/turso");

async function main() {
  try {
    console.log("Initializing relational tables (including wonder_configs)...");
    await ensureRelationalSchema(tursoExecute);
    console.log("Schema successfully updated! wonder_configs table is now ready.");
  } catch (err) {
    console.error("Failed to initialize wonder_configs table:", err);
  }
}

main();
