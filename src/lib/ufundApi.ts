// uFund Tracker public API (https://ufund-app-in.vercel.app) — read-only,
// no auth, CORS open, so the browser can call it directly (no proxy).
//
// /api/v1/reports/employees?branch=<code>&period=monthly returns per-staff
// { empCode, name, total, approved, percent } where:
//   total    = ยอดยื่น / ประเมิน (all submissions)
//   approved = อนุมัติ (ตกลง)
//   percent  = approved / total %

const UFUND_BASE = "https://ufund-app-in.vercel.app/api/v1";

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
