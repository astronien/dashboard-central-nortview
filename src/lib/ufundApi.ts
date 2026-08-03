// uFund Tracker public API (https://ufund-app.vercel.app) — read-only,
// no auth, CORS open, so the browser can call it directly (no proxy).
//
// /api/v1/reports/employees?branch=<code>&period=monthly returns per-staff
// { empCode, name, total, approved, percent } where:
//   total    = ยอดยื่น / ประเมิน (all submissions)
//   approved = อนุมัติ (ตกลง)
//   percent  = approved / total %

const UFUND_BASE = "https://ufund-app.vercel.app/api/v1";

export interface UfundStaff {
  empCode: string;
  name: string;
  total: number;
  approved: number;
  percent: number;
}

export interface UfundResult {
  perStaff: UfundStaff[];
}

/** Unix-second range (Asia/Bangkok) for a YYYY-MM-DD day. */
function dayRange(ymd: string): { start: number; end: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const start = Math.floor(Date.parse(`${ymd}T00:00:00+07:00`) / 1000);
  const end = Math.floor(Date.parse(`${ymd}T23:59:59+07:00`) / 1000);
  if (!isFinite(start) || !isFinite(end)) return null;
  return { start, end };
}

/** Per-staff uFund for a single day (ยอดยื่น/อนุมัติ ของวันนั้น). */
export async function fetchUfundDay(
  branchCode: string | undefined,
  ymd: string,
): Promise<UfundResult> {
  const range = dayRange(ymd);
  if (!range) return { perStaff: [] };
  const q =
    `?start=${range.start}&end=${range.end}` +
    (branchCode ? `&branch=${encodeURIComponent(branchCode)}` : "");
  try {
    const res = await fetch(`${UFUND_BASE}/reports/employees${q}`);
    if (!res.ok) return { perStaff: [] };
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    return {
      perStaff: items.map((e: Record<string, unknown>) => ({
        empCode: String(e.empCode ?? ""),
        name: String(e.name ?? ""),
        total: Number(e.total ?? 0),
        approved: Number(e.approved ?? 0),
        percent: Number(e.percent ?? 0),
      })),
    };
  } catch {
    return { perStaff: [] };
  }
}

/** Unix-second range (Asia/Bangkok) for the whole month of a YYYY-MM-DD. */
function monthRange(ymd: string): { start: number; end: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m] = ymd.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = Math.floor(Date.parse(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+07:00`) / 1000);
  const end = Math.floor(
    Date.parse(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59+07:00`) / 1000,
  );
  if (!isFinite(start) || !isFinite(end)) return null;
  return { start, end };
}

/** Per-staff uFund for the whole month that contains `ymd` (ยอดยื่น/อนุมัติ). */
export async function fetchUfundMonth(
  branchCode: string | undefined,
  ymd: string,
): Promise<UfundResult> {
  const range = monthRange(ymd);
  if (!range) return { perStaff: [] };
  const q =
    `?start=${range.start}&end=${range.end}` +
    (branchCode ? `&branch=${encodeURIComponent(branchCode)}` : "");
  try {
    const res = await fetch(`${UFUND_BASE}/reports/employees${q}`);
    if (!res.ok) return { perStaff: [] };
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    return {
      perStaff: items.map((e: Record<string, unknown>) => ({
        empCode: String(e.empCode ?? ""),
        name: String(e.name ?? ""),
        total: Number(e.total ?? 0),
        approved: Number(e.approved ?? 0),
        percent: Number(e.percent ?? 0),
      })),
    };
  } catch {
    return { perStaff: [] };
  }
}

export async function fetchUfundData(
  branchCode?: string,
): Promise<UfundResult> {
  const q =
    "?period=monthly" +
    (branchCode ? `&branch=${encodeURIComponent(branchCode)}` : "");
  try {
    const res = await fetch(`${UFUND_BASE}/reports/employees${q}`);
    if (!res.ok) return { perStaff: [] };
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    return {
      perStaff: items.map((e: Record<string, unknown>) => ({
        empCode: String(e.empCode ?? ""),
        name: String(e.name ?? ""),
        total: Number(e.total ?? 0),
        approved: Number(e.approved ?? 0),
        percent: Number(e.percent ?? 0),
      })),
    };
  } catch {
    return { perStaff: [] };
  }
}
