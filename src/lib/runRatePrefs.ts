/**
 * ตั้งค่าของหน้า Run Rate ต่อสาขา: หมวด/สินค้าที่ไม่นับ, เกณฑ์ใกล้หมด,
 * ควรมีพอขายกี่วัน, เกณฑ์ของค้าง, เฝ้าดูล่วงหน้ากี่วัน
 * (ร้านสั่งของเองไม่ได้ — คลังจัดสรรตามรันเรท จึงใช้เป็น "ใกล้หมด / ควรได้เพิ่ม")
 */
import type { ReorderItem, RunRateResult, RunRateRow } from "./runRate";

export type RunRatePrefs = {
  excludedCats: string[];
  excludedProducts: string[];
  /** ใกล้หมด = พอขายไม่ถึงกี่วัน */
  leadDays: number;
  /** ควรมีของพอขายกี่วัน (ใช้คิด "ควรได้เพิ่ม") */
  targetCover: number;
  /** พอขายเกินกี่วัน = ของค้าง */
  deadCover: number;
  /** เฝ้าดูล่วงหน้ากี่วันก่อนเข้าโซนใกล้หมด */
  warnDays: number;
  /** ส่งแจ้งเตือนสต็อกเข้า Telegram อัตโนมัติ (วันละครั้ง) */
  telegramAlert: boolean;
};

export const DEFAULT_RUNRATE_PREFS: RunRatePrefs = {
  excludedCats: [],
  excludedProducts: [],
  leadDays: 7,
  targetCover: 14,
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
  /** วันที่ของไฟล์สต็อก — ใช้คิดวันที่คาดว่าหมด */
  stockDate?: Date | null;
  now: ReorderItem[];
  soon: UpcomingReorder[];
  prefs: RunRatePrefs;
  /** ลิงก์เปิดหน้าเว็บ (ท้ายข้อความ) */
  link?: string;
  /** โชว์กี่รายการแรก */
  top?: number;
}): string {
  const { branch, dateLabel, now, soon, prefs, stockDate, link, top = 8 } = params;
  const dm = (d: Date) =>
    new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(d);
  const out = (cover: number) =>
    stockDate ? dm(new Date(stockDate.getTime() + Math.floor(cover) * 86_400_000)) : `อีก ${Math.floor(cover)} วัน`;
  // ชื่อสินค้ายาว → ตัดคำซ้ำซ้อน (APPLE, -THA ฯลฯ) และย่อให้อ่านบนมือถือได้
  const short = (name: string) => {
    const t = name
      .replace(/^apple\s+/i, "")
      .replace(/[-–]\s*(tha|th)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return t.length > 38 ? `${t.slice(0, 37)}…` : t;
  };
  const shortBranch = branch.replace(/^ID\d+\s*:\s*/i, "").replace(/studio\s*7-?/i, "").trim() || branch;

  const lines: string[] = [`สต็อก ${shortBranch} · ${dateLabel}`];
  lines.push(
    `ใกล้หมด ${now.length} · เฝ้าดู ${soon.length}${stockDate ? ` (สต็อก ณ ${dm(stockDate)})` : ""}`,
  );

  // หมดก่อนสุด N รายการ (รวมทั้งสองกลุ่ม เรียงตามวันที่จะหมด)
  const all = [
    ...now.map((r) => ({ label: r.label, stock: r.stock, cover: r.coverDays, sub: r.sub })),
    ...soon.map((r) => ({ label: r.label, stock: r.stock, cover: r.coverDays, sub: r.sub })),
  ].sort((a, b) => a.cover - b.cover);
  if (all.length) {
    lines.push("", `หมดก่อน ${Math.min(top, all.length)} อันดับแรก`);
    all.slice(0, top).forEach((r, i) => {
      lines.push(`${i + 1}. ${short(r.label)}`);
      lines.push(`   เหลือ ${n0(r.stock)} · หมด ${out(r.cover)}`);
    });
  }

  // ที่เหลือ: นับแยกหมวด สั้นๆ บรรทัดเดียว
  const rest = all.slice(top);
  if (rest.length) {
    const byCat = new Map<string, number>();
    for (const r of rest) byCat.set(r.sub || "อื่นๆ", (byCat.get(r.sub || "อื่นๆ") ?? 0) + 1);
    const cats = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c} ${n}`)
      .join(" · ");
    lines.push("", `อีก ${rest.length} รายการ: ${cats}`);
  }
  lines.push("", `ดูทั้งหมดที่หน้า Run Rate${link ? `\n${link}` : ""}`);
  void prefs;
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

/** วันที่ของไฟล์สต็อก (updatedAt จาก server เป็นเวลา UTC "YYYY-MM-DD HH:MM:SS") */
export const parseStockDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(/T|Z/.test(v) ? v : `${v.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
