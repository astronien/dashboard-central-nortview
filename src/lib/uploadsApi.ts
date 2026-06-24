/**
 * Uploaded file API — Turso-backed persistence.
 *
 * Replaces the previous IDB-based storage so files are shared across
 * devices and survive browser data clears.
 *
 * Each upload kind (target, current, today, lastMonth, lastYear,
 * categoryMaster) is chunked into Turso and re-assembled on read.
 * Re-uploading a file replaces the existing chunks for that kind.
 */

import {
  cloudClearAllUploads,
  cloudDeleteUpload,
  cloudFetchUploadMeta,
  cloudFetchUploads,
  cloudSetUpload,
  hasUploadData as cloudHasUploadData,
  type RawRow,
  type UploadKind,
  type UploadState,
  type UploadMeta,
} from "./cloudStorage";

export type { RawRow, UploadKind, UploadState, UploadMeta };

export const hasUploadData = (state: UploadState) => cloudHasUploadData(state);

export const fetchUploads = async (): Promise<UploadState | null> => {
  return cloudFetchUploads();
};

export const saveUploadKind = async (
  kind: UploadKind,
  rows: RawRow[],
  fileName?: string,
): Promise<boolean> => {
  try {
    await cloudSetUpload(kind, rows, fileName);
    return true;
  } catch (e) {
    console.error(`[uploadsApi] saveUploadKind(${kind}) failed:`, e);
    return false;
  }
};

export const saveUploads = async (
  state: UploadState,
  kinds: UploadKind[] = [
    "target",
    "current",
    "today",
    "lastMonth",
    "lastYear",
    "categoryMaster",
  ],
): Promise<boolean> => {
  let ok = true;
  for (const kind of kinds) {
    const saved = await saveUploadKind(kind, state[kind] ?? []);
    if (!saved) ok = false;
  }
  return ok;
};

export const deleteUploadKind = async (kind: UploadKind): Promise<boolean> => {
  try {
    await cloudDeleteUpload(kind);
    return true;
  } catch (e) {
    console.error(`[uploadsApi] deleteUploadKind(${kind}) failed:`, e);
    return false;
  }
};

export const clearAllUploads = async (): Promise<boolean> => {
  try {
    await cloudClearAllUploads();
    return true;
  } catch (e) {
    console.error(`[uploadsApi] clearAllUploads failed:`, e);
    return false;
  }
};

export type TursoHealthStats = Record<
  UploadKind,
  { rowCount: number; storage?: string; updatedAt?: string }
>;

/**
 * Returns lightweight metadata for the Reports page UI.
 * Backed by `upload_chunks` table in Turso.
 */
export const fetchTursoStats = async (): Promise<{
  database: string;
  stats: TursoHealthStats;
} | null> => {
  try {
    const meta = await cloudFetchUploadMeta();
    const stats: TursoHealthStats = {
      target: { rowCount: meta.target.rowCount, updatedAt: meta.target.updatedAt },
      current: { rowCount: meta.current.rowCount, updatedAt: meta.current.updatedAt },
      today: { rowCount: meta.today.rowCount, updatedAt: meta.today.updatedAt },
      lastMonth: { rowCount: meta.lastMonth.rowCount, updatedAt: meta.lastMonth.updatedAt },
      lastYear: { rowCount: meta.lastYear.rowCount, updatedAt: meta.lastYear.updatedAt },
      categoryMaster: { rowCount: meta.categoryMaster.rowCount, updatedAt: meta.categoryMaster.updatedAt },
    };
    return { database: "turso", stats };
  } catch (e) {
    console.warn("[uploadsApi] fetchTursoStats failed:", e);
    return null;
  }
};
