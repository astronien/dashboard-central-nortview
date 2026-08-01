export type StaffPhotoRecord = {
  staffId: string;
  officerKey: string;
  displayName: string;
  branch: string;
  photoUrl: string;
  updatedAt?: string;
};

export type StaffPhotosMap = Record<string, StaffPhotoRecord>;

// Generic person silhouette as an inline SVG data URI — always decodable,
// so screenshot capture (html-to-image) never trips on a missing/broken
// avatar file for staff without an uploaded photo.
const GENERIC_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
      `<rect width="96" height="96" fill="#0c3123"/>` +
      `<circle cx="48" cy="38" r="16" fill="#34d399" opacity="0.45"/>` +
      `<path d="M16 88c4-18 17-26 32-26s28 8 32 26z" fill="#34d399" opacity="0.45"/>` +
      `</svg>`,
  );

const DEFAULT_AVATARS = [GENERIC_AVATAR];

export type StaffRosterEntry = {
  staffId: string;
  officerKey: string;
  name: string;
  branch: string;
};

type RawRow = Record<string, string | number | undefined>;
type ReportOfficer = { name: string; branch: string; staffId?: string };

export const buildStaffRoster = (
  targetRows: RawRow[],
  reportOfficers: ReportOfficer[],
  cleanName: (name: string) => string,
): StaffRosterEntry[] => {
  const map = new Map<string, StaffRosterEntry>();
  // Track which people are already in the roster by officerKey (name) so a
  // person listed in BOTH the target file and the sales data isn't added
  // twice under different keys.
  const seenOfficerKeys = new Set<string>();

  for (const row of targetRows) {
    const staffId = String(row["STAFF ID"] ?? row.staffId ?? "").trim();
    const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
    if (!name && !staffId) continue;

    const officerKey = cleanName(name || staffId);
    const key = staffId || officerKey;
    if (!key || map.has(key)) continue;

    map.set(key, {
      staffId: staffId || officerKey,
      officerKey,
      name: name || staffId,
      branch: String(row["BRANCH NAME"] ?? row.branch ?? "").trim(),
    });
    if (officerKey) seenOfficerKeys.add(officerKey);
  }

  // ALWAYS merge in officers seen in the sales data — a new month may add
  // staff who sold but aren't in the Target Excel yet. Without this they
  // show in Staff Profile (sales-derived) but not in the photo roster.
  reportOfficers.forEach((officer) => {
    const officerKey = cleanName(officer.name);
    if (!officerKey || seenOfficerKeys.has(officerKey)) return;
    const staffId = String(officer.staffId ?? "").trim() || officerKey;
    if (map.has(staffId)) return;
    map.set(staffId, {
      staffId,
      officerKey,
      name: officer.name,
      branch: officer.branch,
    });
    seenOfficerKeys.add(officerKey);
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
};

/**
 * Uploaded photo URL for a staff member, or "" when none exists.
 * Use this where "no photo" should hide the image entirely.
 */
export const getStaffPhotoUrl = (
  photos: StaffPhotosMap,
  opts: {
    staffId?: string | number;
    officerKey?: string;
  },
): string => {
  const staffId = opts.staffId != null ? String(opts.staffId) : "";
  if (staffId && photos[staffId]?.photoUrl) {
    return photos[staffId].photoUrl;
  }

  const officerKey = opts.officerKey ?? "";
  if (officerKey) {
    const match = Object.values(photos).find((p) => p.officerKey === officerKey);
    if (match?.photoUrl) return match.photoUrl;
  }

  return "";
};

export const getStaffAvatar = (
  photos: StaffPhotosMap,
  opts: {
    staffId?: string | number;
    officerKey?: string;
    fallbackIndex?: number;
  },
): string => {
  const photo = getStaffPhotoUrl(photos, opts);
  if (photo) return photo;
  const idx = opts.fallbackIndex ?? 0;
  return DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length];
};

const preservesTransparency = (file: File) =>
  file.type === "image/png" ||
  file.type === "image/webp" ||
  file.type === "image/gif";

/** PNG/WebP เก็บ alpha — JPEG บีบอัดไฟล์เล็กลง (พื้นหลังขาว) */
export const resizeImageFile = (file: File, maxSize = 800): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        reject(new Error("ไม่สามารถประมวลผลรูปได้"));
        return;
      }

      const keepAlpha = preservesTransparency(file);
      if (!keepAlpha) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);
      resolve(
        keepAlpha
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.85),
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    };
    img.src = url;
  });
