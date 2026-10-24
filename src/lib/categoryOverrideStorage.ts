/**
 * หมวดที่ผู้ใช้เลือกให้หมวดย่อยใหม่ที่ Category Master ยังไม่มี
 * (pairKey(Category, Sub) → BTB / BTB(Apple) / Other).
 *
 * Same pattern as tradeInBranchStorage: localStorage is the synchronous
 * device cache, Turso `app_settings` keeps it shared across devices/users.
 */
import { getTursoClient } from "./auth/tursoClient";
import { CATEGORY_CHOICES, type CategoryChoice, type CategoryOverrides } from "./categoryFallback";

const STORAGE_KEY = "dashboard-category-overrides";
const CLOUD_KEY = "category-overrides";

function sanitize(value: unknown): CategoryOverrides {
  if (typeof value !== "object" || value === null) return {};
  const out: CategoryOverrides = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (CATEGORY_CHOICES.includes(v as CategoryChoice)) out[k] = v as CategoryChoice;
  }
  return out;
}

function readLocal(): CategoryOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function writeLocal(overrides: CategoryOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

async function persistToCloud(overrides: CategoryOverrides): Promise<void> {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [CLOUD_KEY, JSON.stringify(overrides)],
  });
}

export function getCategoryOverrides(): CategoryOverrides {
  return readLocal();
}

/** Load from Turso; null when missing/unreachable (keep the local cache). */
export async function fetchCategoryOverridesFromCloud(): Promise<CategoryOverrides | null> {
  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT value FROM app_settings WHERE key = ? LIMIT 1",
      args: [CLOUD_KEY],
    });
    const row = result.rows[0] as unknown as { value: string } | undefined;
    if (!row) return null;
    const overrides = sanitize(JSON.parse(String(row.value)));
    writeLocal(overrides);
    return overrides;
  } catch (e) {
    console.warn("[categoryOverrideStorage] cloud fetch failed:", e);
    return null;
  }
}

/** Merge choices into the saved overrides (write-through to cloud). */
export function setCategoryOverrides(changes: CategoryOverrides): CategoryOverrides {
  const next = { ...readLocal(), ...changes };
  writeLocal(next);
  void persistToCloud(next).catch((e) => console.warn("[categoryOverrideStorage] cloud save failed:", e));
  return next;
}
