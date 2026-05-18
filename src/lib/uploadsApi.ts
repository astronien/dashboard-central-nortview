export type UploadKind =
  | "target"
  | "current"
  | "lastMonth"
  | "lastYear"
  | "categoryMaster";

export type RawRow = Record<string, string | number | undefined>;
export type UploadState = Record<UploadKind, RawRow[]>;

const UPLOADS_URL = "/api/uploads";

export const hasUploadData = (state: UploadState) =>
  Object.values(state).some((rows) => rows.length > 0);

export const fetchUploads = async (): Promise<UploadState | null> => {
  const response = await fetch(UPLOADS_URL);
  if (!response.ok) return null;

  const data = (await response.json()) as UploadState;
  return hasUploadData(data) ? data : null;
};

export const saveUploads = async (state: UploadState): Promise<boolean> => {
  const response = await fetch(UPLOADS_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  return response.ok;
};

export const deleteUploadKind = async (kind: UploadKind): Promise<boolean> => {
  const response = await fetch(`${UPLOADS_URL}/${kind}`, { method: "DELETE" });
  return response.ok;
};
