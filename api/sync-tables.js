const { syncAllRelationalTables } = require("./_lib/turso");

/** ย้ายข้อมูลเก่าจาก *_chunks → ตาราง data_* (ใช้ครั้งเดียวถ้ามีข้อมูลเก่า) */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST to migrate legacy chunk data." });
  }

  try {
    const summary = await syncAllRelationalTables();
    return res.status(200).json({
      ok: true,
      message: "Migrated into data_sales, data_targets, data_categories.",
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return res.status(500).json({ error: message });
  }
};
