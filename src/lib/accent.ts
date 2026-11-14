/**
 * สีพื้นหลังโดยรวมที่ผู้ใช้เลือกเอง — ทำงานคู่กับธีมมืด/สว่าง
 * เลือกสีหลัก 1 สี → พื้นหลัง/แผงเป็นโทนสีนั้น + ระบบเลือกสีเน้น (สีรอง) ให้อัตโนมัติ
 * แล้วใส่เป็น CSS variables บน <html> (index.css: html.accent-custom …)
 */

export const ACCENT_PRESETS = [
  "#1b5d44", // เขียวป่า (แบบเดิมของ Studio 7)
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

/** สีเน้นอัตโนมัติ: หมุนวงล้อสีไป 35° (สีข้างเคียง) ให้กลมกลืนกับพื้นแต่ยังเด่น */
export const secondaryHue = (h: number) => h + 35;

export function buildAccentVars(hex: string, dark: boolean): Record<string, string> | null {
  const c = hexToHsl(hex);
  if (!c) return null;
  const s = Math.max(35, Math.min(c.s, 85));
  const h = c.h;
  const h2 = secondaryHue(h);
  const h3 = h + 180; // สีที่ 3 (ป้ายข้อมูลรอง) — ตรงข้ามพื้น
  // พื้นหลังโดยรวม = สีที่เลือก (ธีมมืด: เข้ม / ธีมสว่าง: อ่อน)
  const bg = dark
    ? {
        root: hsl(h, s * 0.45, 7),
        panel: hsl(h, s * 0.5, 13),
        raised: hsl(h, s * 0.45, 19),
        sunken: hsl(h, s * 0.45, 10),
        hero: hsl(h, s * 0.45, 15),
        active: hsl(h, s * 0.45, 24),
      }
    : {
        root: hsl(h, s * 0.55, 91),
        panel: hsl(h, s * 0.6, 97),
        raised: hsl(h, s * 0.5, 88),
        sunken: hsl(h, s * 0.55, 94),
        hero: hsl(h, s * 0.55, 99),
        active: hsl(h, s * 0.5, 84),
      };
  return {
    "--surface-root": bg.root,
    "--surface-panel": bg.panel,
    "--surface-raised": bg.raised,
    "--surface-sunken": bg.sunken,
    "--surface-hero": bg.hero,
    "--surface-active": bg.active,
    "--capture-bg": bg.root,
    // สีเน้น (อัตโนมัติจากสีพื้น)
    "--accent": hsl(h2, Math.max(s, 60), dark ? 60 : 42),
    "--accent-text": hsl(h2, Math.max(s, 60), dark ? 72 : 30),
    "--accent-strong": hsl(h2, Math.max(s, 60), dark ? 48 : 36),
    "--accent-soft": hsl(h2, Math.max(s, 60), 55, dark ? 0.18 : 0.14),
    "--accent-softer": hsl(h2, Math.max(s, 60), 55, dark ? 0.09 : 0.07),
    "--accent-border": hsl(h2, Math.max(s, 60), 55, 0.38),
    "--accent2": hsl(h3, s * 0.8, dark ? 62 : 42),
    "--accent2-text": hsl(h3, s * 0.8, dark ? 75 : 30),
    "--accent2-soft": hsl(h3, s * 0.8, 55, dark ? 0.16 : 0.12),
    "--accent2-border": hsl(h3, s * 0.8, 55, 0.35),
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

/** ตัวอย่างสีสำหรับตัวเลือก: พื้น (ธีมมืด) + สีเน้นอัตโนมัติ */
export function previewColors(hex: string): { panel: string; accent: string } {
  const v = buildAccentVars(hex, true);
  return { panel: v?.["--surface-panel"] ?? hex, accent: v?.["--accent"] ?? hex };
}
