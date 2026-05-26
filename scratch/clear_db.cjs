const { clearAllUploads } = require('../api/turso');

async function run() {
  console.log("=== Clearing all database uploads from Turso... ===");
  try {
    const stats = await clearAllUploads();
    console.log("Database cleared successfully!");
    console.log("Stats after clearing:", stats);
  } catch (error) {
    console.error("Failed to clear database:", error);
  }
}

run().catch(console.error);
