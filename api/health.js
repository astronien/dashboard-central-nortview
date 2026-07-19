const {
  getTursoConfig,
  getUploadStats,
  listTables,
  initDatabase,
} = require("./_lib/turso");

module.exports = async function handler(req, res) {
  try {
    const { httpUrl } = getTursoConfig();
    const showTables = req.query?.tables === "1";
    const showStats = req.query?.stats === "1";

    // Merged from the old /api/init-db (kept the function count at 12):
    //   GET/POST /api/health?init=1  → CREATE TABLE IF NOT EXISTS data_*
    if (req.query?.init === "1") {
      const result = await initDatabase();
      return res.status(200).json({ ok: true, ...result });
    }

    if (showStats) {
      const stats = await getUploadStats();
      let database = httpUrl;
      try {
        database = new URL(httpUrl).hostname;
      } catch {
        // keep raw url
      }
      return res.status(200).json({
        ok: true,
        hasTursoUrl: Boolean(httpUrl),
        database,
        tablesToBrowse: ["data_sales", "data_targets", "data_categories", "upload_meta"],
        stats,
      });
    }

    if (showTables) {
      const tables = await listTables();
      return res.status(200).json({
        ok: true,
        hasTursoUrl: Boolean(httpUrl),
        tables,
      });
    }

    return res.status(200).json({
      ok: true,
      hasTursoUrl: Boolean(httpUrl),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Turso is not configured.";
    return res.status(503).json({ ok: false, error: message });
  }
};
