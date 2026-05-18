import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isUploadKind } from "../lib/schema";
import {
  clearUploadKind,
  loadUploadKind,
  saveUploadKind,
  saveUploadKindChunk,
  type RawRow,
} from "../lib/db";
import { decompressJson } from "../lib/compress";

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
    const parsed = decompressJson<unknown>(record.data);
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
    if (req.method === "GET") {
      const rows = await loadUploadKind(kind);
      return res.status(200).json({ kind, rows });
    }

    if (req.method === "PUT") {
      const parsed = parseUploadBody(req.body);
      if (!parsed) {
        return res.status(400).json({ error: "Invalid upload rows payload." });
      }

      if (parsed.mode === "chunk") {
        await saveUploadKindChunk(
          kind,
          parsed.chunkIndex,
          parsed.chunkCount,
          parsed.rows,
        );
        return res.status(200).json({
          ok: true,
          kind,
          chunkIndex: parsed.chunkIndex,
          chunkCount: parsed.chunkCount,
          rowCount: parsed.rows.length,
        });
      }

      await saveUploadKind(kind, parsed.rows);
      return res.status(200).json({ ok: true, kind, rowCount: parsed.rows.length });
    }

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
