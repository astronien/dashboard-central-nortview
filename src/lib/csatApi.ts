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

/** "auth" = token expired/revoked, "no_token" = none set, "error" = other */
export type CsatErrorCode = "auth" | "no_token" | "error";

export type CsatFetchResult =
  | { ok: true; data: CsatResult }
  | { ok: false; code: CsatErrorCode; error: string };

/**
 * Fetch CSAT data for the current month (server defaults to
 * 1st-of-month → today in Asia/Bangkok when dates are omitted).
 * `branchRef` is the branch code shown in the CSAT portal (e.g. "3015");
 * when omitted the API uses the first branch the account can see.
 */
export async function fetchCsatData(
  branchRef?: string,
): Promise<CsatFetchResult> {
  const params = new URLSearchParams();
  if (branchRef) params.set("branch", branchRef);
  const qs = params.toString();
  try {
    const res = await fetch(`/api/csat${qs ? `?${qs}` : ""}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return { ok: false, code: "error", error: `CSAT API ${res.status}` };
    }
    if (!json.ok) {
      return {
        ok: false,
        code: (json.code as CsatErrorCode) ?? "error",
        error: String(json.error ?? "unknown error"),
      };
    }
    return { ok: true, data: json as CsatResult };
  } catch (e) {
    return {
      ok: false,
      code: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface CsatTokenStatus {
  hasToken: boolean;
  source: "settings" | "env" | "none";
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Read whether a CSAT token is configured (never returns the token itself). */
export async function getCsatTokenStatus(): Promise<CsatTokenStatus | undefined> {
  try {
    const res = await fetch("/api/csat?resource=token");
    if (!res.ok) return undefined;
    return (await res.json()) as CsatTokenStatus;
  } catch {
    return undefined;
  }
}

/** Save a new CSAT token (admin only, from Settings). */
export async function saveCsatToken(
  token: string,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/csat?resource=token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, updatedBy }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
