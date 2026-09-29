/**
 * Studio7 Commission Scheme (Effective 1 Oct 23)
 *
 * มี 5 ช่วงตามขนาด Target (MB = ล้านบาท):
 *   1-5 MB (PIA Pool) · >5-10 MB · >10-20 MB · >20-30 MB · >30 MB (PIA Individual)
 *
 * แต่ละช่วงมี 4 ขั้น % achievement และอัตราแยกตามหมวด:
 *   APPLE CPU · APPLE iPad · iPOD (fix rate) · Apple iPhone · ABA · BTB (3rd Party) · Apple Watch
 *
 * คอลัมน์ "New Scheme 0.03%" = อัตราใหม่เฉพาะ iPad และ iPhone (ใช้แทนอัตราเดิม)
 *
 * การแมปหมวดกับแดชบอร์ด:
 *   APPLE CPU → Mac · APPLE iPad → iPad · Apple iPhone → iPhone
 *   Apple Watch → Apple Watch · ABA → BTB(Apple) · BTB (3rd Party) → BTB
 */

export type CommissionCategory =
  | "Mac"
  | "iPad"
  | "iPhone"
  | "iPod"
  | "Apple Watch"
  | "BTB(Apple)"
  | "BTB";

/** ชื่อที่ใช้แสดงตามเอกสาร scheme */
export const SCHEME_LABEL: Record<CommissionCategory, string> = {
  Mac: "APPLE CPU",
  iPad: "APPLE iPad",
  iPod: "iPOD",
  iPhone: "Apple iPhone",
  "BTB(Apple)": "ABA",
  BTB: "BTB (3rd Party)",
  "Apple Watch": "Apple Watch",
};

/** หมวดที่แดชบอร์ดมีข้อมูล (iPod ไม่มีในไฟล์ขาย จึงไม่แสดง) */
export const COMMISSION_CATEGORIES: CommissionCategory[] = [
  "Mac",
  "iPad",
  "iPhone",
  "Apple Watch",
  "BTB(Apple)",
  "BTB",
];

export type CommissionTier = { min: number; label: string };

export const COMMISSION_TIERS: CommissionTier[] = [
  { min: 105, label: "105% Up" },
  { min: 98, label: "98–104.99%" },
  { min: 90, label: "90–97.99%" },
  { min: 70, label: "70–89.99%" },
];

export type SchemeBand = {
  id: string;
  label: string;
  /** ช่วง target (ล้านบาท) — max = null คือไม่จำกัด */
  minMB: number;
  maxMB: number | null;
  pool: boolean;
  /** อัตรา (%) เรียงตาม COMMISSION_TIERS */
  rates: Record<CommissionCategory, number[]>;
  /** New Scheme 0.03% — อัตราใหม่เฉพาะ iPad / iPhone */
  newScheme: { iPad: number[]; iPhone: number[] };
};

export const SCHEME_BANDS: SchemeBand[] = [
  {
    id: "1-5",
    label: "Target 1–5 MB (PIA Pool)",
    minMB: 0,
    maxMB: 5,
    pool: true,
    rates: {
      Mac: [1.1, 1.05, 0.75, 0.55],
      iPad: [1.03, 0.9, 0.65, 0.45],
      iPod: [0.8, 0.8, 0.8, 0.8],
      iPhone: [0.75, 0.65, 0.55, 0.4],
      "BTB(Apple)": [2.1, 1.9, 1.6, 1.3],
      BTB: [3.3, 3.0, 2.65, 2.3],
      "Apple Watch": [0.85, 0.75, 0.65, 0.4],
    },
    newScheme: { iPad: [1.0, 0.87, 0.62, 0.42], iPhone: [0.72, 0.62, 0.52, 0.37] },
  },
  {
    id: "5-10",
    label: "Target >5–10 MB (PIA Individual)",
    minMB: 5,
    maxMB: 10,
    pool: false,
    rates: {
      Mac: [1.08, 1.03, 0.73, 0.53],
      iPad: [1.0, 0.87, 0.63, 0.43],
      iPod: [0.75, 0.75, 0.75, 0.75],
      iPhone: [0.65, 0.5, 0.4, 0.3],
      "BTB(Apple)": [1.85, 1.55, 1.3, 1.0],
      BTB: [3.27, 2.95, 2.6, 2.3],
      "Apple Watch": [0.8, 0.7, 0.6, 0.35],
    },
    newScheme: { iPad: [0.97, 0.85, 0.6, 0.4], iPhone: [0.62, 0.47, 0.37, 0.27] },
  },
  {
    id: "10-20",
    label: "Target >10–20 MB (PIA Individual)",
    minMB: 10,
    maxMB: 20,
    pool: false,
    rates: {
      Mac: [1.05, 1.0, 0.7, 0.5],
      iPad: [0.98, 0.83, 0.6, 0.4],
      iPod: [0.7, 0.7, 0.7, 0.7],
      iPhone: [0.62, 0.5, 0.4, 0.25],
      "BTB(Apple)": [1.63, 1.42, 1.1, 0.86],
      BTB: [3.23, 2.9, 2.55, 2.2],
      "Apple Watch": [0.75, 0.65, 0.55, 0.3],
    },
    newScheme: { iPad: [0.95, 0.8, 0.57, 0.37], iPhone: [0.59, 0.47, 0.37, 0.22] },
  },
  {
    id: "20-30",
    label: "Target >20–30 MB (PIA Individual)",
    minMB: 20,
    maxMB: 30,
    pool: false,
    rates: {
      Mac: [1.03, 0.95, 0.68, 0.5],
      iPad: [0.95, 0.8, 0.58, 0.4],
      iPod: [0.65, 0.65, 0.65, 0.65],
      iPhone: [0.6, 0.45, 0.35, 0.25],
      "BTB(Apple)": [1.61, 1.35, 1.05, 0.85],
      BTB: [3.2, 2.85, 2.5, 2.13],
      "Apple Watch": [0.7, 0.6, 0.5, 0.25],
    },
    newScheme: { iPad: [0.92, 0.77, 0.55, 0.37], iPhone: [0.57, 0.42, 0.32, 0.22] },
  },
  {
    id: "30+",
    label: "Target >30 MB (PIA Individual)",
    minMB: 30,
    maxMB: null,
    pool: false,
    rates: {
      Mac: [1.01, 0.9, 0.66, 0.5],
      iPad: [0.92, 0.77, 0.56, 0.4],
      iPod: [0.6, 0.6, 0.6, 0.6],
      iPhone: [0.58, 0.41, 0.31, 0.25],
      "BTB(Apple)": [1.59, 1.28, 1.0, 0.84],
      BTB: [3.17, 2.8, 2.45, 2.06],
      "Apple Watch": [0.65, 0.55, 0.45, 0.21],
    },
    newScheme: { iPad: [0.89, 0.74, 0.53, 0.37], iPhone: [0.55, 0.38, 0.28, 0.22] },
  },
];

/** เลือกช่วง scheme จากขนาด target (บาท) */
export function findBandByTarget(targetBaht: number): SchemeBand {
  const mb = targetBaht / 1_000_000;
  for (const b of SCHEME_BANDS) {
    if (mb > b.minMB && (b.maxMB === null || mb <= b.maxMB)) return b;
  }
  return SCHEME_BANDS[0];
}

export function findBandById(id: string): SchemeBand | undefined {
  return SCHEME_BANDS.find((b) => b.id === id);
}

/** หาขั้นจาก % achievement — คืน -1 ถ้าต่ำกว่า 70% (ไม่ได้ค่าคอม) */
export function findTierIndex(achPercent: number): number {
  for (let i = 0; i < COMMISSION_TIERS.length; i++) {
    if (achPercent >= COMMISSION_TIERS[i].min) return i;
  }
  return -1;
}

/** อัตราของหมวดในช่วงที่เลือก (รองรับ New Scheme สำหรับ iPad/iPhone) */
export function getRate(
  band: SchemeBand,
  category: CommissionCategory,
  tierIndex: number,
  useNewScheme: boolean,
): number {
  if (tierIndex < 0) return 0;
  if (useNewScheme && category === "iPad") return band.newScheme.iPad[tierIndex] ?? 0;
  if (useNewScheme && category === "iPhone") return band.newScheme.iPhone[tierIndex] ?? 0;
  return band.rates[category]?.[tierIndex] ?? 0;
}

export type CommissionCategoryRow = {
  category: CommissionCategory;
  actual: number;
  target: number;
  achPercent: number;
  tierIndex: number;
  tierLabel: string;
  ratePct: number;
  commission: number;
};

export type CommissionStaffRow = {
  name: string;
  staffId?: string;
  branch?: string;
  categories: CommissionCategoryRow[];
  totalActual: number;
  totalTarget: number;
  totalCommission: number;
};

export function calcCategoryCommission(
  band: SchemeBand,
  category: CommissionCategory,
  actual: number,
  target: number,
  useNewScheme: boolean,
): CommissionCategoryRow {
  const achPercent = target > 0 ? (actual / target) * 100 : 0;
  const tierIndex = findTierIndex(achPercent);
  const ratePct = getRate(band, category, tierIndex, useNewScheme);
  return {
    category,
    actual,
    target,
    achPercent,
    tierIndex,
    tierLabel: tierIndex >= 0 ? COMMISSION_TIERS[tierIndex].label : "ต่ำกว่า 70%",
    ratePct,
    commission: (actual * ratePct) / 100,
  };
}

// ─── การแบ่งก้อนค่าคอม: เซล (PIA) vs หลังบ้าน ────────────────────────────
//
// หลักการ: คิดค่าคอมรวมได้ "1 ก้อน" (ผลรวมค่าคอมของเซลทุกคนตาม scheme)
// จากนั้นหักส่วนของหลังบ้านออกจากก้อนใหญ่ตาม % ของแต่ละตำแหน่ง
// ที่เหลือจึงแบ่งให้เซลตามสัดส่วนค่าคอมของแต่ละคน

/** % ที่หลังบ้านได้จากก้อนใหญ่ (ต่อคน ต่อตำแหน่ง) */
export const BACK_OFFICE_RATES: Record<string, number> = {
  BSM: 10,
  ABM: 8,
  TRAINER: 6,
  PRESENTER: 5.5,
  PIS: 4.5,
  CASHIER: 2.25,
};

/** แปลงชื่อตำแหน่งให้เป็นคีย์มาตรฐาน (รองรับสะกดต่างกัน/ภาษาไทย) */
export function normalizePosition(raw: string): string {
  const p = String(raw ?? "").trim().toUpperCase().replace(/[\s._-]+/g, "");
  if (!p) return "";
  if (p.startsWith("BSM")) return "BSM";
  if (p.startsWith("ABM")) return "ABM";
  if (p.startsWith("TRAIN")) return "TRAINER";
  if (p.startsWith("PRESENT")) return "PRESENTER";
  if (p === "PIS") return "PIS";
  if (p.startsWith("CASH") || p.startsWith("CASHE") || p.includes("แคชเชียร")) return "CASHIER";
  if (p.startsWith("PIA")) return "PIA";
  return p;
}

export type BackOfficeRow = {
  position: string;
  /** จำนวนคนในตำแหน่งนี้ */
  count: number;
  /** % ต่อคน */
  ratePct: number;
  /** % รวมของตำแหน่งนี้ (ratePct × count) */
  totalPct: number;
  amount: number;
};

export type CommissionSplit = {
  /** ก้อนใหญ่ = ผลรวมค่าคอมของเซลทุกคนตาม scheme */
  grossPool: number;
  backOffice: BackOfficeRow[];
  /** % รวมที่หลังบ้านได้ */
  backOfficePct: number;
  backOfficeAmount: number;
  /** ก้อนที่เหลือสำหรับเซล */
  salesPool: number;
};

/** ลำดับตำแหน่งหลังบ้านที่ใช้แสดง/กรอกจำนวน */
export const BACK_OFFICE_POSITIONS = [
  "BSM",
  "ABM",
  "TRAINER",
  "PRESENTER",
  "PIS",
  "CASHIER",
] as const;

export type BackOfficeCounts = Record<string, number>;

export const EMPTY_BACK_OFFICE_COUNTS: BackOfficeCounts = {
  BSM: 0,
  ABM: 0,
  TRAINER: 0,
  PRESENTER: 0,
  PIS: 0,
  CASHIER: 0,
};

/**
 * แบ่งก้อนค่าคอมจาก "จำนวนคน" ของแต่ละตำแหน่งหลังบ้าน
 *   % ของตำแหน่ง = อัตราต่อคน × จำนวนคน
 * หักออกจากก้อนใหญ่ก่อน ที่เหลือเป็นของเซล
 * ถ้า % รวมเกิน 100 จะลดตามสัดส่วนไม่ให้ก้อนเซลติดลบ
 */
export function calcCommissionSplit(
  grossPool: number,
  counts: BackOfficeCounts,
  /** อัตราที่ปรับเองจากหน้า Settings — ไม่ระบุจะใช้ค่าเริ่มต้น */
  rates?: Record<string, number>,
): CommissionSplit {
  const backOffice: BackOfficeRow[] = BACK_OFFICE_POSITIONS.map((pos) => {
    const count = Math.max(0, Math.floor(Number(counts?.[pos] ?? 0)));
    const override = rates?.[pos];
    const ratePct =
      typeof override === "number" && Number.isFinite(override) && override >= 0
        ? override
        : BACK_OFFICE_RATES[pos] ?? 0;
    return { position: pos, count, ratePct, totalPct: ratePct * count, amount: 0 };
  }).filter((r) => r.count > 0 && r.ratePct > 0);

  const rawPct = backOffice.reduce((s, r) => s + r.totalPct, 0);
  const backOfficePct = Math.min(100, rawPct);
  const scale = rawPct > 100 ? 100 / rawPct : 1;
  backOffice.forEach((r) => {
    r.amount = (grossPool * r.totalPct * scale) / 100;
  });

  const backOfficeAmount = backOffice.reduce((s, r) => s + r.amount, 0);
  return {
    grossPool,
    backOffice,
    backOfficePct,
    backOfficeAmount,
    salesPool: Math.max(0, grossPool - backOfficeAmount),
  };
}
