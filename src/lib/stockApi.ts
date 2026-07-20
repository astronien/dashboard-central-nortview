// Client for the stock-on-hand store (folded into /api/trends?resource=stock).

export interface StockItem {
  name: string;
  code: string;
  qty: number;
}

export interface StockStatus {
  map: Record<string, number>;
  cost: Record<string, number>;
  items: StockItem[];
  hasCost: boolean;
  itemCount: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function fetchStock(branch: string): Promise<StockStatus | undefined> {
  if (!branch) return undefined;
  try {
    const res = await fetch(
      `/api/trends?resource=stock&branch=${encodeURIComponent(branch)}`,
    );
    if (!res.ok) return undefined;
    const json = await res.json();
    if (!json?.ok) return undefined;
    return {
      map: json.map ?? {},
      cost: json.cost ?? {},
      items: Array.isArray(json.items) ? json.items : [],
      hasCost: Boolean(json.hasCost),
      itemCount: json.itemCount ?? 0,
      updatedAt: json.updatedAt ?? null,
      updatedBy: json.updatedBy ?? null,
    };
  } catch {
    return undefined;
  }
}

export async function saveStock(
  branch: string,
  map: Record<string, number>,
  costMap?: Record<string, number>,
  items?: StockItem[],
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `/api/trends?resource=stock&branch=${encodeURIComponent(branch)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branch, qty: map, cost: costMap ?? {}, items: items ?? [], updatedBy }),
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
