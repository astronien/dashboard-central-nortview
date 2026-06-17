import { getItem, setItem, removeItem } from "./storage";

export type UploadKind =
  | "target"
  | "current"
  | "today"
  | "lastMonth"
  | "lastYear"
  | "categoryMaster";

export type RawRow = Record<string, string | number | undefined>;
export type UploadState = Record<UploadKind, RawRow[]>;

const UPLOADS_PREFIX = "dashboard-uploads:";

const UPLOAD_KINDS: UploadKind[] = [
  "target",
  "current",
  "today",
  "lastMonth",
  "lastYear",
  "categoryMaster",
];

const kindKey = (kind: UploadKind) => `${UPLOADS_PREFIX}${kind}`;

export const hasUploadData = (state: UploadState) =>
  Object.values(state).some((rows) => rows.length > 0);

const fetchUploadKind = async (kind: UploadKind): Promise<RawRow[]> => {
  const rows = await getItem<RawRow[]>(kindKey(kind));
  return Array.isArray(rows) ? rows : [];
};

export const fetchUploads = async (): Promise<UploadState | null> => {
  const entries = await Promise.all(
    UPLOAD_KINDS.map(async (kind) => [kind, await fetchUploadKind(kind)] as const),
  );

  const state = Object.fromEntries(entries) as UploadState;
  return hasUploadData(state) ? state : null;
};

export const saveUploadKind = async (
  kind: UploadKind,
  rows: RawRow[],
): Promise<boolean> => {
  try {
    await setItem(kindKey(kind), rows);
    return true;
  } catch (e) {
    console.error(`[uploadsApi] saveUploadKind(${kind}) failed:`, e);
    return false;
  }
};

export const saveUploads = async (
  state: UploadState,
  kinds: UploadKind[] = UPLOAD_KINDS,
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
    await removeItem(kindKey(kind));
    return true;
  } catch (e) {
    console.error(`[uploadsApi] deleteUploadKind(${kind}) failed:`, e);
    return false;
  }
};

export const clearAllUploads = async (): Promise<boolean> => {
  let ok = true;
  for (const kind of UPLOAD_KINDS) {
    const deleted = await deleteUploadKind(kind);
    if (!deleted) ok = false;
  }
  return ok;
};

export type TursoHealthStats = Record<
  UploadKind,
  { rowCount: number; storage?: string; updatedAt?: string }
>;

/**
 * Returns empty stats now that we no longer keep an in-memory snapshot
 * of Turso data. The component that displays these stats no longer
 * references this shape, but the type stays exported for compatibility
 * with the few places that still pass it down to ReportsSection.
 */
export const fetchTursoStats = async (): Promise<{
  database: string;
  stats: TursoHealthStats;
} | null> => {
  return null;
};
