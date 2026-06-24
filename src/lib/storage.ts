import { get, set, del, keys } from "idb-keyval";

/**
 * Generic typed wrapper around idb-keyval for storing JSON-serializable values
 * in IndexedDB. Replaces window.localStorage for any data that may exceed
 * the 5–10 MB origin quota (e.g. 50 MB of sales spreadsheets).
 *
 * All keys are namespaced with `dashboard:` so they don't collide with
 * other libraries that share the IndexedDB default store.
 */

const PREFIX = "dashboard:";

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await get<T>(PREFIX + key);
    return value ?? null;
  } catch (e) {
    console.warn(`[storage] getItem(${key}) failed:`, e);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await set(PREFIX + key, value);
  } catch (e) {
    console.error(`[storage] setItem(${key}) failed:`, e);
    throw e;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await del(PREFIX + key);
  } catch (e) {
    console.warn(`[storage] removeItem(${key}) failed:`, e);
  }
}

export async function listKeys(): Promise<string[]> {
  const all = await keys();
  return all
    .map((k) => String(k))
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

/**
 * Chunked write for large arrays. Reads existing value, appends the next
 * chunk, and writes back. Yields to the event loop between chunks so
 * the UI can repaint progress.
 *
 * Note: this is not true incremental storage — for a true incremental
 * store we'd need to split the array across many keys. For our use
 * case (a few sales spreadsheets, ≤ 50k rows) writing the whole array
 * in chunks is fast enough and still keeps the IDB transaction small.
 */
export async function chunkedSet<T>(
  key: string,
  items: T[],
  options?: { chunkSize?: number; onProgress?: (written: number, total: number) => void },
): Promise<void> {
  const chunkSize = options?.chunkSize ?? 5000;
  const onProgress = options?.onProgress;
  const total = items.length;
  let written = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const existing = (await get<T[]>(PREFIX + key)) ?? [];
    await set(PREFIX + key, [...existing, ...chunk]);
    written += chunk.length;
    onProgress?.(written, total);
    // Yield to event loop so UI can repaint progress
    if (i + chunkSize < total) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/**
 * One-time migration: copy a value from window.localStorage into
 * IndexedDB, then delete the localStorage entry. Returns true if a
 * migration was performed.
 */
export async function migrateFromLocalStorage(
  storageKey: string,
  newKey: string = storageKey,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return false;
    // Only attempt JSON.parse if the value looks like JSON. Plain strings
    // (e.g. "ID645 : Studio 7") would otherwise throw and pollute the console.
    const trimmed = raw.trim();
    const looksLikeJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      trimmed === "null" ||
      trimmed === "true" ||
      trimmed === "false" ||
      /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed);
    const parsed = looksLikeJson ? JSON.parse(raw) : raw;
    await setItem(newKey, parsed);
    window.localStorage.removeItem(storageKey);
    console.info(`[storage] Migrated localStorage[${storageKey}] → IDB[${newKey}]`);
    return true;
  } catch (e) {
    console.warn(`[storage] migrateFromLocalStorage(${storageKey}) failed:`, e);
    return false;
  }
}
