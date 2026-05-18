const { clearAllUploads } = require("./turso");

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Use POST or DELETE to reset all uploads." });
  }

  try {
    const cleared = await clearAllUploads();
    return res.status(200).json({
      ok: true,
      message: "All upload data removed from Turso.",
      cleared,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return res.status(500).json({ error: message });
  }
};
