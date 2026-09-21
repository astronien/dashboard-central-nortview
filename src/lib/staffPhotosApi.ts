import type { StaffPhotoRecord, StaffPhotosMap } from "./staffAvatar";
import { getItem, setItem, removeItem } from "./storage";

const API_URL = "/api/staff-photos";
const STORAGE_KEY = "dashboard-staff-photos-v1";

const toMap = (photos: StaffPhotoRecord[]): StaffPhotosMap =>
  Object.fromEntries(photos.map((p) => [p.staffId, p]));

const loadLocal = async (): Promise<StaffPhotosMap | null> => {
  const arr = await getItem<StaffPhotoRecord[]>(STORAGE_KEY);
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return toMap(arr);
};

const saveLocal = async (map: StaffPhotosMap) => {
  await setItem(STORAGE_KEY, Object.values(map));
};

export const fetchStaffPhotos = async (): Promise<StaffPhotosMap | null> => {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const payload = (await response.json()) as { photos?: StaffPhotoRecord[] };
      if (Array.isArray(payload.photos)) {
        const map = toMap(payload.photos);
        if (Object.keys(map).length) await saveLocal(map);
        return map;
      }
    }
  } catch {
    // fall through to local
  }
  return loadLocal();
};

export const saveStaffPhoto = async (
  record: StaffPhotoRecord,
): Promise<boolean> => {
  const localMap = { ...(await loadLocal() ?? {}), [record.staffId]: record };
  await saveLocal(localMap);

  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const deleteStaffPhoto = async (staffId: string): Promise<boolean> => {
  const local = (await loadLocal()) ?? {};
  delete local[staffId];
  await saveLocal(local);

  try {
    const response = await fetch(
      `${API_URL}?staffId=${encodeURIComponent(staffId)}`,
      { method: "DELETE" },
    );
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Clear the local cache (IndexedDB entry). Used when the user explicitly
 * clears all data. Doesn't touch the Turso-backed API.
 */
export const clearLocalStaffPhotos = async (): Promise<void> => {
  await removeItem(STORAGE_KEY);
};

/** STAFF IDs hidden from the Staff Profile page (stored server-side). */
export const fetchHiddenStaffIds = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${API_URL}?resource=visible-staff`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.hidden) ? json.hidden.map(String) : [];
  } catch {
    return [];
  }
};

export const saveHiddenStaffIds = async (
  hidden: string[],
  updatedBy?: string,
): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}?resource=visible-staff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden, updatedBy }),
    });
    const json = await res.json().catch(() => null);
    return Boolean(res.ok && json?.ok);
  } catch {
    return false;
  }
};
