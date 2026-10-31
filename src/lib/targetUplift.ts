/**
 * ปรับเป้าเพิ่ม (Stretch Target) — เพิ่มเป้าเป็น % จากเป้าจริงในไฟล์ Target
 * เปิด/ปิดได้ · ตั้ง % รวม และ % รายหมวด (ว่าง = ใช้ % รวม)
 * เก็บใน app_config ผ่าน /api/staff-photos?resource=target-uplift
 */
import { parseTargetNumber } from "./targetAggregations";

export const UPLIFT_CATEGORIES = ["Mac", "iPad", "iPhone", "Apple Watch", "BTB", "BTB(Apple)", "SIM"] as const;
export type UpliftCategory = (typeof UPLIFT_CATEGORIES)[number];

export type TargetUplift = {
  enabled: boolean;
  /** % เพิ่มจากเป้าจริง (ใช้กับทุกหมวดที่ไม่ได้ตั้งแยก) */
  pct: number;
  /** % เพิ่มรายหมวด — null/undefined = ใช้ pct รวม */
  perCat: Partial<Record<UpliftCategory, number | null>>;
};

export const EMPTY_TARGET_UPLIFT: TargetUplift = { enabled: false, pct: 0, perCat: {} };

/** คอลัมน์ในไฟล์ Target ของแต่ละหมวด (รองรับชื่อแบบอื่นด้วย) */
const CAT_KEYS: Record<UpliftCategory, string[]> = {
  Mac: ["Mac", "macTarget"],
  iPad: ["iPad", "iPadTarget"],
  iPhone: ["iPhone", "iPhoneTarget"],
  "Apple Watch": ["Apple Watch", "watchTarget"],
  BTB: ["BTB", "btbTarget"],
  "BTB(Apple)": ["BTB(Apple)", "btbAppleTarget"],
  SIM: ["SIM", "simTarget"],
};
const TOTAL_KEYS = ["Total", "total", "totalTarget"];

export const pctFor = (cfg: TargetUplift, cat: UpliftCategory): number => {
  const v = cfg.perCat?.[cat];
  return typeof v === "number" && Number.isFinite(v) ? v : cfg.pct;
};

export const upliftActive = (cfg: TargetUplift): boolean =>
  cfg.enabled && (cfg.pct !== 0 || Object.values(cfg.perCat ?? {}).some((v) => typeof v === "number" && v !== 0));

/** ป้ายสั้นๆ เช่น "เป้า +10%" / "เป้า +10% (iPhone +15%)" */
export const upliftLabel = (cfg: TargetUplift): string => {
  if (!upliftActive(cfg)) return "";
  const extras = UPLIFT_CATEGORIES.filter((c) => typeof cfg.perCat?.[c] === "number" && cfg.perCat[c] !== cfg.pct).map(
    (c) => `${c} ${fmtPct(cfg.perCat[c] as number)}`,
  );
  return `เป้า ${fmtPct(cfg.pct)}${extras.length ? ` (${extras.join(", ")})` : ""}`;
};
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 100) / 100}%`;

/**
 * คืนแถว Target ชุดใหม่ที่ปรับเป้าแล้ว (ไม่แก้ของเดิม)
 * Total = Total เดิม + ส่วนที่เพิ่มของแต่ละหมวด (ไม่รวม SIM ซึ่งเป็นจำนวนชิ้น)
 */
export function applyTargetUplift<T extends Record<string, unknown>>(rows: T[], cfg: TargetUplift): T[] {
  if (!upliftActive(cfg)) return rows;
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    let addedBaht = 0;
    let anyCat = false;
    for (const cat of UPLIFT_CATEGORIES) {
      const p = pctFor(cfg, cat);
      for (const k of CAT_KEYS[cat]) {
        if (!(k in row) || row[k] === "" || row[k] == null) continue;
        const v = parseTargetNumber(row[k]);
        if (!Number.isFinite(v)) continue;
        anyCat = true;
        out[k] = v * (1 + p / 100);
        if (cat !== "SIM" && k === CAT_KEYS[cat][0]) addedBaht += (v * p) / 100;
      }
    }
    for (const k of TOTAL_KEYS) {
      if (!(k in row) || row[k] === "" || row[k] == null) continue;
      const v = parseTargetNumber(row[k]);
      if (!Number.isFinite(v)) continue;
      out[k] = anyCat ? v + addedBaht : v * (1 + cfg.pct / 100);
    }
    return out as T;
  });
}

const normalize = (raw: unknown): TargetUplift => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));
  const perRaw = (o.perCat && typeof o.perCat === "object" ? o.perCat : {}) as Record<string, unknown>;
  const perCat: TargetUplift["perCat"] = {};
  for (const c of UPLIFT_CATEGORIES) {
    const v = perRaw[c];
    if (v === null || v === undefined || v === "") continue;
    const n = num(v);
    if (Number.isFinite(n)) perCat[c] = n;
  }
  const pct = num(o.pct);
  return { enabled: Boolean(o.enabled), pct: Number.isFinite(pct) ? pct : 0, perCat };
};

const API_URL = "/api/staff-photos?resource=target-uplift";

export const fetchTargetUplift = async (): Promise<TargetUplift> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return { ...EMPTY_TARGET_UPLIFT };
    const json = await res.json();
    return normalize(json?.uplift);
  } catch {
    return { ...EMPTY_TARGET_UPLIFT };
  }
};

export const saveTargetUplift = async (
  cfg: TargetUplift,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uplift: normalize(cfg), updatedBy }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) return { ok: true };
    return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};
