const { initDatabase } = require("./turso");

/** สร้างตาราง data_* ใน Turso (CREATE TABLE IF NOT EXISTS) — ไม่ต้องสร้างมือใน Dashboard */
module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Use GET or POST to create tables." });
  }

  try {
    const result = await initDatabase();
    return res.status(200).json({
      ok: true,
      message:
        "Tables ready. Browse data_sales, data_targets, data_categories, upload_meta in Turso Dashboard.",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Turso is not configured.";
    return res.status(503).json({ ok: false, error: message });
  }
};
