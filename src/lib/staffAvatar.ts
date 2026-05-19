export type StaffPhotoRecord = {
  staffId: string;
  officerKey: string;
  displayName: string;
  branch: string;
  photoUrl: string;
  updatedAt?: string;
};

export type StaffPhotosMap = Record<string, StaffPhotoRecord>;

const DEFAULT_AVATARS = ["/staff2.png", "/staff3.png", "/staff2.png"];

export type StaffRosterEntry = {
  staffId: string;
  officerKey: string;
  name: string;
  branch: string;
};

type RawRow = Record<string, string | number | undefined>;
type ReportOfficer = { name: string; branch: string };

export const buildStaffRoster = (
  targetRows: RawRow[],
  reportOfficers: ReportOfficer[],
  cleanName: (name: string) => string,
): StaffRosterEntry[] => {
  const map = new Map<string, StaffRosterEntry>();

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
  }

  if (map.size === 0) {
    reportOfficers.forEach((officer) => {
      const officerKey = cleanName(officer.name);
      if (!officerKey || map.has(officerKey)) return;
      map.set(officerKey, {
        staffId: officerKey,
        officerKey,
        name: officer.name,
        branch: officer.branch,
      });
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
};

export const getStaffAvatar = (
  photos: StaffPhotosMap,
  opts: {
    staffId?: string | number;
    officerKey?: string;
    fallbackIndex?: number;
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

  const idx = opts.fallbackIndex ?? 0;
  return DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length];
};

const preservesTransparency = (file: File) =>
  file.type === "image/png" ||
  file.type === "image/webp" ||
  file.type === "image/gif";

/** PNG/WebP เก็บ alpha — JPEG บีบอัดไฟล์เล็กลง (พื้นหลังขาว) */
export const resizeImageFile = (file: File, maxSize = 320): Promise<string> =>
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
