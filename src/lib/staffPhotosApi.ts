import type { StaffPhotoRecord, StaffPhotosMap } from "./staffAvatar";

const API_URL = "/api/staff-photos";
const STORAGE_KEY = "dashboard-staff-photos-v1";

const toMap = (photos: StaffPhotoRecord[]): StaffPhotosMap =>
  Object.fromEntries(photos.map((p) => [p.staffId, p]));

const loadLocal = (): StaffPhotosMap | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffPhotoRecord[];
    return Array.isArray(parsed) && parsed.length ? toMap(parsed) : null;
  } catch {
    return null;
  }
};

const saveLocal = (map: StaffPhotosMap) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(map)));
  } catch {
    // ignore quota errors
  }
};

export const fetchStaffPhotos = async (): Promise<StaffPhotosMap | null> => {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const payload = (await response.json()) as { photos?: StaffPhotoRecord[] };
      if (Array.isArray(payload.photos)) {
        const map = toMap(payload.photos);
        if (Object.keys(map).length) saveLocal(map);
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
  const localMap = { ...(loadLocal() ?? {}), [record.staffId]: record };
  saveLocal(localMap);

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
  const local = loadLocal() ?? {};
  delete local[staffId];
  saveLocal(local);

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
