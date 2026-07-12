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

  // Trade data is keyed to Thailand business days — compute "today" and the
  // month window in Asia/Bangkok regardless of where this code runs
  // (user browser or the bot's headless browser on a UTC server).
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date()); // YYYY-MM-DD
  const [yearStr, monthStr] = todayStr.split("-");
  const totalDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const startDate = `${yearStr}-${monthStr}-01`;
  const endDate = `${yearStr}-${monthStr}-${String(totalDays).padStart(2, "0")}`;

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

  const today = agreedTrades.filter(
    (t: any) =>
      t.document_date &&
      String(t.document_date).startsWith(todayStr),
  ).length;

  return { actual, today, target };
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
