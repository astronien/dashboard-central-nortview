const STORAGE_KEY = "dashboard-trade-in-branch-mapping";

export function getTradeBranchMapping(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function setTradeBranchMapping(
  dashboardBranch: string,
  tradeBranchId: string,
): Record<string, string> {
  const mapping = getTradeBranchMapping();
  const next = { ...mapping, [dashboardBranch]: tradeBranchId };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function removeTradeBranchMapping(
  dashboardBranch: string,
): Record<string, string> {
  const mapping = getTradeBranchMapping();
  const { [dashboardBranch]: _, ...next } = mapping;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
