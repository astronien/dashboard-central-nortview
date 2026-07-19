// Client for /api/trends — daily snapshot history for charts.

export interface TrendCategory {
  name: string;
  actual: number;
  target: number;
}

export interface TrendCsat {
  nps: number;
  avgScore: number;
  responseRate: number;
  submitBill: number;
  totalBill: number;
}

export interface TrendSnapshotPayload {
  totalActual: number;
  totalTarget: number;
  achPct: number;
  categories?: TrendCategory[];
  csat?: TrendCsat | null;
}

export interface TrendSnapshot extends TrendSnapshotPayload {
  date: string; // YYYY-MM-DD
}

export async function fetchTrends(
  branch: string,
  limit = 90,
): Promise<TrendSnapshot[]> {
  try {
    const res = await fetch(
      `/api/trends?branch=${encodeURIComponent(branch)}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.snapshots) ? (json.snapshots as TrendSnapshot[]) : [];
  } catch {
    return [];
  }
}

export async function saveTrendSnapshot(
  branchId: string,
  payload: TrendSnapshotPayload,
  date?: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, date, payload }),
    });
    const json = await res.json().catch(() => null);
    return Boolean(res.ok && json?.ok);
  } catch {
    return false;
  }
}
