import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  UPLOAD_KINDS,
  isUploadKind,
  type UploadKind,
} from "./lib/schema";
import {
  loadAllUploads,
  saveAllUploads,
  type UploadPayload,
} from "./lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const emptyPayload = (): UploadPayload => ({
  target: [],
  current: [],
  lastMonth: [],
  lastYear: [],
  categoryMaster: [],
});

const parsePayload = (body: unknown): UploadPayload | null => {
  if (!body || typeof body !== "object") return null;

  const payload = emptyPayload();
  for (const kind of UPLOAD_KINDS) {
    const value = (body as Record<string, unknown>)[kind];
    if (value === undefined) continue;
    if (!Array.isArray(value)) return null;
    payload[kind] = value as UploadPayload[UploadKind];
  }
  return payload;
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
      const payload = parsePayload(req.body);
      if (!payload) {
        return res.status(400).json({ error: "Invalid upload payload." });
      }

      await saveAllUploads(payload);
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
