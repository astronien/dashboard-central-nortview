const { getTursoConfig } = require("./turso");

module.exports = function handler(_req, res) {
  try {
    const { httpUrl } = getTursoConfig();
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
