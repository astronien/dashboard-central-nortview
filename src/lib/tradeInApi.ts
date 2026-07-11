const TRADE_API_BASE = "https://report-trade.vercel.app";
const API_KEY = "techtrade_pro_secret_2026";

export interface TradeInResult {
  actual: number; // status 3 (สิ้นสุดการประมูลราคา)
  today: number; // status 3 วันนี้
  target: number; // รายการเทรดทั้งหมด (ใช้แสดงเป็น denominator)
}

export async function fetchTradeInData(
  branchCode: string,
): Promise<TradeInResult> {
  if (!branchCode) {
    return { actual: 0, today: 0, target: 0 };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const totalDays = new Date(year, now.getMonth() + 1, 0).getDate();
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${String(totalDays).padStart(2, "0")}`;

  const url = `${TRADE_API_BASE}/api/v2/trades?branch=${encodeURIComponent(branchCode)}&start_date=${startDate}&end_date=${endDate}&limit=99999`;

  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!res.ok) {
    console.warn(`[TradeIn API] returned ${res.status}`);
    return { actual: 0, today: 0, target: 0 };
  }

  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    return { actual: 0, today: 0, target: 0 };
  }

  const allTrades = json.data;
  const target = allTrades.length;

  // status 3 = สิ้นสุดการประมูลราคา (ยอดตกลง)
  const agreedTrades = allTrades.filter(
    (t: any) => String(t.status) === "3",
  );
  const actual = agreedTrades.length;

  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const today = agreedTrades.filter(
    (t: any) =>
      t.document_date &&
      String(t.document_date).startsWith(todayStr),
  ).length;

  return { actual, today, target };
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
  return normalizeBranchCode(code);
}

export function getBranchCodeFromString(value: string | undefined): string {
  return normalizeBranchCode(String(value ?? ""));
}

function normalizeBranchCode(code: string): string {
  const trimmed = code.trim();
  // The Trade API expects numeric real_branch_id. Accept pure numbers (with
  // optional Excel ".0" suffix). Non-numeric codes like "B9" are ignored.
  const numeric = trimmed.replace(/\.0$/, "");
  return /^\d+$/.test(numeric) ? numeric : "";
}
