import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isUploadKind } from "../lib/schema";
import { clearUploadKind } from "../lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const kindParam = req.query.kind;
  const kind = Array.isArray(kindParam) ? kindParam[0] : kindParam;

  if (!kind || !isUploadKind(kind)) {
    return res.status(400).json({ error: "Invalid upload kind." });
  }

  try {
    if (req.method === "DELETE") {
      await clearUploadKind(kind);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const status = message.includes("TURSO") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}
