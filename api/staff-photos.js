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
  const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");
  await initTelegramSchema();
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

// โหมด x2 (Attach Boost) — หัวหน้าร้านเลือก attach ที่โฟกัสช่วงนี้
//   GET  /api/staff-photos?resource=attach-boost → { boost }
//   PUT  /api/staff-photos?resource=attach-boost   body: { boost }
const ATTACH_BOOST_KEY = "attach_boost";

async function handleAttachBoost(req, res) {
  const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");
  await initTelegramSchema();
  if (req.method === "GET") {
    try {
      const cfg = await getAppConfig(ATTACH_BOOST_KEY);
      const boost = cfg && cfg.value ? JSON.parse(cfg.value) : {};
      return res.status(200).json({ ok: true, boost });
    } catch {
      return res.status(200).json({ ok: true, boost: {} });
    }
  }
  if (req.method === "PUT" || req.method === "POST") {
    const b = req.body?.boost && typeof req.body.boost === "object" ? req.body.boost : {};
    const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
    const clean = {
      cover: Boolean(b.cover),
      ufund: Boolean(b.ufund),
      sim: Boolean(b.sim),
      acc: Boolean(b.acc),
      from: day(b.from),
      to: day(b.to),
      factor: Number.isFinite(Number(b.factor)) ? Math.max(1, Math.min(5, Number(b.factor))) : 2,
      otherFactor: Number.isFinite(Number(b.otherFactor)) ? Math.max(0, Math.min(1, Number(b.otherFactor))) : 0.5,
      // ตัวคูณรายตัว (0–5, 1 = ปกติ)
      ...(b.perType && typeof b.perType === "object"
        ? {
            perType: Object.fromEntries(
              ["cover", "ufund", "sim", "acc"].map((k) => {
                const n = Number(b.perType[k]);
                return [k, Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 1];
              }),
            ),
          }
        : {}),
    };
    await setAppConfig(ATTACH_BOOST_KEY, JSON.stringify(clean), req.body?.updatedBy ?? null);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// ปรับเป้าเพิ่ม (Stretch Target) — % เพิ่มจากเป้าจริง เปิด/ปิดได้
//   GET/PUT /api/staff-photos?resource=target-uplift  { uplift: { enabled, pct, perCat } }
const TARGET_UPLIFT_KEY = "target_uplift";

async function handleTargetUplift(req, res) {
  const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");
  await initTelegramSchema();
  if (req.method === "GET") {
    try {
      const cfg = await getAppConfig(TARGET_UPLIFT_KEY);
      return res.status(200).json({ ok: true, uplift: cfg && cfg.value ? JSON.parse(cfg.value) : {} });
    } catch {
      return res.status(200).json({ ok: true, uplift: {} });
    }
  }
  if (req.method === "PUT" || req.method === "POST") {
    const u = req.body?.uplift && typeof req.body.uplift === "object" ? req.body.uplift : {};
    const num = (v) => (Number.isFinite(Number(v)) ? Math.max(-90, Math.min(500, Number(v))) : 0);
    const perCat = {};
    if (u.perCat && typeof u.perCat === "object") {
      for (const [k, v] of Object.entries(u.perCat)) {
        if (v === null || v === "" || v === undefined) continue;
        if (Number.isFinite(Number(v))) perCat[String(k).slice(0, 20)] = num(v);
      }
    }
    const clean = { enabled: Boolean(u.enabled), pct: num(u.pct), perCat };
    await setAppConfig(TARGET_UPLIFT_KEY, JSON.stringify(clean), req.body?.updatedBy ?? null);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// รหัสเข้าหน้าตั้งค่า (เก็บเป็น hash + salt ใน app_config — ไม่เก็บรหัสจริง)
//   GET  ?resource=settings-pin                       → { hasPin }
//   POST ?resource=settings-pin { action: "verify", pin }          → { ok, valid }
//   POST ?resource=settings-pin { action: "set", pin, newPin }     → { ok }
//        (ครั้งแรกที่ยังไม่มีรหัส ไม่ต้องใส่ pin เดิม)
const SETTINGS_PIN_KEY = "settings_pin";

async function handleSettingsPin(req, res) {
  const crypto = require("crypto");
  const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");
  await initTelegramSchema();
  const cfg = await getAppConfig(SETTINGS_PIN_KEY);
  let stored = null;
  try {
    stored = cfg && cfg.value ? JSON.parse(cfg.value) : null;
  } catch {
    stored = null;
  }
  const hashOf = (pin, salt) =>
    crypto.scryptSync(String(pin), salt, 32).toString("hex");
  const matches = (pin) => {
    if (!stored || !stored.hash || !stored.salt) return false;
    const a = Buffer.from(hashOf(pin, stored.salt), "hex");
    const b = Buffer.from(String(stored.hash), "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, hasPin: Boolean(stored && stored.hash) });
  }
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const action = String(req.body?.action ?? "");
  const pin = String(req.body?.pin ?? "");
  if (action === "verify") {
    // หน่วงเล็กน้อยกันการเดารหัสรัวๆ
    await new Promise((r) => setTimeout(r, 400));
    return res.status(200).json({ ok: true, valid: matches(pin) });
  }
  if (action === "set") {
    const newPin = String(req.body?.newPin ?? "");
    if (!/^\d{4,8}$/.test(newPin)) {
      return res.status(400).json({ ok: false, error: "รหัสต้องเป็นตัวเลข 4–8 หลัก" });
    }
    if (stored && stored.hash && !matches(pin)) {
      await new Promise((r) => setTimeout(r, 400));
      return res.status(403).json({ ok: false, error: "รหัสเดิมไม่ถูกต้อง" });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    await setAppConfig(
      SETTINGS_PIN_KEY,
      JSON.stringify({ salt, hash: hashOf(newPin, salt) }),
      req.body?.updatedBy ?? null,
    );
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ ok: false, error: "unknown action" });
}

async function handleVisibleStaff(req, res) {
  const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");
  // app_config ถูกสร้างใน initTelegramSchema — ต้องเรียกก่อน ไม่งั้น setAppConfig
  // จะ throw (ตอนอ่านมี try/catch เลยเงียบ แต่ตอนบันทึกจะล้มเหลว)
  await initTelegramSchema();
  if (req.method === "GET") {
    try {
      const cfg = await getAppConfig(HIDDEN_STAFF_KEY);
      const hidden = cfg && cfg.value ? JSON.parse(cfg.value) : [];
      return res.status(200).json({ ok: true, hidden: Array.isArray(hidden) ? hidden : [] });
    } catch {
      return res.status(200).json({ ok: true, hidden: [] });
    }
  }
  if (req.method === "PUT" || req.method === "POST") {
    const list = Array.isArray(req.body?.hidden) ? req.body.hidden.map(String) : [];
    await setAppConfig(HIDDEN_STAFF_KEY, JSON.stringify(list), req.body?.updatedBy ?? null);
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

  // รูปพนักงานเป็นไฟล์ภาพจริง (ไม่ใช่ data URI) — ให้ LINE Flex Message ดึงไปแสดง
  //   GET /api/staff-photos?resource=image&id=<staff_id ใน DB>
  if (req.query?.resource === "image") {
    try {
      const id = String(req.query?.id ?? "").trim();
      if (!id) return res.status(400).end();
      const result = await tursoExecute(
        "SELECT photo_url FROM staff_photos WHERE staff_id = ? LIMIT 1",
        [id],
      );
      const row = (result.rows ?? [])[0];
      // Turso pipeline: row = [{ type, value }]
      const cell = row ? (Array.isArray(row) ? row[0] : row.photo_url ?? Object.values(row)[0]) : null;
      const dataUrl = String(
        (cell && typeof cell === "object" && "value" in cell ? cell.value : cell) ?? "",
      );
      const m = /^data:(image\/(?:png|jpe?g));base64,(.+)$/i.exec(dataUrl);
      if (!m) return res.status(404).end();
      const buf = Buffer.from(m[2], "base64");
      res.setHeader("Content-Type", m[1].toLowerCase().replace("jpg", "jpeg"));
      res.setHeader("Content-Length", String(buf.length));
      // URL มี ?v=<updatedAt> อยู่แล้ว → cache ได้นาน
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
      return res.status(200).end(buf);
    } catch (e) {
      console.error("[api/staff-photos] image", e);
      return res.status(500).end();
    }
  }

  if (req.query?.resource === "settings-pin") {
    try {
      return await handleSettingsPin(req, res);
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message });
    }
  }

  if (req.query?.resource === "target-uplift") {
    try {
      return await handleTargetUplift(req, res);
    } catch (e) {
      return res.status(200).json({ ok: false, uplift: {}, error: e.message });
    }
  }

  if (req.query?.resource === "attach-boost") {
    try {
      return await handleAttachBoost(req, res);
    } catch (e) {
      return res.status(200).json({ ok: false, boost: {}, error: e.message });
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
