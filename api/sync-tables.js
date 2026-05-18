const { syncAllRelationalTables } = require("./turso");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST to sync chunk data into readable tables." });
  }

  try {
    const summary = await syncAllRelationalTables();
    return res.status(200).json({
      ok: true,
      message: "Synced chunk storage into data_sales, data_targets, data_categories.",
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return res.status(500).json({ error: message });
  }
};
