/**
 * โหมด x2 (Attach Boost) — หัวหน้าร้านเลือกได้ว่าช่วงนี้จะโฟกัส attach ตัวไหน
 * บิลที่แนบตัวนั้น (ภายในช่วงวันที่ตั้งไว้) จะได้ 2 เครดิต แทน 1
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
};

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
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const anyBoostOn = (b: AttachBoost) => b.cover || b.ufund || b.sim || b.acc;

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
  return b[type] ? 2 : 0.5;
};

/** แสดงเครดิตแบบอ่านง่าย: 1, 1.5, 0.5 */
export const fmtCredit = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

/** ข้อความสั้นๆ เช่น "x2: Cover+, SIM (ถึง 10/10)" — "" ถ้าไม่ได้เปิด */
export const boostLabel = (b: AttachBoost): string => {
  if (!anyBoostOn(b)) return "";
  const names = ATTACH_BOOST_TYPES.filter((t) => b[t.key]).map((t) => t.label);
  const fmt = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? `${Number(m[3])}/${Number(m[2])}` : s;
  };
  const range = b.from && b.to ? ` (${fmt(b.from)}–${fmt(b.to)})` : b.to ? ` (ถึง ${fmt(b.to)})` : b.from ? ` (ตั้งแต่ ${fmt(b.from)})` : "";
  const allOn = ATTACH_BOOST_TYPES.every((t) => b[t.key]);
  return `x2: ${names.join(", ")}${allOn ? "" : " · อื่นๆ x0.5"}${range}`;
};

const normalize = (raw: unknown): AttachBoost => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
  return {
    cover: Boolean(o.cover),
    ufund: Boolean(o.ufund),
    sim: Boolean(o.sim),
    acc: Boolean(o.acc),
    from: day(o.from),
    to: day(o.to),
  };
};

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
