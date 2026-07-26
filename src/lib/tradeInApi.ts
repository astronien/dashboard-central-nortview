const TRADE_API_BASE = "https://report-trade.vercel.app";
const API_KEY = "techtrade_pro_secret_2026";

export interface TradeInStaffRate {
  code: string; // SALE_CODE (= STAFF ID)
  name: string; // SALE_NAME
  actual: number; // status 3 (สิ้นสุดการประมูลราคา)
  today: number;
  target: number; // รายการเทรดทั้งหมดของพนักงานคนนี้
}

export interface TradeInAgreed {
  code: string; // SALE_CODE (= STAFF ID)
  name: string; // SALE_NAME
  date: string; // document_date (YYYY-MM-DD)
}

export interface TradeInResult {
  actual: number; // status 3 (สิ้นสุดการประมูลราคา) — ทั้งสาขา
  today: number; // status 3 วันนี้ — ทั้งสาขา
  target: number; // รายการเทรดทั้งหมด (ใช้แสดงเป็น denominator) — ทั้งสาขา
  perStaff: TradeInStaffRate[]; // แยกตามพนักงาน (SALE_CODE / SALE_NAME)
  agreed: TradeInAgreed[]; // status-3 trades w/ date — for per-day breakdown
}

export async function fetchTradeInData(
  branchCode: string,
  // Anchor the month window to the sales data's latest date (YYYY-MM-DD) so
  // Trade-In matches the same month the dashboard is showing. If omitted,
  // fall back to the current Asia/Bangkok month.
  monthAnchor?: string,
): Promise<TradeInResult> {
  if (!branchCode) {
    return { actual: 0, today: 0, target: 0, perStaff: [], agreed: [] };
  }

  // Trade data is keyed to Thailand business days — compute "today" and the
  // month window in Asia/Bangkok regardless of where this code runs
  // (user browser or the bot's headless browser on a UTC server).
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date()); // YYYY-MM-DD
  const anchorStr = /^\d{4}-\d{2}-\d{2}$/.test(monthAnchor ?? "")
    ? (monthAnchor as string)
    : todayStr;
  const [yearStr, monthStr] = anchorStr.split("-");
  const totalDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const startDate = `${yearStr}-${monthStr}-01`;
  const endDate = `${yearStr}-${monthStr}-${String(totalDays).padStart(2, "0")}`;

  const url = `${TRADE_API_BASE}/api/v2/trades?branch=${encodeURIComponent(branchCode)}&start_date=${startDate}&end_date=${endDate}&limit=99999`;

  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!res.ok) {
    console.warn(`[TradeIn API] returned ${res.status}`);
    return { actual: 0, today: 0, target: 0, perStaff: [], agreed: [] };
  }

  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    return { actual: 0, today: 0, target: 0, perStaff: [], agreed: [] };
  }

  const allTrades = json.data;
  const target = allTrades.length;

  // status 3 = สิ้นสุดการประมูลราคา (ยอดตกลง)
  const agreedTrades = allTrades.filter(
    (t: any) => String(t.status) === "3",
  );
  const actual = agreedTrades.length;

  const isToday = (t: any) =>
    t.document_date && String(t.document_date).startsWith(todayStr);
  const today = agreedTrades.filter(isToday).length;

  // Per-staff breakdown keyed by SALE_CODE (= STAFF ID); every trade is
  // counted toward `target`, only status-3 toward `actual`/`today`.
  const staffMap = new Map<string, TradeInStaffRate>();
  for (const t of allTrades) {
    const code = String(t.SALE_CODE ?? "").trim();
    const name = String(t.SALE_NAME ?? "").trim();
    const key = code || name;
    if (!key) continue;
    let entry = staffMap.get(key);
    if (!entry) {
      entry = { code, name, actual: 0, today: 0, target: 0 };
      staffMap.set(key, entry);
    }
    entry.target += 1;
    if (String(t.status) === "3") {
      entry.actual += 1;
      if (isToday(t)) entry.today += 1;
    }
  }

  const agreed: TradeInAgreed[] = agreedTrades.map((t: any) => ({
    code: String(t.SALE_CODE ?? "").trim(),
    name: String(t.SALE_NAME ?? "").trim(),
    date: String(t.document_date ?? "").slice(0, 10),
  }));

  return {
    actual,
    today,
    target,
    perStaff: Array.from(staffMap.values()),
    agreed,
  };
}

const BRANCH_CODE_KEYS = ["emp_shop_code", "branchId", "Branch ID", "BRANCH CODE"];

export function getBranchCodeFromTarget(
  targetRows: Record<string, string | number | undefined>[],
): string {
  // Scan every row/key until we hit the first usable (numeric) code —
  // rows often carry present-but-empty cells, which must not stop the search.
  for (const row of targetRows) {
    for (const key of BRANCH_CODE_KEYS) {
      const code = normalizeBranchCode(String(row[key] ?? ""));
      if (code) return code;
    }
  }
  return "";
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
