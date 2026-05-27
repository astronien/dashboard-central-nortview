/**
 * 7 Wonder Config — editable configuration for the 7 Wonders KPI system.
 *
 * Each wonder has:
 *   - id: unique identifier
 *   - name: display name (editable)
 *   - targetPercent: the KPI target percentage (editable)
 *   - divisor: which product count to use as the denominator (editable)
 *   - matchKeywords: keywords to match product rows against (for numerator counting)
 */

export type WonderDivisor =
  | "iPhone"
  | "iPad"
  | "Mac"
  | "iPhone+iPad"
  | "All Units"
  | "Target iPhone"
  | "Target iPad"
  | "Target Mac"
  | "Target Apple Watch"
  | "Target SIM"
  | "Target BTB"
  | "Target Smartphone"
  | "Target Total";

export const WONDER_DIVISOR_OPTIONS: { value: WonderDivisor; label: string }[] = [
  { value: "iPhone", label: "ยอดขาย iPhone" },
  { value: "iPad", label: "ยอดขาย iPad" },
  { value: "Mac", label: "ยอดขาย Mac" },
  { value: "iPhone+iPad", label: "ยอดขาย iPhone + iPad" },
  { value: "All Units", label: "ยอดขายทุกอุปกรณ์ (All Units)" },
  { value: "Target iPhone", label: "เป้าหมาย iPhone (จาก DB)" },
  { value: "Target iPad", label: "เป้าหมาย iPad (จาก DB)" },
  { value: "Target Mac", label: "เป้าหมาย Mac (จาก DB)" },
  { value: "Target Apple Watch", label: "เป้าหมาย Apple Watch (จาก DB)" },
  { value: "Target SIM", label: "เป้าหมาย SIM (จาก DB)" },
  { value: "Target BTB", label: "เป้าหมาย BTB (จาก DB)" },
  { value: "Target Smartphone", label: "เป้าหมาย Smartphone (จาก DB)" },
  { value: "Target Total", label: "เป้าหมายรวมยอดขาย (จาก DB)" },
];

export type WonderItemConfig = {
  id: string;
  name: string;
  targetPercent: number;
  divisor?: WonderDivisor;
  matchKeywords?: string[];
  baseCategories?: string[]; // list of "Category||Sub Category"
  divisorCategories?: string[]; // list of "Category||Sub Category"
  divisorColumn?: string; // column header name in sales file
  divisorValue?: string; // matching value in that column
};

export const DEFAULT_WONDER_CONFIGS: WonderItemConfig[] = [
  {
    id: "w1",
    name: "Trade In",
    targetPercent: 50,
    divisor: "iPhone",
    matchKeywords: ["trade", "เทรด"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w2",
    name: "Cover Plus",
    targetPercent: 25,
    divisor: "iPhone",
    matchKeywords: ["cover+"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w3",
    name: "UFUND Personal",
    targetPercent: 6,
    divisor: "iPhone",
    matchKeywords: ["ufund", "personal"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w4",
    name: "SIM Attach",
    targetPercent: 15,
    divisor: "iPhone",
    matchKeywords: ["sim"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w5",
    name: "Pencil Attach",
    targetPercent: 85,
    divisor: "iPad",
    matchKeywords: ["pencil"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w6",
    name: "Mac APP",
    targetPercent: 15,
    divisor: "Mac",
    matchKeywords: ["applecare", "care"],
    baseCategories: [],
    divisorCategories: [],
  },
  {
    id: "w7",
    name: "Case iPhone+iPad",
    targetPercent: 50,
    divisor: "iPhone+iPad",
    matchKeywords: ["case"],
    baseCategories: [],
    divisorCategories: [],
  },
];

const LOCAL_STORAGE_KEY = "dashboard_7wonder_configs";

export function loadWonderConfigs(): WonderItemConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_WONDER_CONFIGS;
    const parsed = JSON.parse(raw) as WonderItemConfig[];
    // Basic validation
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WONDER_CONFIGS;
    if (!parsed[0].id || !parsed[0].name) return DEFAULT_WONDER_CONFIGS;
    return parsed.map((item) => ({
      ...item,
      baseCategories: Array.isArray(item.baseCategories) ? item.baseCategories : [],
      divisorCategories: Array.isArray(item.divisorCategories) ? item.divisorCategories : [],
      divisorColumn: item.divisorColumn ?? "",
      divisorValue: item.divisorValue ?? "",
    }));
  } catch {
    return DEFAULT_WONDER_CONFIGS;
  }
}

export function saveWonderConfigs(configs: WonderItemConfig[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // silently fail
  }
}

export async function fetchWonderConfigs(): Promise<WonderItemConfig[]> {
  try {
    const res = await fetch("/api/wonder-configs");
    if (!res.ok) throw new Error("HTTP error");
    const data = await res.json();
    if (data && Array.isArray(data.configs) && data.configs.length > 0) {
      const mapped = data.configs.map((c: any) => ({
        ...c,
        baseCategories: Array.isArray(c.baseCategories) ? c.baseCategories : [],
        divisorCategories: Array.isArray(c.divisorCategories) ? c.divisorCategories : [],
        matchKeywords: Array.isArray(c.matchKeywords) ? c.matchKeywords : [],
        divisor: c.divisor || "iPhone",
        divisorColumn: c.divisorColumn ?? "",
        divisorValue: c.divisorValue ?? "",
      }));
      // Cache to localStorage
      saveWonderConfigs(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Failed to fetch wonder configs from Turso, falling back to localStorage:", err);
  }
  return loadWonderConfigs();
}

export async function updateWonderConfigs(configs: WonderItemConfig[]): Promise<boolean> {
  // Always update local cache immediately
  saveWonderConfigs(configs);
  try {
    const res = await fetch("/api/wonder-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to save wonder configs to Turso:", err);
    return false;
  }
}
