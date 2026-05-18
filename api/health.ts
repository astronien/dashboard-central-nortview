import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTursoConfig } from "./lib/env";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { url } = getTursoConfig();
    return res.status(200).json({
      ok: true,
      hasTursoUrl: Boolean(url),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Turso is not configured.";
    return res.status(503).json({ ok: false, error: message });
  }
}
