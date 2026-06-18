/**
 * KPI Preset storage (IDB-backed)
 *
 * Ported from /Users/astronien/Downloads/studio7-sales-dashboard-main/utils/presetStorage.ts
 * Uses IndexedDB (via storage.ts) instead of localStorage to stay consistent
 * with the rest of the dashboard.
 */

import { getItem, setItem } from "./storage";
import {
  emptyItemFilter,
  DEFAULT_PRESETS,
  type ItemFilter,
  type Preset,
} from "./presetTypes";

const KEY = "presets";
/** Legacy localStorage key from source repo — for one-time migration */
const LEGACY_LS_KEY = "s7_presets";

function migrateFilter(f: any): ItemFilter {
  if (!f) {
    return emptyFilter();
  }
  if (Array.isArray(f.docTypes)) return f as ItemFilter;
  return {
    categories: Array.isArray(f.categories) ? f.categories : f.category ? [f.category] : [],
    subCategories: Array.isArray(f.subCategories)
      ? f.subCategories
      : f.subCategory
        ? [f.subCategory]
        : [],
    models: Array.isArray(f.models) ? f.models : f.model ? [f.model] : [],
    brands: Array.isArray(f.brands) ? f.brands : [],
    customerCodes: Array.isArray(f.customerCodes) ? f.customerCodes : [],
    productNames: Array.isArray(f.productNames) ? f.productNames : [],
    docTypes: Array.isArray(f.docTypes) ? f.docTypes : [],
    includeNonInventory: typeof f.includeNonInventory === "boolean" ? f.includeNonInventory : false,
  };
}

function emptyFilter(): ItemFilter {
  return emptyItemFilter();
}

export function migratePreset(p: any): Preset {
  if (!p) return {} as Preset;
  if (p.filterA && !p.filtersA) {
    const migratedA = migrateFilter(p.filterA);
    const migratedB = migrateFilter(p.filterB);
    return {
      ...p,
      filtersA: [migratedA],
      filtersB: [migratedB],
      filterA: undefined,
      filterB: undefined,
    };
  }
  return {
    ...p,
    filtersA: Array.isArray(p.filtersA) ? p.filtersA.map(migrateFilter) : [],
    filtersB: Array.isArray(p.filtersB) ? p.filtersB.map(migrateFilter) : [],
  };
}

export async function getPresets(): Promise<Preset[]> {
  if (typeof window === "undefined") return [];
  const stored = await getItem<Preset[]>(KEY);
  if (!stored) return [];
  try {
    return stored.map(migratePreset);
  } catch {
    return [];
  }
}

export async function savePresets(presets: Preset[]): Promise<void> {
  if (typeof window === "undefined") return;
  await setItem(KEY, presets);
}

export async function addPreset(preset: Omit<Preset, "id">): Promise<Preset> {
  const newPreset: Preset = {
    ...preset,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
  };
  const presets = await getPresets();
  presets.push(newPreset);
  await savePresets(presets);
  return newPreset;
}

export async function updatePreset(id: string, changes: Partial<Preset>): Promise<void> {
  const presets = await getPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index !== -1) {
    presets[index] = { ...presets[index], ...changes };
    await savePresets(presets);
  }
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await getPresets();
  const filtered = presets.filter((p) => p.id !== id);
  await savePresets(filtered);
}

export async function resetToDefaults(): Promise<Preset[]> {
  await savePresets([]);
  return [];
}

export function getDefaultPresets(): Omit<Preset, "id">[] {
  return DEFAULT_PRESETS;
}

/**
 * One-time cleanup: remove any KPI preset whose name looks like test data
 * (e.g. "testxx", "test", "ทดสอบ"). Returns the list of removed names.
 */
export async function cleanupTestPresets(): Promise<string[]> {
  const TEST_PATTERNS = [/^testxx$/i, /^test\d*$/i, /^ทดสอบ/i, /\btest\b/i];
  try {
    const presets = await getPresets();
    const removed: string[] = [];
    const kept = presets.filter((p) => {
      const isTest = TEST_PATTERNS.some((pat) => pat.test(String(p.name ?? "")));
      if (isTest) removed.push(String(p.name));
      return !isTest;
    });
    if (removed.length > 0) {
      await savePresets(kept);
      console.info(`[presetStorage] Cleaned up test presets: ${removed.join(", ")}`);
    }
    return removed;
  } catch (e) {
    console.warn("[presetStorage] cleanupTestPresets failed:", e);
    return [];
  }
}

/**
 * One-time migration from old localStorage key (s7_presets) to IDB.
 * Returns true if migration was performed.
 */
export async function migrateFromLegacyLocalStorage(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(LEGACY_LS_KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(LEGACY_LS_KEY);
      return false;
    }
    const existing = await getPresets();
    if (existing.length === 0) {
      const migrated = parsed.map(migratePreset);
      await savePresets(migrated);
    }
    window.localStorage.removeItem(LEGACY_LS_KEY);
    console.info(`[presetStorage] Migrated localStorage[${LEGACY_LS_KEY}] → IDB[${KEY}]`);
    return true;
  } catch (e) {
    console.warn(`[presetStorage] migration failed:`, e);
    return false;
  }
}
