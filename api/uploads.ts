import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isUploadKind, UPLOAD_KINDS } from "./lib/schema";
import {
  clearUploadKind,
  loadAllUploads,
  loadUploadKind,
  saveUploadKind,
  saveUploadKindChunk,
  type RawRow,
} from "./lib/db";
import { decompressJson } from "./lib/compress";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type ParsedUploadBody =
  | { mode: "rows"; rows: RawRow[] }
  | { mode: "chunk"; chunkIndex: number; chunkCount: number; rows: RawRow[] };

const parseUploadBody = (body: unknown): ParsedUploadBody | null => {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;

  if (record.format === "gzip-base64" && typeof record.data === "string") {
    let parsed: unknown;
    try {
      parsed = decompressJson<unknown>(record.data);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed)) return null;

    const rows = parsed as RawRow[];
    const chunkIndex = Number(record.chunkIndex);
    const chunkCount = Number(record.chunkCount);

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

  if (Array.isArray(record.rows)) {
    return { mode: "rows", rows: record.rows as RawRow[] };
  }

  if (Array.isArray(body)) {
    return { mode: "rows", rows: body as RawRow[] };
  }

  return null;
};

const readKind = (req: VercelRequest) => {
  const kindParam = req.query.kind;
  return Array.isArray(kindParam) ? kindParam[0] : kindParam;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

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

      const payload = await loadAllUploads();
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
      if (!kindValue || !isUploadKind(kindValue)) {
        return res.status(400).json({ error: "Missing or invalid ?kind= query parameter." });
      }

      await clearUploadKind(kindValue);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const missingCreds =
      message.includes("Turso credentials") ||
      message.includes("TURSO_DATABASE_URL");
    const status = missingCreds ? 503 : 500;
    console.error("[api/uploads]", kindValue ?? "all", message, error);
    return res.status(status).json({ error: message });
  }
}
