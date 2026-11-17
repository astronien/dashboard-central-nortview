/**
 * ตั้งค่าของหน้า Run Rate ต่อสาขา (จำไว้ในเครื่อง): หมวด/สินค้าที่ไม่นับ,
 * ของมาถึงในกี่วัน, สั่งให้พอขายกี่วัน, เกณฑ์ของค้าง, เตือนล่วงหน้ากี่วัน
 */
import type { ReorderItem, RunRateResult, RunRateRow } from "./runRate";

export type RunRatePrefs = {
  excludedCats: string[];
  excludedProducts: string[];
  /** ของมาถึงในกี่วันหลังสั่ง */
  leadDays: number;
  /** สั่งให้พอขายกี่วัน */
  targetCover: number;
  /** พอขายเกินกี่วัน = ของค้าง */
  deadCover: number;
  /** เตือนล่วงหน้ากี่วันก่อนถึงวันต้องสั่ง */
  warnDays: number;
  /** ส่งแจ้งเตือนสต็อกเข้า Telegram อัตโนมัติ (วันละครั้ง) */
  telegramAlert: boolean;
};

export const DEFAULT_RUNRATE_PREFS: RunRatePrefs = {
  excludedCats: [],
  excludedProducts: [],
  leadDays: 14,
  targetCover: 30,
  deadCover: 90,
  warnDays: 7,
  telegramAlert: true,
};

const keyOf = (branch: string) => `runrate-prefs:${branch || "default"}`;

export function loadRunRatePrefs(branch: string): RunRatePrefs {
  try {
    const raw = localStorage.getItem(keyOf(branch));
    if (!raw) return { ...DEFAULT_RUNRATE_PREFS };
    return { ...DEFAULT_RUNRATE_PREFS, ...(JSON.parse(raw) as Partial<RunRatePrefs>) };
  } catch {
    return { ...DEFAULT_RUNRATE_PREFS };
  }
}

export function saveRunRatePrefs(branch: string, prefs: RunRatePrefs) {
  try {
    localStorage.setItem(keyOf(branch), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** ตัดหมวด/สินค้าที่ติ๊กไม่นับออกจากผล Run Rate */
export function applyRunRateExclusions(data: RunRateResult, prefs: RunRatePrefs): RunRateResult {
  if (!prefs.excludedCats.length && !prefs.excludedProducts.length) return data;
  const cats = new Set(prefs.excludedCats);
  const prods = new Set(prefs.excludedProducts);
  const categories = data.categories.filter((c) => !cats.has(c.label));
  const totalUnits = categories.reduce((s, c) => s + c.units, 0);
  return {
    ...data,
    totalUnits,
    categories: categories.map((c) => ({ ...c, sharePct: totalUnits > 0 ? (c.units / totalUnits) * 100 : 0 })),
    products: data.products.filter((p) => !(p.sub && cats.has(p.sub)) && !prods.has(p.label)),
  };
}

export type UpcomingReorder = {
  label: string;
  sub?: string;
  stock: number;
  unitsPerDay: number;
  coverDays: number;
  /** ต้องสั่งภายในกี่วัน (พอขาย − ของมาถึง) */
  orderInDays: number;
  suggestQty: number;
};

/** ใกล้ถึงวันต้องสั่ง: ยังพอขายเกินระยะของมาถึง แต่เหลืออีกไม่เกิน warnDays วัน */
export function buildUpcomingReorder(products: RunRateRow[], prefs: RunRatePrefs): UpcomingReorder[] {
  return products
    .filter(
      (p) =>
        p.stock != null &&
        p.coverDays != null &&
        p.unitsPerDay > 0 &&
        p.coverDays > prefs.leadDays &&
        p.coverDays <= prefs.leadDays + prefs.warnDays,
    )
    .map((p) => ({
      label: p.label,
      sub: p.sub,
      stock: p.stock ?? 0,
      unitsPerDay: p.unitsPerDay,
      coverDays: p.coverDays as number,
      orderInDays: Math.max(0, Math.floor((p.coverDays as number) - prefs.leadDays)),
      suggestQty: Math.max(0, Math.ceil(p.unitsPerDay * prefs.targetCover - (p.stock ?? 0))),
    }))
    .sort((a, b) => a.orderInDays - b.orderInDays);
}

// ── เก็บที่ server (ใช้ร่วมทุกเครื่อง) ─────────────────────────────────
export async function fetchRunRatePrefs(branch: string): Promise<RunRatePrefs | null> {
  try {
    const r = await fetch(`/api/staff-photos?resource=runrate-prefs&branch=${encodeURIComponent(branch)}`);
    const j = (await r.json()) as { ok?: boolean; prefs?: Partial<RunRatePrefs> | null };
    return j?.prefs ? { ...DEFAULT_RUNRATE_PREFS, ...j.prefs } : null;
  } catch {
    return null;
  }
}

export async function pushRunRatePrefs(branch: string, prefs: RunRatePrefs, updatedBy?: string): Promise<boolean> {
  try {
    const r = await fetch("/api/staff-photos?resource=runrate-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, prefs, updatedBy }),
    });
    return Boolean(((await r.json()) as { ok?: boolean })?.ok);
  } catch {
    return false;
  }
}

// ── ข้อความแจ้งเตือน Telegram ─────────────────────────────────────────
const n0 = (n: number) => Math.round(n).toLocaleString();

export function buildStockAlertText(params: {
  branch: string;
  dateLabel: string;
  now: ReorderItem[];
  soon: UpcomingReorder[];
  prefs: RunRatePrefs;
}): string {
  const { branch, dateLabel, now, soon, prefs } = params;
  const lines: string[] = [`แจ้งเตือนสต็อก · ${branch} · ${dateLabel}`];
  if (now.length) {
    lines.push("", `ต้องสั่งตอนนี้ (${now.length})`);
    for (const r of now.slice(0, 30)) {
      lines.push(`• ${r.label} — เหลือ ${n0(r.stock)} · พอขาย ${Math.floor(r.coverDays)} วัน · ควรสั่ง +${n0(r.suggestQty)}`);
    }
    if (now.length > 30) lines.push(`…และอีก ${now.length - 30} รายการ`);
  }
  if (soon.length) {
    lines.push("", `ใกล้ถึงวันต้องสั่ง ภายใน ${prefs.warnDays} วัน (${soon.length})`);
    for (const r of soon.slice(0, 30)) {
      const when = r.orderInDays === 0 ? "พรุ่งนี้" : `ภายใน ${r.orderInDays} วัน`;
      lines.push(`• ${r.label} — ต้องสั่ง${when} · เหลือ ${n0(r.stock)} · ควรสั่ง +${n0(r.suggestQty)}`);
    }
    if (soon.length > 30) lines.push(`…และอีก ${soon.length - 30} รายการ`);
  }
  lines.push("", `(ของมาถึงใน ${prefs.leadDays} วัน · สั่งให้พอขาย ${prefs.targetCover} วัน)`);
  return lines.join("\n");
}

/** ส่งข้อความเข้า Telegram — alertKey = ส่งแค่วันละครั้ง, force = ส่งแน่นอน */
export async function sendStockAlertTelegram(
  text: string,
  alertKey: string,
  force = false,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const r = await fetch("/api/telegram-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, alertKey, force }),
    });
    const j = (await r.json()) as { ok?: boolean; skipped?: boolean; error?: string };
    return { ok: Boolean(j?.ok), skipped: j?.skipped, error: j?.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
