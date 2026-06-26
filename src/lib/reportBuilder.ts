import { calcAchievementPct, calcForecastByDays, calculateMetrics } from "./targetAggregations";
import { getCategoryValue, matchesOfficer, type RawRow } from "./salesAggregations";
import { parseDocDate, parseThaiDate, stripThaiDatePrefix } from "./dateParser";

export type OfficerPerformance = {
  name: string;
  branch: string;
  target: number;
  actual: number;
  achPercent: number;
  forecast: number;
  forecastPercent: number;
  lastMonth: number;
  momPercent: number | string;
  lastYear: number;
  yoyPercent: number | string;
  targetDay: number;
  actualDay: number;
  diffDay: number;
  achDayPercent: number;
  rate: number;
};

export type ParsedReport = {
  branches: Array<{
    label: string;
    target: number;
    actual: number;
    lastMonth: number;
    lastYear: number;
    achPercent?: number;
    forecast?: number;
    forecastPercent?: number;
    momPercent?: number | string;
    yoyPercent?: number | string;
    targetPerDay?: number;
    diffPerDay?: number;
  }>;
  categories: Array<{ category: string; actual: number; target: number; share: number }>;
  officers: Array<OfficerPerformance>;
  fileName: string;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

const toNumber = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { "แพวนภา": "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

const getSalesDate = (row: RawRow) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = parseDocDate(raw);
  return parsed ? parsed.getTime() : 0;
};

const mapTargetCategoryKey = (category: string, subCategory = "", productName = "") => {
  const text = normalizeText(`${category} ${subCategory} ${productName}`);
  if (text.includes("btb apple") || text.includes("btb(apple)")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  if (text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  if (text.includes("smartphone")) return "Smartphone";
  return category || "Other";
};

const getRowKey = (row: RawRow) => [
  String(row["Doc No"] ?? "").trim(),
  String(row["Product (Name)"] ?? "").replace(/\s+/g, " ").trim(),
  String(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice ?? "").trim(),
  String(row["Serial"] ?? "").trim(),
  String(row["Doc Date"] ?? "").trim(),
].join("||");

const CHOSEN_DUPLICATE_KEYS = new Set<string>();

/** Merge todayRows into currentRows, skipping rows that already exist in current */
const deduplicateMerge = (currentRows: RawRow[], todayRows: RawRow[]): RawRow[] => {
  const existingKeys = new Set<string>();
  currentRows.forEach((row) => existingKeys.add(getRowKey(row)));

  const newRows = todayRows.filter((row) => !existingKeys.has(getRowKey(row)));
  return [...currentRows, ...newRows];
};

/**
 * Find the latest date in any of the supplied row sets. Used to drive
 * "today / day-of-month" calculations so they reflect the data we
 * actually have rather than the real-world wall-clock date.
 */
const getLatestDataDate = (rows: RawRow[]): { year: number; month: number; day: number } | null => {
  let best: { year: number; month: number; day: number; time: number } | null = null;
  for (const row of rows) {
    const rawDate = row["Doc Date"] ?? row["doc date"] ?? "";
    const parsed = parseDocDate(rawDate);
    if (!parsed) continue;
    const ymd = {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate(),
      time: parsed.getTime(),
    };
    if (!best || ymd.time > best.time) best = ymd;
  }
  return best ? { year: best.year, month: best.month, day: best.day } : null;
};

export function buildReport(targetRows: RawRow[], currentRows: RawRow[], lastMonthRows: RawRow[], lastYearRows: RawRow[], categoryRows: RawRow[], fileName: string, todayRows: RawRow[] = []): ParsedReport {
  // Merge today rows into current if provided (today is a subset of the current month)
  const mergedCurrentRows = todayRows.length > 0
    ? deduplicateMerge(currentRows, todayRows)
    : currentRows;
  const categoryMap = new Map<string, string>();
  categoryRows.forEach((row) => {
    const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
    const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
    if (key) categoryMap.set(key, value);
  });

  const branchTargets = new Map<string, { totalTarget: number; days: number }>();
  targetRows.forEach((row) => {
    const branchKey = normalizeText(row["BRANCH NAME"]);
    const targetVal = toNumber(row.Total);
    const days = toNumber(row.DAY) || 30;
    const currentBranchTarget = branchTargets.get(branchKey) ?? { totalTarget: 0, days: 30 };
    currentBranchTarget.totalTarget += targetVal;
    currentBranchTarget.days = Math.max(currentBranchTarget.days, days);
    branchTargets.set(branchKey, currentBranchTarget);
  });

  const branchSummary = new Map<string, { label: string; target: number; actual: number; lastMonth: number; lastYear: number; currentDay: number; totalDays: number }>();
  const officerSummary = new Map<string, OfficerPerformance>();
  const categorySummary = new Map<string, { actual: number; target: number }>();

  // Use the latest data date for the "currentDay" calculation so the
  // daily target / forecast reflect the data we actually have.
  const latestDataDate = getLatestDataDate(mergedCurrentRows);
  const effectiveNow = latestDataDate
    ? new Date(latestDataDate.year, latestDataDate.month, latestDataDate.day)
    : new Date();

  branchTargets.forEach((info, branchKey) => {
    const targetRow = targetRows.find((row) => normalizeText(row["BRANCH NAME"]) === branchKey);
    const branchName = String(targetRow?.["BRANCH NAME"] ?? "Unknown Branch").trim();
    const totalDays = info.days || 30;
    const currentDay = Math.min(totalDays, effectiveNow.getDate());
    branchSummary.set(branchKey, { label: branchName, target: info.totalTarget, actual: 0, lastMonth: 0, lastYear: 0, currentDay, totalDays });
  });

  const catsToSum = ["iPhone", "Mac", "iPad", "Apple Watch", "SIM", "BTB", "BTB(Apple)"];
  targetRows.forEach((row) => {
    catsToSum.forEach((cat) => {
      const key = normalizeText(cat);
      const targetVal = cat === "BTB(Apple)"
        ? toNumber(row["BTB(Apple)"] ?? row["BTB (Apple)"] ?? row["BTB Apple"] ?? row["btb(apple)"] ?? row["btb (apple)"] ?? row["btb apple"] ?? row["BTB_Apple"] ?? row["btb_apple"])
        : toNumber(row[cat] ?? row[cat.toLowerCase()]);
      const catItem = categorySummary.get(key) ?? { actual: 0, target: 0 };
      catItem.target += targetVal;
      categorySummary.set(key, catItem);
    });
  });

  targetRows.forEach((row) => {
    const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
    if (!name) return;
    const officerKey = cleanOfficerName(name);
    officerSummary.set(officerKey, {
      name,
      branch: String(row["BRANCH NAME"] ?? "").trim(),
      target: toNumber(row.Total),
      actual: 0,
      achPercent: 0,
      forecast: 0,
      forecastPercent: 0,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 0,
      actualDay: 0,
      diffDay: 0,
      achDayPercent: 0,
      rate: 0,
    });
  });

  const mergeSales = (rows: RawRow[], period: "current" | "lastMonth" | "lastYear") => {
    const seen = new Map<string, number>();
    [...rows].sort((a, b) => getSalesDate(b) - getSalesDate(a)).forEach((row) => {
      if (period === "current") {
        // Include quantity in the key to avoid dropping rows that are legitimately different
        const qty = String(row.Number ?? row.number ?? row.qty ?? "1").trim();
        const dupKey = `${row["Doc No"]}_${row["Product (Code)"] ?? row.product_code ?? ""}_${row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice}_${qty}`;
        const count = seen.get(dupKey) ?? 0;
        if (count > 0 && !CHOSEN_DUPLICATE_KEYS.has(getRowKey(row))) return;
        seen.set(dupKey, count + 1);
      }
      const branch = String(row["Branch (Name)"] ?? "Unknown Branch").trim();
      const officer = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
      const categoryName = String(row["Category (Name)"] ?? "Other").trim();
      const sub = String(row["Sub Category"] ?? "").trim();
      const product = String(row["Product (Name)"] ?? "").trim();
      const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);

      const branchKey = normalizeText(branch);
      const targetInfo = branchTargets.get(branchKey);
      const totalDays = targetInfo?.days || 30;
      const currentDay = Math.min(totalDays, effectiveNow.getDate());
      const actual = getCategoryValue(row);

      const branchItem = branchSummary.get(branchKey) ?? { label: branch, target: 0, actual: 0, lastMonth: 0, lastYear: 0, currentDay, totalDays };
      branchItem.target = targetInfo ? targetInfo.totalTarget : branchItem.target;
      if (period === "current") branchItem.actual += actual; else if (period === "lastMonth") branchItem.lastMonth += actual; else branchItem.lastYear += actual;
      branchSummary.set(branchKey, branchItem);

      const catKey = normalizeText(mapped);
      const catItem = categorySummary.get(catKey) ?? { actual: 0, target: 0 };
      if (period === "current") catItem.actual += actual;
      categorySummary.set(catKey, catItem);

      const officerKey = cleanOfficerName(officer);
      let matchedKey = "";
      for (const [existingKey, value] of officerSummary.entries()) {
        if (matchesOfficer(value.name, officer)) { matchedKey = existingKey; break; }
      }
      let officerState = matchedKey ? officerSummary.get(matchedKey) : undefined;
      if (!officerState) {
        officerState = {
          name: officer,
          branch,
          target: 0,
          actual: 0,
          achPercent: 0,
          forecast: 0,
          forecastPercent: 0,
          lastMonth: 0,
          momPercent: "New",
          lastYear: 0,
          yoyPercent: "New",
          targetDay: 0,
          actualDay: 0,
          diffDay: 0,
          achDayPercent: 0,
          rate: 0,
        };
        officerSummary.set(officerKey, officerState);
      }
      if (period === "current") officerState.actual += actual;
      else if (period === "lastMonth") officerState.lastMonth += actual;
      else officerState.lastYear += actual;
    });
  };

  mergeSales(mergedCurrentRows, "current");
  mergeSales(lastMonthRows, "lastMonth");
  mergeSales(lastYearRows, "lastYear");

  // Compare by parsed time, not raw string, so mixed date formats for the
  // same calendar day are all included.
  let maxDateTime = 0;
  mergedCurrentRows.forEach((row) => {
    const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
    if (!rawDate) return;
    const parsed = parseDocDate(rawDate);
    if (parsed) {
      const time = parsed.getTime();
      if (time > maxDateTime) maxDateTime = time;
    }
  });

  const officerDailyActual = new Map<string, number>();
  if (maxDateTime > 0) {
    mergedCurrentRows.forEach((row) => {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      const parsed = parseDocDate(rawDate);
      const time = parsed ? parsed.getTime() : 0;
      if (time && time === maxDateTime) {
        const officerName = String(row["Officer (Name)"] ?? "").trim();
        if (officerName) {
          const matchedKey = [...officerSummary.keys()].find((k) => matchesOfficer(officerSummary.get(k)!.name, officerName));
          if (matchedKey) officerDailyActual.set(matchedKey, (officerDailyActual.get(matchedKey) ?? 0) + getCategoryValue(row));
        }
      }
    });
  }

  let maxCurrentDay = 22;
  let maxTotalDays = 31;
  branchSummary.forEach((b) => {
    maxCurrentDay = Math.max(maxCurrentDay, b.currentDay);
    maxTotalDays = Math.max(maxTotalDays, b.totalDays);
  });

  officerSummary.forEach((state, officerKey) => {
    state.achPercent = calcAchievementPct(state.actual, state.target);
    state.rate = Math.round(state.achPercent);
    state.forecast = calcForecastByDays(state.actual, maxCurrentDay, maxTotalDays);
    state.forecastPercent = calcAchievementPct(state.forecast, state.target);
    state.momPercent = state.lastMonth > 0 ? ((state.actual - state.lastMonth) / state.lastMonth) * 100 : "New";
    state.yoyPercent = state.lastYear > 0 ? ((state.actual - state.lastYear) / state.lastYear) * 100 : "New";
    state.targetDay = Math.round(state.target / (maxTotalDays || 30));
    state.actualDay = officerDailyActual.get(officerKey) ?? 0;
    state.diffDay = state.actualDay - state.targetDay;
    state.achDayPercent = state.targetDay ? (state.actualDay / state.targetDay) * 100 : 0;
  });

  const branches = [...branchSummary.values()].map((r) => ({ ...r, ...calculateMetrics(r.target, r.actual, r.currentDay, r.totalDays, r.lastMonth, r.lastYear) }));
  const categories = [...categorySummary.entries()].map(([category, value]) => ({ category, actual: value.actual, target: value.target || Math.max(value.actual, 1), share: 0 }));
  const totalActual = categories.reduce((s, r) => s + r.actual, 0) || 1;
  categories.forEach((c) => { c.share = Math.round((c.actual / totalActual) * 100); });
  return { branches, categories, officers: [...officerSummary.values()], fileName };
}
