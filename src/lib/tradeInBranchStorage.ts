/**
 * Trade In branch mapping (dashboard branch name → Trade API real_branch_id).
 *
 * localStorage is the synchronous device cache so the dashboard can render
 * immediately; the mapping is also persisted to Turso (`app_settings`) so it
 * follows the user across devices. Call `fetchTradeBranchMappingFromCloud`
 * once on startup to hydrate, and every set/remove writes through to cloud.
 */
import { getTursoClient } from "./auth/tursoClient";

const STORAGE_KEY = "dashboard-trade-in-branch-mapping";
const CLOUD_KEY = "trade-in-branch-mapping";

function readLocal(): Record<string, string> {
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

function writeLocal(mapping: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch {
    // ignore
  }
}

async function persistToCloud(mapping: Record<string, string>): Promise<void> {
  const client = getTursoClient();
  await client.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [CLOUD_KEY, JSON.stringify(mapping)],
  });
}

export function getTradeBranchMapping(): Record<string, string> {
  return readLocal();
}

/**
 * Load the mapping from Turso. Returns null when the cloud copy doesn't
 * exist or can't be reached (callers keep the local cache in that case).
 * On success the local cache is refreshed too.
 */
export async function fetchTradeBranchMappingFromCloud(): Promise<Record<
  string,
  string
> | null> {
  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT value FROM app_settings WHERE key = ? LIMIT 1",
      args: [CLOUD_KEY],
    });
    const row = result.rows[0] as unknown as { value: string } | undefined;
    if (!row) return null;
    const parsed = JSON.parse(String(row.value));
    if (typeof parsed !== "object" || parsed === null) return null;
    const mapping = parsed as Record<string, string>;
    writeLocal(mapping);
    return mapping;
  } catch (e) {
    console.warn("[tradeInBranchStorage] cloud fetch failed:", e);
    return null;
  }
}

export function setTradeBranchMapping(
  dashboardBranch: string,
  tradeBranchId: string,
): Record<string, string> {
  const next = { ...readLocal(), [dashboardBranch]: tradeBranchId };
  writeLocal(next);
  void persistToCloud(next).catch((e) =>
    console.warn("[tradeInBranchStorage] cloud save failed:", e),
  );
  return next;
}

export function removeTradeBranchMapping(
  dashboardBranch: string,
): Record<string, string> {
  const { [dashboardBranch]: _, ...next } = readLocal();
  writeLocal(next);
  void persistToCloud(next).catch((e) =>
    console.warn("[tradeInBranchStorage] cloud save failed:", e),
  );
  return next;
}
