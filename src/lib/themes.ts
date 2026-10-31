/**
 * ธีมสีของแดชบอร์ด — แต่ละธีมคือ class บน <html> ที่ index.css ใช้แทนสีพื้น
 * (แอปเขียนด้วยโทนเขียวเข้มเป็นหลัก ธีมอื่นจะ re-map สีเหล่านั้น)
 */
export type ThemeId = "forest" | "ocean" | "graphite" | "plum" | "wine" | "light" | "sky" | "sand";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  dark: boolean;
  /** สีตัวอย่าง (พื้น, สีหลัก) */
  swatch: [string, string];
  /** class ที่ใส่บน <html> */
  classes: string[];
};

export const THEMES: ThemeDef[] = [
  { id: "forest", label: "เขียวป่า (ค่าเริ่มต้น)", dark: true, swatch: ["#123627", "#1b5d44"], classes: [] },
  { id: "ocean", label: "น้ำเงินมหาสมุทร", dark: true, swatch: ["#0f2440", "#1b3f66"], classes: ["theme-ocean"] },
  { id: "graphite", label: "เทาถ่าน", dark: true, swatch: ["#232529", "#3a3d44"], classes: ["theme-graphite"] },
  { id: "plum", label: "ม่วงพลัม", dark: true, swatch: ["#2a183a", "#4a2a63"], classes: ["theme-plum"] },
  { id: "wine", label: "แดงไวน์", dark: true, swatch: ["#3a141b", "#6a2430"], classes: ["theme-wine"] },
  { id: "light", label: "สว่าง (มิ้นต์)", dark: false, swatch: ["#e8f1ec", "#ffffff"], classes: ["theme-light"] },
  { id: "sky", label: "สว่าง (ฟ้า)", dark: false, swatch: ["#e5eef9", "#ffffff"], classes: ["theme-light", "theme-sky"] },
  { id: "sand", label: "สว่าง (ครีม)", dark: false, swatch: ["#f3ecdf", "#fffdf9"], classes: ["theme-light", "theme-sand"] },
];

const ALL_CLASSES = Array.from(new Set(THEMES.flatMap((t) => t.classes)));

export const findTheme = (id: string | null | undefined): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? (id === "dark" ? THEMES[0] : THEMES[0]);

export function applyTheme(id: ThemeId) {
  const t = findTheme(id);
  const el = document.documentElement;
  ALL_CLASSES.forEach((c) => el.classList.remove(c));
  t.classes.forEach((c) => el.classList.add(c));
}
