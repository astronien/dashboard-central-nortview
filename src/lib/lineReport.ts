/**
 * อัปโหลดรูปรีพอทให้ LINE bot ("report รายวัน")
 * รูปแคปในเบราว์เซอร์ → อัปทีละรูป (Vercel จำกัด body ~4.5MB ต่อ request)
 */

const API = "/api/line-webhook";

export type LineReportMeta = {
  date?: string;
  sig?: string;
  status?: "uploading" | "done";
  startedAt?: string;
  finishedAt?: string;
  images?: Array<{ id: string; kind: string; name: string }>;
};

const put = async (resource: string, body: unknown) => {
  const res = await fetch(`${API}?resource=${resource}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
};

export const fetchLineReportMeta = async (): Promise<LineReportMeta | null> => {
  try {
    const res = await fetch(`${API}?resource=report-meta`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.meta as LineReportMeta) ?? null;
  } catch {
    return null;
  }
};

export const beginLineReport = (date: string, sig: string, branch: string) =>
  put("report-begin", { date, sig, branch });

export const finishLineReport = (date: string, sig: string) =>
  put("report-done", { date, sig, dashboardUrl: window.location.origin });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });

/** ย่อรูป (JPEG) ให้กว้างไม่เกิน maxW — ใช้ทำ preview (< 1MB ตามข้อกำหนด LINE) */
const downscale = async (dataUrl: string, maxW: number, quality: number) => {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl, w: img.width, h: img.height };
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), w, h, srcW: img.width, srcH: img.height };
};

export const uploadLineReportImage = async (
  seq: number,
  kind: "home" | "staff",
  name: string,
  dataUrl: string,
) => {
  // รูปเต็ม: จำกัดกว้าง 1400px (ไฟล์ไม่ใหญ่เกิน body limit ~4.5MB) · preview: 720px (<1MB)
  const full = await downscale(dataUrl, 1400, 0.85);
  const preview = await downscale(dataUrl, 720, 0.8);
  return put("report-image", {
    seq,
    kind,
    name,
    w: full.w,
    h: full.h,
    data: full.dataUrl,
    preview: preview.dataUrl,
  });
};
