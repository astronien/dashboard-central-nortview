import { compressJson } from "./compress";

export type UploadKind =
  | "target"
  | "current"
  | "lastMonth"
  | "lastYear"
  | "categoryMaster";

export type RawRow = Record<string, string | number | undefined>;
export type UploadState = Record<UploadKind, RawRow[]>;

const UPLOADS_URL = "/api/uploads";
const UPLOAD_KINDS: UploadKind[] = [
  "target",
  "current",
  "lastMonth",
  "lastYear",
  "categoryMaster",
];

const UPLOAD_ROW_LIMIT = 1200;

export const hasUploadData = (state: UploadState) =>
  Object.values(state).some((rows) => rows.length > 0);

const splitRows = (rows: RawRow[]) => {
  const chunks: RawRow[][] = [];
  for (let i = 0; i < rows.length; i += UPLOAD_ROW_LIMIT) {
    chunks.push(rows.slice(i, i + UPLOAD_ROW_LIMIT));
  }
  return chunks;
};

const fetchUploadKind = async (kind: UploadKind): Promise<RawRow[]> => {
  const response = await fetch(`${UPLOADS_URL}/${kind}`);
  if (!response.ok) return [];

  const payload = (await response.json()) as { rows?: RawRow[] };
  return Array.isArray(payload.rows) ? payload.rows : [];
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
  const chunks = splitRows(rows);

  if (!chunks.length) {
    const response = await fetch(`${UPLOADS_URL}/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "gzip-base64", data: await compressJson([]) }),
    });
    return response.ok;
  }

  if (chunks.length === 1) {
    const data = await compressJson(chunks[0]);
    const response = await fetch(`${UPLOADS_URL}/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "gzip-base64", data }),
    });
    return response.ok;
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const data = await compressJson(chunks[chunkIndex]);
    const response = await fetch(`${UPLOADS_URL}/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "gzip-base64",
        data,
        chunkIndex,
        chunkCount: chunks.length,
      }),
    });
    if (!response.ok) return false;
  }

  return true;
};

export const saveUploads = async (
  state: UploadState,
  kinds: UploadKind[] = UPLOAD_KINDS,
): Promise<boolean> => {
  const results = await Promise.all(
    kinds.map((kind) => saveUploadKind(kind, state[kind] ?? [])),
  );
  return results.every(Boolean);
};

export const deleteUploadKind = async (kind: UploadKind): Promise<boolean> => {
  const response = await fetch(`${UPLOADS_URL}/${kind}`, { method: "DELETE" });
  return response.ok;
};
