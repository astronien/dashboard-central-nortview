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
  | "All Units";

export const WONDER_DIVISOR_OPTIONS: { value: WonderDivisor; label: string }[] = [
  { value: "iPhone", label: "iPhone" },
  { value: "iPad", label: "iPad" },
  { value: "Mac", label: "Mac" },
  { value: "iPhone+iPad", label: "iPhone + iPad" },
  { value: "All Units", label: "All Units" },
];

export type WonderItemConfig = {
  id: string;
  name: string;
  targetPercent: number;
  divisor: WonderDivisor;
  matchKeywords: string[];
};

export const DEFAULT_WONDER_CONFIGS: WonderItemConfig[] = [
  {
    id: "w1",
    name: "Trade In",
    targetPercent: 50,
    divisor: "iPhone",
    matchKeywords: ["trade", "เทรด"],
  },
  {
    id: "w2",
    name: "Cover Plus",
    targetPercent: 25,
    divisor: "iPhone",
    matchKeywords: ["cover+"],
  },
  {
    id: "w3",
    name: "UFUND Personal",
    targetPercent: 6,
    divisor: "iPhone",
    matchKeywords: ["ufund", "personal"],
  },
  {
    id: "w4",
    name: "SIM Attach",
    targetPercent: 15,
    divisor: "iPhone",
    matchKeywords: ["sim"],
  },
  {
    id: "w5",
    name: "Pencil Attach",
    targetPercent: 85,
    divisor: "iPad",
    matchKeywords: ["pencil"],
  },
  {
    id: "w6",
    name: "Mac APP",
    targetPercent: 15,
    divisor: "Mac",
    matchKeywords: ["applecare", "care"],
  },
  {
    id: "w7",
    name: "Case iPhone+iPad",
    targetPercent: 50,
    divisor: "iPhone+iPad",
    matchKeywords: ["case"],
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
    return parsed;
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
