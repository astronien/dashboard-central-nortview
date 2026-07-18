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

const { getAppConfig, initTelegramSchema } = require("./_lib/tursoClient");

const CSAT_API_BASE = "https://api-csat.com7.in/v1/backoffice";
const CSAT_TOKEN_KEY = "csat_token";

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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
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

    // 2. Store-level overview + per-staff metrics (in parallel)
    const [overviewJson, usersJson] = await Promise.all([
      csatGet(
        "/overviews",
        { start_date: startDate, end_date: endDate, branch_id: wanted.id },
        token,
      ),
      csatGet(
        `/branches/${wanted.id}/user-metrics`,
        { start_date: startDate, end_date: endDate, page: 1, page_size: 200 },
        token,
      ),
    ]);

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
      users: (Array.isArray(usersJson?.data) ? usersJson.data : []).map(
        (u) => ({
          empCode: String(u.emp_code ?? ""),
          name: String(u.name ?? ""),
          position: String(u.position ?? ""),
          staffScore: u.staff_score === null ? null : Number(u.staff_score),
          branchScore: u.branch_score === null ? null : Number(u.branch_score),
          avgScore: u.avg_score === null ? null : Number(u.avg_score),
          maxScore: Number(u.max_score ?? 5),
        }),
      ),
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
