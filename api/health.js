const { getTursoConfig, getUploadStats, listTables } = require("./turso");

module.exports = async function handler(req, res) {
  try {
    const { httpUrl } = getTursoConfig();
    const showTables = req.query?.tables === "1";
    const showStats = req.query?.stats === "1";

    if (showStats) {
      const stats = await getUploadStats();
      return res.status(200).json({
        ok: true,
        hasTursoUrl: Boolean(httpUrl),
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
