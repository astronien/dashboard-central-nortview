export type RawRow = Record<string, string | number | undefined>;

export type BillSummary = {
  branchId: string;
  branchName: string;
  officerId: string;
  officerName: string;
  totalRevenue: number;
  hasIPhone?: boolean;
  hasIPad?: boolean;
  hasAttach?: boolean;
  hasSmile?: boolean;
};

export type SalespersonData = {
  officerName: string;
  officerId: string;
  branchName: string;
  branchId: string;
  totalRevenue: number;
  dealCount: number;
  attachRate: number;
  iPhoneIPadBills: number;
  attachBills: number;
  rank: number;
};

export type BranchSummary = {
  branchId: string;
  branchName: string;
  totalRevenue: number;
  billCount: number;
  officerCount: number;
  iPhoneIPadBillCount: number;
  attachBillCount: number;
  attachRate: number;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

const toNumber = (value: unknown) =>
  Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

export const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { แพวนภา: "แพรวนภา" };
  let cleaned = normalizeText(name)
    .replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "")
    .replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) {
      cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
    }
  });
  return cleaned;
};

export const matchesOfficer = (a: string, b: string) => {
  if (!a || !b) return false;
  const left = cleanOfficerName(a);
  const right = cleanOfficerName(b);
  return left === right || left.includes(right) || right.includes(left);
};

export function totalRevenue(bills: BillSummary[]): number {
  return bills.reduce((sum, bill) => sum + bill.totalRevenue, 0);
}

export function dealCount(bills: BillSummary[]): number {
  return bills.length;
}

export function iPhoneIPadBillCount(bills: BillSummary[]): number {
  return bills.filter((bill) => bill.hasIPhone || bill.hasIPad).length;
}

export function attachBillCount(bills: BillSummary[]): number {
  return bills.filter((bill) => bill.hasAttach).length;
}

export function attachRate(bills: BillSummary[]): number {
  const base = iPhoneIPadBillCount(bills);
  if (base === 0) return 0;
  return (attachBillCount(bills) / base) * 100;
}

export function smileBillCount(bills: BillSummary[]): number {
  return bills.filter((bill) => bill.hasSmile).length;
}

export function uniqueOfficerCount(bills: BillSummary[]): number {
  return new Set(bills.map((bill) => bill.officerName)).size;
}

export function groupByOfficer(bills: BillSummary[]): SalespersonData[] {
  const officerMap = new Map<string, BillSummary[]>();

  bills.forEach((bill) => {
    const key = `${bill.officerId}|${bill.officerName}`;
    if (!officerMap.has(key)) officerMap.set(key, []);
    officerMap.get(key)!.push(bill);
  });

  const result: SalespersonData[] = [];
  officerMap.forEach((officerBills, key) => {
    const [officerId, officerName] = key.split("|");
    const revenue = totalRevenue(officerBills);
    const deals = dealCount(officerBills);
    const iPhoneIPadCount = iPhoneIPadBillCount(officerBills);
    const attachCount = attachBillCount(officerBills);
    result.push({
      officerName,
      officerId,
      branchName: officerBills[0]?.branchName || "",
      branchId: officerBills[0]?.branchId || "",
      totalRevenue: revenue,
      dealCount: deals,
      attachRate: iPhoneIPadCount > 0 ? (attachCount / iPhoneIPadCount) * 100 : 0,
      iPhoneIPadBills: iPhoneIPadCount,
      attachBills: attachCount,
      rank: 0,
    });
  });

  result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  result.forEach((row, index) => {
    row.rank = index + 1;
  });
  return result;
}

export function buildBranchSummaries(
  bills: BillSummary[],
  _targets: Record<string, number>,
): BranchSummary[] {
  const grouped = new Map<string, BillSummary[]>();
  bills.forEach((bill) => {
    if (!grouped.has(bill.branchId)) grouped.set(bill.branchId, []);
    grouped.get(bill.branchId)!.push(bill);
  });

  const result: BranchSummary[] = [];
  grouped.forEach((branchBills, branchId) => {
    const branchName = branchBills[0]?.branchName || "";
    const iphoneipadBills = branchBills.filter((b) => b.hasIPhone || b.hasIPad);
    const attachBills = branchBills.filter((b) => b.hasAttach);
    result.push({
      branchId,
      branchName,
      totalRevenue: totalRevenue(branchBills),
      billCount: branchBills.length,
      officerCount: new Set(branchBills.map((b) => b.officerId)).size,
      iPhoneIPadBillCount: iphoneipadBills.length,
      attachBillCount: attachBills.length,
      attachRate: iphoneipadBills.length > 0 ? (attachBills.length / iphoneipadBills.length) * 100 : 0,
    });
  });

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getCategoryValue(row: RawRow) {
  return toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
}
