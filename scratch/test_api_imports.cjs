require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });

const endpoints = [
  "../api/branches.js",
  "../api/health.js",
  "../api/init-db.js",
  "../api/reset-uploads.js",
  "../api/staff-photos.js",
  "../api/sync-sheets.js",
  "../api/sync-tables.js",
  "../api/uploads.js",
  "../api/wonder-configs.js",
];

async function main() {
  console.log("Testing imports of all 9 API serverless endpoints...");
  let success = true;
  for (const ep of endpoints) {
    try {
      require(ep);
      console.log(`✅ Import successful: ${ep}`);
    } catch (err) {
      console.error(`❌ Import failed: ${ep}`);
      console.error(err);
      success = false;
    }
  }
  if (success) {
    console.log("All 9 endpoints imported successfully without any errors!");
  } else {
    process.exit(1);
  }
}

main();
