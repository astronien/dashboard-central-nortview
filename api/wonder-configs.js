const { ensureRelationalSchema } = require("./_lib/tables-sync");
const {
  getTursoConfig,
  loadWonderConfigsDb,
  saveWonderConfigsDb,
  tursoExecute,
} = require("./_lib/turso");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const DEFAULT_WONDER_CONFIGS = [
  { id: "w1", name: "Trade In", targetPercent: 50, divisor: "iPhone", matchKeywords: ["trade", "เทรด"], baseCategories: [], divisorCategories: [] },
  { id: "w2", name: "Cover Plus", targetPercent: 25, divisor: "iPhone", matchKeywords: ["cover+"], baseCategories: [], divisorCategories: [] },
  { id: "w3", name: "UFUND Personal", targetPercent: 6, divisor: "iPhone", matchKeywords: ["ufund", "personal"], baseCategories: [], divisorCategories: [] },
  { id: "w4", name: "SIM Attach", targetPercent: 15, divisor: "iPhone", matchKeywords: ["sim"], baseCategories: [], divisorCategories: [] },
  { id: "w5", name: "Pencil Attach", targetPercent: 85, divisor: "iPad", matchKeywords: ["pencil"], baseCategories: [], divisorCategories: [] },
  { id: "w6", name: "Mac APP", targetPercent: 15, divisor: "Mac", matchKeywords: ["applecare", "care"], baseCategories: [], divisorCategories: [] },
  { id: "w7", name: "Case iPhone+iPad", targetPercent: 50, divisor: "iPhone+iPad", matchKeywords: ["case"], baseCategories: [], divisorCategories: [] },
];

const parseConfigsBody = (body) => {
  if (!body || !Array.isArray(body)) return null;
  return body.map((w) => {
    return {
      id: String(w.id ?? "").trim(),
      name: String(w.name ?? "").trim(),
      targetPercent: Number(w.targetPercent) || 0,
      baseCategories: Array.isArray(w.baseCategories) ? w.baseCategories.map(String) : [],
      divisorCategories: Array.isArray(w.divisorCategories) ? w.divisorCategories.map(String) : [],
      // keep backward compatibility info
      divisor: w.divisor ? String(w.divisor) : "iPhone",
      matchKeywords: Array.isArray(w.matchKeywords) ? w.matchKeywords.map(String) : [],
    };
  }).filter(w => w.id && w.name);
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
      let configs = await loadWonderConfigsDb(tursoExecute);
      if (configs.length === 0) {
        // Auto-initialize defaults on first get
        await saveWonderConfigsDb(tursoExecute, DEFAULT_WONDER_CONFIGS);
        configs = DEFAULT_WONDER_CONFIGS;
      }
      return res.status(200).json({ configs });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const records = parseConfigsBody(req.body);
      if (!records) {
        return res.status(400).json({
          error: "Invalid payload. Expect array of WonderItemConfig.",
        });
      }
      await saveWonderConfigsDb(tursoExecute, records);
      return res.status(200).json({ ok: true, count: records.length });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const missingCreds =
      message.includes("Turso credentials") ||
      message.includes("TURSO_DATABASE_URL");
    console.error("[api/wonder-configs]", message);
    if (req.method === "GET" && missingCreds) {
      return res.status(200).json({ configs: DEFAULT_WONDER_CONFIGS });
    }
    return res.status(missingCreds ? 503 : 500).json({ error: message });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};
