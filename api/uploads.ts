import type { VercelRequest, VercelResponse } from "@vercel/node";
import { UPLOAD_KINDS } from "./lib/schema";
import { loadAllUploads } from "./lib/db";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "GET") {
      const payload = await loadAllUploads();
      return res.status(200).json(payload);
    }

    if (req.method === "PUT") {
      return res.status(410).json({
        error:
          "Bulk upload disabled. Use PUT /api/uploads/:kind for each file type.",
        kinds: UPLOAD_KINDS,
      });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const status = message.includes("TURSO") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}
