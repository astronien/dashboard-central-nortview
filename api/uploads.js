const {
  UPLOAD_KINDS,
  clearAllUploads,
  clearUploadKind,
  decompressJson,
  isUploadKind,
  loadUploadKind,
  saveUploadKind,
  saveUploadKindChunk,
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

const readKind = (req) => {
  const kindParam = req.query?.kind;
  return Array.isArray(kindParam) ? kindParam[0] : kindParam;
};

const parseUploadBody = (body) => {
  if (!body || typeof body !== "object") return null;

  if (body.format === "gzip-base64" && typeof body.data === "string") {
    let parsed;
    try {
      parsed = decompressJson(body.data);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed)) return null;

    const rows = parsed;
    const chunkIndex = Number(body.chunkIndex);
    const chunkCount = Number(body.chunkCount);

    if (
      Number.isInteger(chunkIndex) &&
      Number.isInteger(chunkCount) &&
      chunkCount > 1 &&
      chunkIndex >= 0 &&
      chunkIndex < chunkCount
    ) {
      return { mode: "chunk", chunkIndex, chunkCount, rows };
    }

    return { mode: "rows", rows };
  }

  if (Array.isArray(body.rows)) {
    return { mode: "rows", rows: body.rows };
  }

  if (Array.isArray(body)) {
    return { mode: "rows", rows: body };
  }

  return null;
};

async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const kindValue = readKind(req);

  try {
    if (req.method === "GET") {
      if (kindValue) {
        if (!isUploadKind(kindValue)) {
          return res.status(400).json({ error: "Invalid upload kind." });
        }
        const rows = await loadUploadKind(kindValue);
        return res.status(200).json({ kind: kindValue, rows });
      }

      const payload = {};
      for (const kind of UPLOAD_KINDS) {
        payload[kind] = await loadUploadKind(kind);
      }
      return res.status(200).json(payload);
    }

    if (req.method === "PUT") {
      if (!kindValue || !isUploadKind(kindValue)) {
        return res.status(400).json({
          error: "Missing or invalid ?kind= query parameter.",
          kinds: UPLOAD_KINDS,
        });
      }

      const parsed = parseUploadBody(req.body);
      if (!parsed) {
        return res.status(400).json({ error: "Invalid upload rows payload." });
      }

      if (parsed.mode === "chunk") {
        await saveUploadKindChunk(
          kindValue,
          parsed.chunkIndex,
          parsed.chunkCount,
          parsed.rows,
        );
        return res.status(200).json({
          ok: true,
          kind: kindValue,
          chunkIndex: parsed.chunkIndex,
          chunkCount: parsed.chunkCount,
          rowCount: parsed.rows.length,
        });
      }

      await saveUploadKind(kindValue, parsed.rows);
      return res.status(200).json({
        ok: true,
        kind: kindValue,
        rowCount: parsed.rows.length,
      });
    }

    if (req.method === "DELETE") {
      if (!kindValue) {
        const cleared = await clearAllUploads();
        return res.status(200).json({
          ok: true,
          message: "All upload data removed from Turso.",
          cleared,
        });
      }

      if (!isUploadKind(kindValue)) {
        return res.status(400).json({ error: "Invalid upload kind." });
      }

      await clearUploadKind(kindValue);
      return res.status(200).json({ ok: true, kind: kindValue });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const missingCreds =
      message.includes("Turso credentials") ||
      message.includes("TURSO_DATABASE_URL");
    console.error("[api/uploads]", kindValue || "all", message);
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
