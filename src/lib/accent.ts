/**
 * สีหลักที่ผู้ใช้เลือกเอง — ทำงานคู่กับธีมมืด/สว่าง
 * เลือกสีหลัก 1 สี → ระบบสร้างสีรอง + พื้นผิวอมสีให้อัตโนมัติ
 * แล้วใส่เป็น CSS variables บน <html> (index.css: html.accent-custom …)
 */

export const ACCENT_PRESETS = [
  "#10b981", // เขียว (ค่าเริ่มต้นของ Studio 7)
  "#3b82f6", // น้ำเงิน
  "#8b5cf6", // ม่วง
  "#ec4899", // ชมพู
  "#ef4444", // แดง
  "#f97316", // ส้ม
  "#eab308", // เหลือง
  "#14b8a6", // เขียวอมฟ้า
];

type Hsl = { h: number; s: number; l: number };

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

const hsl = (h: number, s: number, l: number, a?: number) =>
  a == null
    ? `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%)`
    : `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;

/** สีรองอัตโนมัติ: หมุนวงล้อสี 150° (ตรงข้ามแบบนุ่ม) ให้แยกจากสีหลักชัด แต่ไม่ชนกันแรง */
export const secondaryHue = (h: number) => h + 150;

export function buildAccentVars(hex: string, dark: boolean): Record<string, string> | null {
  const c = hexToHsl(hex);
  if (!c) return null;
  const s = Math.max(45, Math.min(c.s, 90)); // สีเทา/ซีดเกินไปจะดูไม่ออกว่าเป็นสีหลัก
  const h2 = secondaryHue(c.h);
  return {
    "--accent": hsl(c.h, s, dark ? 58 : 45),
    "--accent-text": hsl(c.h, s, dark ? 72 : 32),
    "--accent-strong": hsl(c.h, s, dark ? 45 : 38),
    "--accent-soft": hsl(c.h, s, 55, dark ? 0.16 : 0.12),
    "--accent-softer": hsl(c.h, s, 55, dark ? 0.08 : 0.06),
    "--accent-border": hsl(c.h, s, 55, 0.35),
    "--accent2": hsl(h2, s * 0.85, dark ? 60 : 44),
    "--accent2-text": hsl(h2, s * 0.85, dark ? 74 : 32),
    "--accent2-soft": hsl(h2, s * 0.85, 55, dark ? 0.16 : 0.12),
    "--accent2-border": hsl(h2, s * 0.85, 55, 0.35),
    // พื้นผิวอมสีหลักเล็กน้อย (ยังเป็นโทนกลาง ไม่ใช่พื้นสี)
    "--surface-root": dark ? hsl(c.h, 10, 7) : hsl(c.h, 14, 93),
    "--surface-panel": dark ? hsl(c.h, 9, 10) : hsl(c.h, 20, 98),
    "--surface-raised": dark ? hsl(c.h, 9, 15) : hsl(c.h, 16, 91),
    "--surface-sunken": dark ? hsl(c.h, 9, 12) : hsl(c.h, 18, 96),
    "--surface-hero": dark ? hsl(c.h, 9, 12) : "#ffffff",
  };
}

const VAR_KEYS = Object.keys(buildAccentVars("#10b981", true) ?? {});

/** ใส่/ล้างสีหลักบน <html> */
export function applyAccent(hex: string | null, dark: boolean) {
  const el = document.documentElement;
  const vars = hex ? buildAccentVars(hex, dark) : null;
  if (!vars) {
    el.classList.remove("accent-custom");
    VAR_KEYS.forEach((k) => el.style.removeProperty(k));
    return;
  }
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  el.classList.add("accent-custom");
}

/** สีรองเป็น hex (ไว้โชว์ตัวอย่างในตัวเลือก) */
export function secondaryPreview(hex: string): string {
  const c = hexToHsl(hex);
  if (!c) return hex;
  return hsl(secondaryHue(c.h), Math.max(45, Math.min(c.s, 90)) * 0.85, 55);
}
