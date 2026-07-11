const TRADE_API_BASE = "https://report-trade.vercel.app";
const API_KEY = "techtrade_pro_secret_2026";

export interface TradeInResult {
  count: number;
  todayCount: number;
}

export async function fetchTradeInData(
  branchCode: string,
): Promise<TradeInResult> {
  if (!branchCode) {
    return { count: 0, todayCount: 0 };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const totalDays = new Date(year, now.getMonth() + 1, 0).getDate();
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${String(totalDays).padStart(2, "0")}`;

  const url = `${TRADE_API_BASE}/api/v2/trades?branch=${encodeURIComponent(branchCode)}&start_date=${startDate}&end_date=${endDate}&limit=9999`;

  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!res.ok) {
    console.warn(`[TradeIn API] returned ${res.status}`);
    return { count: 0, todayCount: 0 };
  }

  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    return { count: 0, todayCount: 0 };
  }

  // status from the Trade API is a string (e.g. "4"). Status 4 means the
  // customer agreed to the trade-in.
  const agreedTrades = json.data.filter(
    (t: any) => String(t.status) === "4",
  );
  const count = agreedTrades.length;

  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayCount = agreedTrades.filter(
    (t: any) =>
      t.document_date &&
      String(t.document_date).startsWith(todayStr),
  ).length;

  return { count, todayCount };
}

export function getBranchCodeFromTarget(
  targetRows: Record<string, string | number | undefined>[],
): string {
  const row = targetRows.find(
    (r) =>
      r.emp_shop_code ??
      r["emp_shop_code"] ??
      r.branchId ??
      r["Branch ID"] ??
      r["BRANCH CODE"],
  );
  const code = String(
    row?.emp_shop_code ??
      row?.["emp_shop_code"] ??
      row?.branchId ??
      row?.["Branch ID"] ??
      row?.["BRANCH CODE"] ??
      "",
  ).trim();
  // The Trade API expects numeric real_branch_id. Accept pure numbers (with
  // optional Excel ".0" suffix). Non-numeric codes like "B9" are ignored.
  const numeric = code.replace(/\.0$/, "");
  return /^\d+$/.test(numeric) ? numeric : "";
}
