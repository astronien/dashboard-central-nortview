/**
 * โหมดโฟกัส Attach (x1.5 / x2 …) — หัวหน้าร้านเลือกได้ว่าช่วงนี้จะโฟกัส attach ตัวไหน
 * บิลที่แนบตัวนั้น (ภายในช่วงวันที่ตั้งไว้) จะได้เครดิตตามตัวคูณที่ตั้ง (ค่าเริ่มต้น 2) แทน 1
 * → ครอบคลุม iPhone 8 เครื่อง แทน 4 ในกติกา 1:4
 * ส่วนตัวที่ไม่ได้เลือก จะเหลือ 0.5 เครดิต (ครอบคลุม 2 เครื่อง) เพื่อ balance
 *
 * เก็บใน app_config ผ่าน /api/staff-photos?resource=attach-boost
 */

export type AttachBoostType = "cover" | "ufund" | "sim" | "acc";

export type AttachBoost = {
  cover: boolean;
  ufund: boolean;
  sim: boolean;
  acc: boolean;
  /** YYYY-MM-DD เริ่มนับ x2 (ว่าง = ไม่จำกัด) */
  from: string;
  /** YYYY-MM-DD สิ้นสุด (ว่าง = จนกว่าจะปิด) */
  to: string;
  /** ตัวคูณของตัวที่เลือก (เช่น 1.5 หรือ 2) */
  factor: number;
  /** ตัวคูณของตัวที่ไม่ได้เลือก ระหว่างช่วงโฟกัส (ค่าเริ่มต้น 0.5) */
  otherFactor: number;
  /** ตัวคูณรายตัว (เช่น Cover 1.5 · UFUND 2 · SIM 0.5) — 1 = ปกติ
   *  เป็นค่าหลักที่ใช้คำนวณ (factor/otherFactor เก็บไว้เพื่อรองรับค่าที่บันทึกแบบเก่า) */
  perType: Record<AttachBoostType, number>;
};

export const DEFAULT_BOOST_FACTOR = 2;
export const DEFAULT_OTHER_FACTOR = 0.5;
const fx = (n: number) => String(Math.round(n * 100) / 100);

export const ATTACH_BOOST_TYPES: Array<{ key: AttachBoostType; label: string }> = [
  { key: "cover", label: "Cover+" },
  { key: "ufund", label: "UFUND" },
  { key: "sim", label: "SIM" },
  { key: "acc", label: "Acc ≥3 ชิ้น" },
];

export const EMPTY_ATTACH_BOOST: AttachBoost = {
  cover: false,
  ufund: false,
  sim: false,
  acc: false,
  from: "",
  to: "",
  factor: DEFAULT_BOOST_FACTOR,
  otherFactor: DEFAULT_OTHER_FACTOR,
  perType: { cover: 1, ufund: 1, sim: 1, acc: 1 },
};

/** ตัวเลือกตัวคูณที่กดเลือกได้ */
export const BOOST_FACTOR_OPTIONS = [0.5, 1, 1.5, 2];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** เปิดโหมดอยู่ไหม = มีตัวไหนตัวคูณไม่ใช่ 1 */
export const anyBoostOn = (b: AttachBoost) =>
  ATTACH_BOOST_TYPES.some((t) => (b.perType?.[t.key] ?? 1) !== 1);

/** วันนั้นอยู่ในช่วง x2 หรือไม่ */
export const boostInRange = (b: AttachBoost, date: Date | string | null | undefined): boolean => {
  if (!anyBoostOn(b)) return false;
  const day = typeof date === "string" ? date.slice(0, 10) : date instanceof Date && !Number.isNaN(date.getTime()) ? ymd(date) : "";
  if (!day) return !b.from && !b.to;
  if (b.from && day < b.from) return false;
  if (b.to && day > b.to) return false;
  return true;
};

/** ตัวคูณของประเภทนั้นในวันนั้น
 *  - ไม่ได้เปิดโหมด / นอกช่วงวันที่ → 1
 *  - ตัวที่เลือก x2 → 2
 *  - ตัวอื่นที่ไม่ได้เลือก → 0.5 (ถ่วงให้ balance ระหว่างช่วงโฟกัส) */
export const boostMultiplier = (
  b: AttachBoost,
  type: AttachBoostType,
  date: Date | string | null | undefined,
): number => {
  if (!boostInRange(b, date)) return 1;
  return b.perType?.[type] ?? 1;
};

/** แสดงเครดิตแบบอ่านง่าย: 1, 1.5, 0.5 */
export const fmtCredit = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

/** ข้อความสั้นๆ เช่น "Cover+ x1.5 · UFUND x2 · SIM x0.5 (ถึง 10/10)" — "" ถ้าไม่ได้เปิด */
export const boostLabel = (b: AttachBoost): string => {
  if (!anyBoostOn(b)) return "";
  const fmt = (s2: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s2);
    return m ? `${Number(m[3])}/${Number(m[2])}` : s2;
  };
  const range = b.from && b.to ? ` (${fmt(b.from)}–${fmt(b.to)})` : b.to ? ` (ถึง ${fmt(b.to)})` : b.from ? ` (ตั้งแต่ ${fmt(b.from)})` : "";
  const parts = ATTACH_BOOST_TYPES.filter((t) => (b.perType?.[t.key] ?? 1) !== 1).map(
    (t) => `${t.label} x${fx(b.perType[t.key])}`,
  );
  return `${parts.join(" · ")}${range}`;
};

/** คำอธิบาย เช่น "Cover+ = 1.5 เครดิต (iPhone 6 เครื่อง) · SIM = 0.5 (2 เครื่อง) · ที่เหลือ = 1 (4 เครื่อง)" */
export const boostDescription = (b: AttachBoost): string => {
  if (!anyBoostOn(b)) return "ทุกตัว = 1 เครดิต (iPhone 4 เครื่อง)";
  const changed = ATTACH_BOOST_TYPES.filter((t) => (b.perType?.[t.key] ?? 1) !== 1).map((t) => {
    const f = b.perType[t.key];
    return `${t.label} = ${fx(f)} เครดิต (iPhone ${fx(f * 4)} เครื่อง)`;
  });
  const rest = ATTACH_BOOST_TYPES.length - changed.length;
  return `${changed.join(" · ")}${rest > 0 ? " · ที่เหลือ = 1 (4 เครื่อง)" : ""}`;
};

const normalize = (raw: unknown): AttachBoost => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
  return {
    cover: normalizePerType(o).cover !== 1,
    ufund: normalizePerType(o).ufund !== 1,
    sim: normalizePerType(o).sim !== 1,
    acc: normalizePerType(o).acc !== 1,
    from: day(o.from),
    to: day(o.to),
    factor: clampNum(o.factor, 1, 5, DEFAULT_BOOST_FACTOR),
    otherFactor: clampNum(o.otherFactor, 0, 1, DEFAULT_OTHER_FACTOR),
    perType: normalizePerType(o),
  };
};

/** ตัวคูณรายตัว — ถ้าเป็นค่าที่บันทึกแบบเก่า (เปิด/ปิด + factor) แปลงให้ */
function normalizePerType(o: Record<string, unknown>): Record<AttachBoostType, number> {
  const keys: AttachBoostType[] = ["cover", "ufund", "sim", "acc"];
  const pt = o.perType && typeof o.perType === "object" ? (o.perType as Record<string, unknown>) : null;
  if (pt) {
    return Object.fromEntries(keys.map((k) => [k, clampNum(pt[k], 0, 5, 1)])) as Record<AttachBoostType, number>;
  }
  const anyOn = keys.some((k) => Boolean(o[k]));
  const f = clampNum(o.factor, 1, 5, DEFAULT_BOOST_FACTOR);
  const of = clampNum(o.otherFactor, 0, 1, DEFAULT_OTHER_FACTOR);
  return Object.fromEntries(keys.map((k) => [k, !anyOn ? 1 : o[k] ? f : of])) as Record<AttachBoostType, number>;
}

function clampNum(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

const API_URL = "/api/staff-photos?resource=attach-boost";

export const fetchAttachBoost = async (): Promise<AttachBoost> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return { ...EMPTY_ATTACH_BOOST };
    const json = await res.json();
    return normalize(json?.boost);
  } catch {
    return { ...EMPTY_ATTACH_BOOST };
  }
};

export const saveAttachBoost = async (
  boost: AttachBoost,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boost: normalize(boost), updatedBy }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) return { ok: true };
    return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};
