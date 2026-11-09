/**
 * ธีมสีของแดชบอร์ด — มืด / สว่าง (class บน <html> ที่ index.css ใช้ re-map สีพื้น)
 * ค่าธีมเก่า (forest/ocean/…/sky/sand) ที่เคยเลือกไว้จะถูกแปลงเป็นมืดหรือสว่างอัตโนมัติ
 */
export type ThemeId = "dark" | "light";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  dark: boolean;
  /** สีตัวอย่าง (พื้น, แผง) */
  swatch: [string, string];
  /** class ที่ใส่บน <html> */
  classes: string[];
};

export const THEMES: ThemeDef[] = [
  { id: "dark", label: "มืด", dark: true, swatch: ["#121211", "#262623"], classes: ["theme-dark"] },
  { id: "light", label: "สว่าง", dark: false, swatch: ["#eeede9", "#ffffff"], classes: ["theme-light"] },
];

const OLD_LIGHT = new Set(["light", "sky", "sand"]);
const ALL_CLASSES = ["theme-dark", "theme-light", "theme-ocean", "theme-graphite", "theme-plum", "theme-wine", "theme-sky", "theme-sand"];

export const findTheme = (id: string | null | undefined): ThemeDef =>
  OLD_LIGHT.has(String(id ?? "")) ? THEMES[1] : THEMES[0];

export function applyTheme(id: ThemeId) {
  const t = findTheme(id);
  const el = document.documentElement;
  ALL_CLASSES.forEach((c) => el.classList.remove(c));
  t.classes.forEach((c) => el.classList.add(c));
}
