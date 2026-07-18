// CSAT proxy — pulls store + per-staff satisfaction data from the COM7
// CSAT backoffice API (api-csat.com7.in) so the dashboard can display it
// without CORS issues and without exposing the access token to browsers.
//
// GET /api/csat?branch=3015&start_date=2026-07-01&end_date=2026-07-18
//   branch     : branch ref code (e.g. "3015"). Optional — defaults to the
//                first branch the token's account can see.
//   start_date : YYYY-MM-DD. Optional — defaults to 1st of current month
//                (Asia/Bangkok).
//   end_date   : YYYY-MM-DD. Optional — defaults to today (Asia/Bangkok).
//
// Response: { ok, branch, overview, users }
//
// Token management (merged here to stay under the Hobby-plan 12-function
// limit — was /api/csat-token):
//   GET  /api/csat?resource=token   → { hasToken, source, updatedAt, updatedBy }
//                                      (never returns the token value)
//   POST /api/csat?resource=token   → save a new token  body: { token, updatedBy? }

const { getAppConfig, setAppConfig, initTelegramSchema } = require("./_lib/tursoClient");

const CSAT_API_BASE = "https://api-csat.com7.in/v1/backoffice";
const CSAT_TOKEN_KEY = "csat_token";

// CSAT personal access tokens look like "12345|alphanumericstring"
const looksLikeToken = (t) => /^\d+\|[A-Za-z0-9]{20,}$/.test(String(t || "").trim());

// Token resolution order:
//   1. token saved by an admin in the Settings page (Turso app_config) —
//      this is the easy self-serve refresh path when the token expires.
//   2. CSAT_TOKEN env var on Vercel.
// The token is a Laravel Sanctum personal access token that does not
// expire unless the account logs out / revokes it. Because the account
// has 2FA, it can only be minted by a human logging in once; after that
// it can be pasted into Settings whenever it needs refreshing.
async function resolveToken() {
  try {
    const cfg = await getAppConfig(CSAT_TOKEN_KEY);
    if (cfg && cfg.value && cfg.value.trim()) return cfg.value.trim();
  } catch (e) {
    console.warn("[api/csat] could not read token from DB:", e.message);
  }
  return (process.env.CSAT_TOKEN || "").trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

// Bangkok "today" as YYYY-MM-DD regardless of server timezone
const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

async function csatGetRaw(path, params, token) {
  const url = new URL(`${CSAT_API_BASE}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: authHeaders(token) });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function csatGet(path, params, token) {
  const { res, json } = await csatGetRaw(path, params, token);
  if (!res.ok) {
    const msg = json && json.message ? json.message : `CSAT API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

// Aggregate real per-staff CSAT from the raw survey records. The
// per-staff /user-metrics endpoint returns the branch average for every
// person (so everyone looks identical); the individual survey feed is
// the only source of true per-person scores + response counts.
async function aggregatePerStaff(branchId, params, token) {
  const perStaff = new Map(); // emp_code -> { name, position, count, sum, maxScore }
  const lowScores = []; // surveys that scored below max (drill-down)
  const pageSize = 500;
  let page = 1;
  let pageCount = 1;
  do {
    const json = await csatGet(
      `/branches/${branchId}/surveys`,
      { ...params, branch_id: branchId, page, page_size: pageSize },
      token,
    );
    const rows = Array.isArray(json?.data) ? json.data : [];
    pageCount = Number(json?.meta?.page_count ?? 1) || 1;
    for (const s of rows) {
      const st = s.staff || {};
      const code = String(st.emp_code ?? "").trim();
      const maxScore = Number(s.max_score ?? 5);
      // One question per survey → avg_score == that answer's score.
      const score =
        s.avg_score != null
          ? Number(s.avg_score)
          : Number(s.answers?.[0]?.score ?? NaN);
      if (code && Number.isFinite(score)) {
        const cur =
          perStaff.get(code) ||
          { name: String(st.name ?? ""), position: String(st.position ?? ""), count: 0, sum: 0, maxScore };
        cur.count += 1;
        cur.sum += score;
        if (s.max_score) cur.maxScore = maxScore;
        perStaff.set(code, cur);
      }

      // Collect surveys that didn't score full marks so a manager can
      // drill into who/when/which service aspect dragged the score down.
      if (Number.isFinite(score) && score < maxScore) {
        const questions = (Array.isArray(s.answers) ? s.answers : []).map((a) => ({
          title: String(a?.question?.title_th ?? a?.question?.title ?? "").trim(),
          score: a?.score == null ? null : Number(a.score),
          answer: String(a?.answer?.title_th ?? a?.answer?.title ?? "").trim(),
        }));
        // The weakest aspect(s) on this bill
        const scored = questions.filter((q) => q.score != null);
        const minQ = scored.length ? Math.min(...scored.map((q) => q.score)) : score;
        lowScores.push({
          billId: String(s.bill_id ?? ""),
          submittedAt: String(s.submit_at ?? s.bought_at ?? ""),
          staffName: String(st.name ?? ""),
          empCode: code,
          score,
          maxScore,
          skus: Array.isArray(s.skus) ? s.skus.map(String) : [],
          questions,
          weakAspects: scored
            .filter((q) => q.score === minQ)
            .map((q) => q.title)
            .filter(Boolean),
        });
      }
    }
    page += 1;
    if (page > 20) break;
  } while (page <= pageCount);

  lowScores.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score; // worst first
    return b.submittedAt.localeCompare(a.submittedAt); // then newest
  });

  const users = Array.from(perStaff.entries()).map(([empCode, v]) => ({
    empCode,
    name: v.name,
    position: v.position,
    avgScore: v.count > 0 ? v.sum / v.count : null,
    responseCount: v.count,
    maxScore: v.maxScore || 5,
  }));

  return { users, lowScores: lowScores.slice(0, 80) };
}

// ── Token management sub-handler (resource=token) ──────────────────────
async function handleTokenResource(req, res) {
  try {
    await initTelegramSchema();
  } catch (e) {
    console.warn("[api/csat] schema init failed:", e.message);
  }

  if (req.method === "GET") {
    const cfg = await getAppConfig(CSAT_TOKEN_KEY);
    const hasDbToken = Boolean(cfg && cfg.value && cfg.value.trim());
    return res.status(200).json({
      hasToken: hasDbToken || Boolean((process.env.CSAT_TOKEN || "").trim()),
      source: hasDbToken ? "settings" : process.env.CSAT_TOKEN ? "env" : "none",
      updatedAt: cfg?.updatedAt ?? null,
      updatedBy: cfg?.updatedBy ?? null,
    });
  }

  if (req.method === "POST") {
    const token = String(req.body?.token ?? "").trim();
    const updatedBy = req.body?.updatedBy ? String(req.body.updatedBy) : null;
    if (!token) {
      return res.status(400).json({ ok: false, error: "กรุณากรอก token" });
    }
    if (!looksLikeToken(token)) {
      return res.status(400).json({
        ok: false,
        error: 'รูปแบบ token ไม่ถูกต้อง — ต้องเป็นรูปแบบ "เลข|ตัวอักษร" เช่น 21573|abcd...',
      });
    }
    await setAppConfig(CSAT_TOKEN_KEY, token, updatedBy);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Token management path
  if (req.query.resource === "token") {
    return handleTokenResource(req, res);
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    try { await initTelegramSchema(); } catch (e) {
      console.warn("[api/csat] schema init failed:", e.message);
    }

    const token = await resolveToken();
    if (!token) {
      return res.status(200).json({
        ok: false,
        code: "no_token",
        error: "ยังไม่ได้ตั้งค่า CSAT token — ไปที่หน้า Settings เพื่อวาง token",
      });
    }

    const today = bangkokToday();
    const [y, m] = today.split("-");
    const startYmd = isYmd(req.query.start_date)
      ? req.query.start_date
      : `${y}-${m}-01`;
    const endYmd = isYmd(req.query.end_date) ? req.query.end_date : today;
    const startDate = `${startYmd} 00:00:00`;
    const endDate = `${endYmd} 23:59:59`;
    const branchRef = String(req.query.branch || "").trim();

    // 1. Resolve the CSAT internal branch id from the branch ref code
    const branchesJson = await csatGet(
      "/overviews/branches",
      { start_date: startDate, end_date: endDate, page: 1, page_size: 100 },
      token,
    );
    const branches = Array.isArray(branchesJson?.data) ? branchesJson.data : [];
    if (branches.length === 0) {
      return res
        .status(200)
        .json({ ok: false, error: "No CSAT branches visible for this token" });
    }
    const wanted =
      (branchRef &&
        branches.find(
          (b) =>
            String(b.ref_id ?? "").trim() === branchRef ||
            String(b.code ?? "").includes(branchRef) ||
            String(b.name ?? "").includes(branchRef),
        )) ||
      branches[0];

    // 2. Store-level overview + real per-staff aggregation (in parallel)
    const [overviewJson, surveyData] = await Promise.all([
      csatGet(
        "/overviews",
        { start_date: startDate, end_date: endDate, branch_id: wanted.id },
        token,
      ),
      aggregatePerStaff(
        wanted.id,
        { start_date: startDate, end_date: endDate },
        token,
      ),
    ]);
    const { users, lowScores } = surveyData;

    const o = overviewJson?.data ?? {};
    const npsBuckets = Array.isArray(o.nps_scores) ? o.nps_scores : [];
    const bucket = (type) =>
      npsBuckets.find((b) => b.type === type) ?? { count: 0, count_percent: 0 };

    return res.status(200).json({
      ok: true,
      branch: {
        id: wanted.id,
        refId: String(wanted.ref_id ?? ""),
        name: String(wanted.name ?? ""),
      },
      period: { start: startYmd, end: endYmd },
      overview: {
        npsScore: Number(o.nps_score ?? wanted.nps_score ?? 0),
        avgScore: Number(o.avg_score ?? wanted.avg_score ?? 0),
        maxScore: Number(o.max_score ?? 5),
        totalBill: Number(o.total_bill ?? 0),
        submitBill: Number(o.submit_bill ?? 0),
        submitBillPercent: Number(o.submit_bill_percent ?? 0),
        targetBill: Number(o.target_bill ?? 0),
        targetBillPercent: Number(o.target_bill_percent ?? 0),
        promoters: bucket("promoter"),
        passives: bucket("passive"),
        detractors: bucket("detractor"),
      },
      users,
      lowScores,
    });
  } catch (e) {
    console.error("[api/csat] failed:", e);
    // 401 = token expired/revoked → tell the client so it can prompt an
    // admin to paste a fresh token in Settings.
    const isAuth = e && e.status === 401;
    return res.status(200).json({
      ok: false,
      code: isAuth ? "auth" : "error",
      error: isAuth
        ? "CSAT token หมดอายุหรือถูกเพิกถอน — ไปที่หน้า Settings เพื่อวาง token ใหม่"
        : e instanceof Error
          ? e.message
          : String(e),
    });
  }
};
