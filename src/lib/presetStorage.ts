/**
 * KPI Preset storage (Turso-backed)
 *
 * Replaces the previous IDB-based implementation so presets are shared
 * across devices and survive browser data clears.
 */

import {
  cloudDeleteAllPresets,
  cloudDeletePreset,
  cloudListPresets,
  cloudUpsertAllPresets,
  cloudUpsertPreset,
} from "./cloudStorage";
import {
  emptyItemFilter,
  DEFAULT_PRESETS,
  type ItemFilter,
  type Preset,
} from "./presetTypes";

function migrateFilter(f: any): ItemFilter {
  if (!f) {
    return emptyItemFilter();
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
  try {
    const raw = await cloudListPresets<Preset>();
    if (raw.length === 0) return [];
    return raw.map(migratePreset);
  } catch (e) {
    console.warn("[presetStorage] getPresets failed:", e);
    return [];
  }
}

export async function savePresets(presets: Preset[]): Promise<void> {
  await cloudUpsertAllPresets(presets);
}

export async function addPreset(preset: Omit<Preset, "id">): Promise<Preset> {
  const newPreset: Preset = {
    ...preset,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
  };
  await cloudUpsertPreset(newPreset);
  return newPreset;
}

export async function updatePreset(id: string, changes: Partial<Preset>): Promise<void> {
  // Read existing, merge, write back
  const presets = await getPresets();
  const idx = presets.findIndex((p) => p.id === id);
  if (idx === -1) return;
  presets[idx] = { ...presets[idx], ...changes };
  await cloudUpsertPreset(presets[idx]);
}

export async function deletePreset(id: string): Promise<void> {
  await cloudDeletePreset(id);
}

export async function resetToDefaults(): Promise<Preset[]> {
  await cloudDeleteAllPresets();
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
