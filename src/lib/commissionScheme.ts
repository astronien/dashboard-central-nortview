/**
 * ตาราง Scheme (PIA Individual) — อัตราค่าคอมมิชชั่นตาม "ขั้น % achievement"
 * ของแต่ละหมวด ค่าคอม = ยอดขายจริงของหมวดนั้น × อัตราของขั้นที่ทำได้
 *
 *   % ach step   Mac    iPad   iPhone  iPod   Apple Watch  BTB(Apple)  BTB(3rd)
 *   105% Up      0.69   0.64   0.42    0.48   0.51         1.18        2.09
 *   98–104.99    0.66   0.56   0.32    0.48   0.45         0.99        1.89
 *   90–97.99     0.47   0.40   0.26    0.48   0.38         0.83        1.66
 *   70–89.99     0.34   0.28   0.19    0.48   0.22         0.64        1.47
 *   ต่ำกว่า 70%   ไม่ได้ค่าคอม (0)
 *
 * หมายเหตุ: หมวด "BTB" ในแดชบอร์ด = BTB(3rd Party) ในตาราง Scheme
 */

export type CommissionTier = {
  /** ขั้นต่ำของ % achievement ที่เข้าขั้นนี้ */
  min: number;
  label: string;
};

export const COMMISSION_TIERS: CommissionTier[] = [
  { min: 105, label: "105% Up" },
  { min: 98, label: "98–104.99%" },
  { min: 90, label: "90–97.99%" },
  { min: 70, label: "70–89.99%" },
];

/** อัตรา (%) เรียงตามลำดับขั้นใน COMMISSION_TIERS */
export const COMMISSION_RATES: Record<string, number[]> = {
  Mac: [0.69, 0.66, 0.47, 0.34],
  iPad: [0.64, 0.56, 0.4, 0.28],
  iPhone: [0.42, 0.32, 0.26, 0.19],
  iPod: [0.48, 0.48, 0.48, 0.48],
  "Apple Watch": [0.51, 0.45, 0.38, 0.22],
  "BTB(Apple)": [1.18, 0.99, 0.83, 0.64],
  // ในแดชบอร์ดหมวดนี้ชื่อ "BTB" (= BTB 3rd Party)
  BTB: [2.09, 1.89, 1.66, 1.47],
};

/** หมวดที่คิดค่าคอมได้ (ตามตาราง Scheme) */
export const COMMISSION_CATEGORIES = [
  "Mac",
  "iPad",
  "iPhone",
  "Apple Watch",
  "BTB(Apple)",
  "BTB",
] as const;

export type CommissionCategoryRow = {
  category: string;
  actual: number;
  target: number;
  achPercent: number;
  /** index ของขั้นที่เข้า (-1 = ต่ำกว่า 70% ไม่ได้ค่าคอม) */
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
  totalCommission: number;
};

/** หาขั้นจาก % achievement — คืน -1 ถ้าต่ำกว่าขั้นต่ำสุด */
export function findTierIndex(achPercent: number): number {
  for (let i = 0; i < COMMISSION_TIERS.length; i++) {
    if (achPercent >= COMMISSION_TIERS[i].min) return i;
  }
  return -1;
}

/** คิดค่าคอมของหมวดเดียว */
export function calcCategoryCommission(
  category: string,
  actual: number,
  target: number,
): CommissionCategoryRow {
  const achPercent = target > 0 ? (actual / target) * 100 : 0;
  const tierIndex = findTierIndex(achPercent);
  const rates = COMMISSION_RATES[category];
  const ratePct = tierIndex >= 0 && rates ? rates[tierIndex] : 0;
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
