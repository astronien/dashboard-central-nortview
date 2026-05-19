const { ensureRelationalSchema } = require("./tables-sync");
const {
  deleteStaffPhoto,
  getTursoConfig,
  loadStaffPhotos,
  saveStaffPhoto,
  tursoExecute,
} = require("./turso");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const readStaffId = (req) => {
  const param = req.query?.staffId;
  return Array.isArray(param) ? param[0] : param;
};

const parsePhotoBody = (body) => {
  if (!body || typeof body !== "object") return null;
  const staffId = String(body.staffId ?? "").trim();
  const photoUrl = String(body.photoUrl ?? "").trim();
  if (!staffId || !photoUrl.startsWith("data:image/")) return null;
  return {
    staffId,
    officerKey: String(body.officerKey ?? "").trim(),
    displayName: String(body.displayName ?? "").trim(),
    branch: String(body.branch ?? "").trim(),
    photoUrl,
  };
};

async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    getTursoConfig();
    await ensureRelationalSchema(tursoExecute);

    if (req.method === "GET") {
      const photos = await loadStaffPhotos(tursoExecute);
      return res.status(200).json({ photos });
    }

    if (req.method === "PUT") {
      const record = parsePhotoBody(req.body);
      if (!record) {
        return res.status(400).json({
          error: "Invalid payload. Expect staffId and data:image/* photoUrl.",
        });
      }
      if (record.photoUrl.length > 600_000) {
        return res.status(400).json({ error: "Photo too large after encoding." });
      }
      await saveStaffPhoto(tursoExecute, record);
      return res.status(200).json({ ok: true, staffId: record.staffId });
    }

    if (req.method === "DELETE") {
      const staffId = readStaffId(req);
      if (!staffId) {
        return res.status(400).json({ error: "Missing ?staffId= query parameter." });
      }
      await deleteStaffPhoto(tursoExecute, staffId);
      return res.status(200).json({ ok: true, staffId });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const missingCreds =
      message.includes("Turso credentials") ||
      message.includes("TURSO_DATABASE_URL");
    console.error("[api/staff-photos]", message);
    if (req.method === "GET" && missingCreds) {
      return res.status(200).json({ photos: [] });
    }
    return res.status(missingCreds ? 503 : 500).json({ error: message });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};
