const { ensureRelationalSchema } = require("./_lib/tables-sync");
const {
  deleteStaffPhoto,
  getTursoConfig,
  loadStaffPhotos,
  saveStaffPhoto,
  tursoExecute,
} = require("./_lib/turso");

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

// Which staff are shown on the Staff Profile page. Stored as a JSON array of
// hidden STAFF IDs in app_config (merged here to stay under the Hobby-plan
// 12-function limit).
//   GET  /api/staff-photos?resource=visible-staff → { hidden: string[] }
//   PUT  /api/staff-photos?resource=visible-staff   body: { hidden: string[] }
const HIDDEN_STAFF_KEY = "hidden_staff_ids";
// จำนวนพนักงานหลังบ้านต่อตำแหน่ง (ใช้แบ่งก้อนค่าคอม)
//   GET  /api/staff-photos?resource=backoffice → { counts: {...} }
//   PUT  /api/staff-photos?resource=backoffice   body: { counts: {...} }
const BACK_OFFICE_KEY = "back_office_counts";

async function handleBackOffice(req, res) {
  const { getAppConfig, setAppConfig } = require("./_lib/tursoClient");
  if (req.method === "GET") {
    try {
      const cfg = await getAppConfig(BACK_OFFICE_KEY);
      const parsed = cfg && cfg.value ? JSON.parse(cfg.value) : {};
      // รูปแบบเดิมเก็บเป็น { BSM: 1, ... } ตรงๆ — รองรับย้อนหลัง
      const hasShape = parsed && typeof parsed === "object" && ("counts" in parsed || "rates" in parsed);
      const counts = hasShape ? parsed.counts ?? {} : parsed ?? {};
      const rates = hasShape ? parsed.rates ?? {} : {};
      return res.status(200).json({ ok: true, counts, rates });
    } catch {
      return res.status(200).json({ ok: true, counts: {}, rates: {} });
    }
  }
  if (req.method === "PUT" || req.method === "POST") {
    const rawCounts = req.body?.counts && typeof req.body.counts === "object" ? req.body.counts : {};
    const rawRates = req.body?.rates && typeof req.body.rates === "object" ? req.body.rates : {};
    const counts = {};
    for (const [k, v] of Object.entries(rawCounts)) {
      counts[String(k).toUpperCase()] = Math.max(0, Math.floor(Number(v) || 0));
    }
    const rates = {};
    for (const [k, v] of Object.entries(rawRates)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) rates[String(k).toUpperCase()] = n;
    }
    await setAppConfig(
      BACK_OFFICE_KEY,
      JSON.stringify({ counts, rates }),
      req.body?.updatedBy ?? null,
    );
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.query?.resource === "backoffice") {
    try {
      return await handleBackOffice(req, res);
    } catch (e) {
      return res.status(200).json({ ok: false, counts: {}, error: e.message });
    }
  }

  if (req.query?.resource === "visible-staff") {
    try {
      return await handleVisibleStaff(req, res);
    } catch (e) {
      return res.status(200).json({ ok: false, hidden: [], error: e.message });
    }
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
      if (record.photoUrl.length > 900_000) {
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
