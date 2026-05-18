const { getTursoConfig, listTables } = require("./turso");

module.exports = async function handler(req, res) {
  try {
    const { httpUrl } = getTursoConfig();
    const showTables = req.query?.tables === "1";

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
