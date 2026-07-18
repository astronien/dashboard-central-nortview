// Client for /api/csat — COM7 CSAT backoffice data (store + per-staff).

export interface CsatNpsBucket {
  count: number;
  count_percent: number;
}

export interface CsatOverview {
  npsScore: number;
  avgScore: number;
  maxScore: number;
  totalBill: number;
  submitBill: number;
  submitBillPercent: number;
  targetBill: number;
  targetBillPercent: number;
  promoters: CsatNpsBucket;
  passives: CsatNpsBucket;
  detractors: CsatNpsBucket;
}

export interface CsatUser {
  empCode: string;
  name: string;
  position: string;
  staffScore: number | null;
  branchScore: number | null;
  avgScore: number | null;
  maxScore: number;
}

export interface CsatResult {
  branch: { id: number; refId: string; name: string };
  period: { start: string; end: string };
  overview: CsatOverview;
  users: CsatUser[];
}

/**
 * Fetch CSAT data for the current month (server defaults to
 * 1st-of-month → today in Asia/Bangkok when dates are omitted).
 * `branchRef` is the branch code shown in the CSAT portal (e.g. "3015");
 * when omitted the API uses the first branch the account can see.
 */
export async function fetchCsatData(
  branchRef?: string,
): Promise<CsatResult | undefined> {
  const params = new URLSearchParams();
  if (branchRef) params.set("branch", branchRef);
  const qs = params.toString();
  const res = await fetch(`/api/csat${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    console.warn(`[CSAT API] returned ${res.status}`);
    return undefined;
  }
  const json = await res.json();
  if (!json.ok) {
    console.warn(`[CSAT API] ${json.error ?? "unknown error"}`);
    return undefined;
  }
  return json as CsatResult;
}
