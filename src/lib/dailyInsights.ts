/**
 * วิเคราะห์ยอดขายรายวัน: ต้องทำวันละเท่าไร, คาดจบเดือนแบบถ่วงวันในสัปดาห์,
 * เป้ารายวันถ่วงตามวัน, วันถึงเป้า, ยอดพึ่งไม่กี่วัน, ยอดต่อบิล,
 * เทียบเดือนก่อนแบบวันตรงวัน, ผลช่วงเงินเดือนออก/โหมด x2, วันผิดปกติ
 */
import type { DailySales, DailySalesDay } from "./dailySales";

export type DailyInsights = {
  /** วันล่าสุดในข้อมูลคือวันนี้ (ยังขายไม่จบวัน) → ไม่นับในค่าเฉลี่ย */
  partialDay: string | null;
  completeDays: number;
  /** เฉลี่ยต่อวัน (เฉพาะวันที่ขายจบแล้ว) */
  avgComplete: number;
  /** น้ำหนักวันในสัปดาห์ (index = dow) — 1 = เท่าค่าเฉลี่ย */
  dowWeight: number[];
  actualMtd: number;
  target: number;
  remainingDays: number;
  /** ต้องทำวันละเท่าไร (เฉลี่ยแบบเท่ากันทุกวัน) */
  requiredPerDay: number;
  /** คาดยอดจบเดือน (ถ่วงตามวันในสัปดาห์ที่เหลือ) */
  forecast: number;
  forecastPct: number;
  /** เป้ารายวันถ่วงตามวัน (ymd → บาท) ทั้งเดือน */
  dayTarget: Record<string, number>;
  /** เป้าของวันนี้ (ถ่วงวัน) จากยอดที่เหลือ */
  todayTarget: number;
  /** ตัวคูณของวันนี้เทียบค่าเฉลี่ยวันที่เหลือ (ใช้กับเป้ารายคน) */
  todayFactor: number;
  hitDays: number;
  /** 3 วันดีสุดคิดเป็นกี่ % ของยอดเดือน */
  top3Share: number;
  avgTicket: number;
  /** เทียบเดือนก่อนตามวันในสัปดาห์ (%) — null = ไม่มีข้อมูล */
  momByDow: Array<number | null>;
  momAvg: number | null;
  /** ช่วงเงินเดือนออก (25–5) เทียบวันอื่น (%) */
  paydayLift: number | null;
  /** ช่วงโหมด x2 เทียบนอกช่วง (%) */
  boostLift: number | null;
  /** วันที่ต่ำผิดปกติ (ต่ำกว่าที่ควรเป็นของวันนั้นเกิน 40%) */
  anomalies: Array<{ ymd: string; dow: number; baht: number; expected: number; dropPct: number }>;
};

const ymdOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function buildDailyInsights(params: {
  current: DailySales;
  lastMonth?: DailySales;
  target: number;
  totalDays: number;
  /** วันนี้ตามเวลาไทย YYYY-MM-DD */
  todayYmd: string;
  boost?: { from?: string; to?: string } | null;
}): DailyInsights | null {
  const { current, lastMonth, target, todayYmd, boost } = params;
  const days = current.days;
  if (!days.length) return null;

  const latest = days[days.length - 1];
  const partialDay = latest.ymd >= todayYmd ? latest.ymd : null;
  const complete: DailySalesDay[] = partialDay ? days.slice(0, -1) : days;
  const avgComplete = avg(complete.map((d) => d.baht)) || avg(days.map((d) => d.baht));

  // น้ำหนักวันในสัปดาห์: ใช้เดือนนี้ (วันที่จบแล้ว) + เดือนก่อน ให้มีตัวอย่างพอ
  const pool: DailySalesDay[] = [...complete, ...(lastMonth?.days ?? [])];
  const poolAvg = avg(pool.map((d) => d.baht)) || 1;
  const dowWeight = Array.from({ length: 7 }, (_, dow) => {
    const xs = pool.filter((d) => d.dow === dow).map((d) => d.baht);
    if (!xs.length) return 1;
    // ตัวอย่างน้อย → ดึงเข้าหา 1 (กันแกว่ง)
    const raw = avg(xs) / poolAvg;
    const k = Math.min(1, xs.length / 4);
    return 1 + (raw - 1) * k;
  });

  // ทุกวันของเดือน
  const first = dateOf(days[0].ymd);
  const y = first.getFullYear();
  const mo = first.getMonth();
  const monthDays = new Date(y, mo + 1, 0).getDate();
  const allDays = Array.from({ length: monthDays }, (_, i) => new Date(y, mo, i + 1));
  const wSum = allDays.reduce((s, d) => s + dowWeight[d.getDay()], 0) || monthDays;
  const dayTarget: Record<string, number> = {};
  for (const d of allDays) dayTarget[ymdOf(d)] = target > 0 ? (target * dowWeight[d.getDay()]) / wSum : 0;

  const actualMtd = days.reduce((s, d) => s + d.baht, 0);
  // วันที่เหลือ = วันนี้ (ถ้ายังขายไม่จบ) + วันหลังข้อมูลล่าสุดจนสิ้นเดือน
  const after = allDays.filter((d) => ymdOf(d) > latest.ymd);
  const remaining = [...(partialDay ? [dateOf(partialDay)] : []), ...after];
  const remainingDays = remaining.length;
  const requiredPerDay = remainingDays > 0 ? Math.max(0, target - actualMtd) / remainingDays : 0;

  // คาดจบเดือน: ยอดสะสม + วันที่เหลือ × (ค่าเฉลี่ย × น้ำหนักวัน)
  let forecast = actualMtd;
  for (const d of after) forecast += avgComplete * dowWeight[d.getDay()];
  if (partialDay) forecast += Math.max(0, avgComplete * dowWeight[latest.dow] - latest.baht);
  const forecastPct = target > 0 ? (forecast / target) * 100 : 0;

  // เป้าวันนี้ถ่วงวัน: ยอดที่ยังขาด แบ่งตามน้ำหนักของวันที่เหลือ
  const remW = remaining.reduce((s, d) => s + dowWeight[d.getDay()], 0) || 1;
  const todayDow = dateOf(todayYmd).getDay();
  const todayFactor = remaining.length ? (dowWeight[todayDow] * remaining.length) / remW : 1;
  const todayTarget = requiredPerDay * todayFactor;

  const hitDays = complete.filter((d) => d.baht >= (dayTarget[d.ymd] ?? Infinity)).length;
  const top3 = [...days].sort((a, b) => b.baht - a.baht).slice(0, 3).reduce((s, d) => s + d.baht, 0);
  const top3Share = actualMtd > 0 ? (top3 / actualMtd) * 100 : 0;
  const bills = complete.reduce((s, d) => s + d.bills, 0);
  const avgTicket = bills > 0 ? complete.reduce((s, d) => s + d.baht, 0) / bills : 0;

  // เดือนก่อน วันตรงวัน
  const momByDow = Array.from({ length: 7 }, (_, dow) => {
    const a = complete.filter((d) => d.dow === dow).map((d) => d.baht);
    const b = (lastMonth?.days ?? []).filter((d) => d.dow === dow).map((d) => d.baht);
    if (!a.length || !b.length) return null;
    const bb = avg(b);
    return bb > 0 ? (avg(a) / bb) * 100 - 100 : null;
  });
  const lmAvg = lastMonth?.days.length ? avg(lastMonth.days.map((d) => d.baht)) : 0;
  const momAvg = lmAvg > 0 ? (avgComplete / lmAvg) * 100 - 100 : null;

  // เทียบแบบตัดผลวันในสัปดาห์: ค่าจริง ÷ น้ำหนักวันนั้น
  const norm = (d: DailySalesDay) => d.baht / (dowWeight[d.dow] || 1);
  const lift = (inSet: DailySalesDay[], outSet: DailySalesDay[]) => {
    if (inSet.length < 2 || outSet.length < 2) return null;
    const o = avg(outSet.map(norm));
    return o > 0 ? (avg(inSet.map(norm)) / o) * 100 - 100 : null;
  };
  const isPayday = (d: DailySalesDay) => {
    const day = Number(d.ymd.slice(8));
    return day >= 25 || day <= 5;
  };
  const paydayLift = lift(complete.filter(isPayday), complete.filter((d) => !isPayday(d)));
  const inBoost = (d: DailySalesDay) =>
    Boolean(boost?.from && boost?.to && d.ymd >= boost.from && d.ymd <= boost.to);
  const boostLift = boost?.from && boost?.to ? lift(complete.filter(inBoost), complete.filter((d) => !inBoost(d))) : null;

  // วันผิดปกติ: ต่ำกว่าที่ควรเป็น (ค่าเฉลี่ย × น้ำหนักวันนั้น) เกิน 40%
  const anomalies = complete
    .map((d) => {
      const expected = avgComplete * dowWeight[d.dow];
      return { ymd: d.ymd, dow: d.dow, baht: d.baht, expected, dropPct: expected > 0 ? 100 - (d.baht / expected) * 100 : 0 };
    })
    .filter((x) => x.dropPct >= 40);

  return {
    partialDay,
    completeDays: complete.length,
    avgComplete,
    dowWeight,
    actualMtd,
    target,
    remainingDays,
    requiredPerDay,
    forecast,
    forecastPct,
    dayTarget,
    todayTarget,
    todayFactor,
    hitDays,
    top3Share,
    avgTicket,
    momByDow,
    momAvg,
    paydayLift,
    boostLift,
    anomalies,
  };
}
