/**
 * วิเคราะห์จากคลังรายเดือน: สรุปเดือนเป็นประโยค, คาดยอดเดือนถัดไป,
 * อันดับรายเดือน, ส่วนแบ่งรายคน (ไว้แบ่งเป้า)
 */
import type { ArchiveMonthMeta } from "./salesArchive";
import { monthLabelTh, shiftMonth } from "./salesArchive";
import { matchesOfficer } from "./matchHelpers";

export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
export const fmtM = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `฿${Math.round(n / 1000)}K` : `฿${Math.round(n)}`;
const pctTxt = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}%`;

/** หาคีย์ชื่อใน byStaff ที่ตรงกับคนนี้ */
export const staffKeyIn = (rec: Record<string, unknown>, name: string) =>
  rec[name] !== undefined ? name : Object.keys(rec).find((k) => matchesOfficer(k, name));

export function completeMonths(months: ArchiveMonthMeta[], currentMonth?: string) {
  return months.filter((m) => m.rowCount > 0 && m.summary && m.month !== currentMonth).sort((a, b) => a.month.localeCompare(b.month));
}

// ── 1. สรุปเดือนเป็นประโยค ─────────────────────────────────────────────
export type MonthStory = {
  month: string;
  prevMonth: string | null;
  total: number;
  change: number | null;
  catUp: Array<{ cat: string; pct: number }>;
  catDown: { cat: string; pct: number } | null;
  topGrower: { name: string; diff: number } | null;
  topDecliner: { name: string; diff: number } | null;
  bestStaff: { name: string; baht: number } | null;
};

export function buildMonthStory(done: ArchiveMonthMeta[]): MonthStory | null {
  const L = done[done.length - 1];
  if (!L?.summary) return null;
  const P = done.length > 1 ? done[done.length - 2] : null;
  const ls = L.summary;
  const ps = P?.summary ?? null;
  const change = ps && ps.totalBaht > 0 ? (ls.totalBaht / ps.totalBaht) * 100 - 100 : null;
  const catChanges = ps
    ? Object.keys({ ...ls.byCategory, ...ps.byCategory })
        .filter((c) => (ps.byCategory[c] ?? 0) >= ps.totalBaht * 0.03 && c !== "อื่นๆ")
        .map((c) => ({ cat: c, pct: ((ls.byCategory[c] ?? 0) / (ps.byCategory[c] || 1)) * 100 - 100 }))
    : [];
  const catUp = catChanges.filter((x) => x.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 2);
  const down = catChanges.filter((x) => x.pct < 0).sort((a, b) => a.pct - b.pct)[0] ?? null;
  const staffDiffs = ps
    ? Object.entries(ls.byStaff).map(([n, v]) => {
        const k = staffKeyIn(ps.byStaff, n);
        return { name: n, diff: v.baht - (k ? ps.byStaff[k].baht : 0) };
      })
    : [];
  const grower = [...staffDiffs].sort((a, b) => b.diff - a.diff)[0];
  const decliner = [...staffDiffs].sort((a, b) => a.diff - b.diff)[0];
  const best = Object.entries(ls.byStaff).sort((a, b) => b[1].baht - a[1].baht)[0];
  return {
    month: L.month,
    prevMonth: P?.month ?? null,
    total: ls.totalBaht,
    change,
    catUp,
    catDown: down,
    topGrower: grower && grower.diff > 0 ? grower : null,
    topDecliner: decliner && decliner.diff < 0 ? decliner : null,
    bestStaff: best ? { name: best[0], baht: best[1].baht } : null,
  };
}

export function storySentence(s: MonthStory, attNote?: string | null): string {
  const parts = [`${monthLabelTh(s.month)} ขายได้ ${fmtM(s.total)}${s.change != null ? ` (${pctTxt(s.change)} จาก ${monthLabelTh(s.prevMonth!)})` : ""}`];
  if (s.catUp.length) parts.push(`${s.change != null && s.change >= 0 ? "โตเพราะ" : "หมวดที่โต:"} ${s.catUp.map((c) => `${c.cat} ${pctTxt(c.pct)}`).join(" และ ")}`);
  if (s.catDown) parts.push(`${s.catDown.cat} ลดลง ${Math.abs(Math.round(s.catDown.pct))}%`);
  if (attNote) parts.push(attNote);
  if (s.bestStaff) parts.push(`ยอดสูงสุด: ${s.bestStaff.name.split(" ")[0]} ${fmtM(s.bestStaff.baht)}`);
  if (s.topGrower) parts.push(`โตมากสุด: ${s.topGrower.name.split(" ")[0]} (+${fmtM(s.topGrower.diff)})`);
  if (s.topDecliner) parts.push(`ลดลงมากสุด: ${s.topDecliner.name.split(" ")[0]} (−${fmtM(-s.topDecliner.diff)})`);
  return parts.join(" · ");
}

// ── 2. คาดยอดเดือนถัดไป ──────────────────────────────────────────────
export type Forecast = {
  month: string;
  mid: number;
  low: number;
  high: number;
  basis: string[];
};

export function forecastNextMonth(done: ArchiveMonthMeta[], allMonths: ArchiveMonthMeta[]): Forecast | null {
  if (done.length < 2) return null;
  const last = done.slice(-6);
  const perDay = last.map((m) => m.summary!.totalBaht / Math.max(1, m.summary!.dayCount || daysInMonth(m.month)));
  const target = shiftMonth(done[done.length - 1].month, 1);
  const basis: string[] = [];

  // ฐาน: เฉลี่ยถ่วงน้ำหนัก 3 เดือนล่าสุด (3:2:1)
  const recent = perDay.slice(-3);
  const base = recent.reduce((s, v, i) => s + v * (i + 1), 0) / recent.reduce((s, _v, i) => s + i + 1, 0);
  basis.push(`เฉลี่ยถ่วงน้ำหนัก ${recent.length} เดือนล่าสุด`);

  // แนวโน้ม: ความชันเชิงเส้น (จำกัด ±10% ต่อเดือน)
  let trend = 1;
  if (perDay.length >= 3) {
    const n = perDay.length;
    const xs = perDay.map((_, i) => i);
    const mx = avg(xs);
    const my = avg(perDay);
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (perDay[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    trend = clamp(1 + slope / (my || 1), 0.9, 1.1);
    if (Math.abs(trend - 1) >= 0.01) basis.push(`แนวโน้ม ${pctTxt((trend - 1) * 100)}/เดือน (${n} เดือน)`);
  }

  // ฤดูกาล: เดือนเดียวกันปีก่อน เทียบ 3 เดือนก่อนหน้านั้น
  let season = 1;
  const ly = allMonths.find((m) => m.month === shiftMonth(target, -12) && m.summary);
  const lyPrev = [1, 2, 3]
    .map((k) => allMonths.find((m) => m.month === shiftMonth(target, -12 - k) && m.summary))
    .filter(Boolean) as ArchiveMonthMeta[];
  if (ly && lyPrev.length >= 2) {
    const pd = (m: ArchiveMonthMeta) => m.summary!.totalBaht / Math.max(1, m.summary!.dayCount || daysInMonth(m.month));
    season = clamp(pd(ly) / (avg(lyPrev.map(pd)) || 1), 0.7, 1.5);
    basis.push(`ฤดูกาลจากปีก่อน ${pctTxt((season - 1) * 100)}`);
  }

  const mid = base * trend * season * daysInMonth(target);
  // ช่วง: ความแกว่งของการเปลี่ยนแปลงรายเดือน (อย่างน้อย ±8%)
  const changes = perDay.slice(1).map((v, i) => v / perDay[i] - 1);
  const sd = changes.length >= 2 ? Math.sqrt(avg(changes.map((c) => (c - avg(changes)) ** 2))) : 0.12;
  const band = clamp(sd, 0.08, 0.3);
  return { month: target, mid, low: mid * (1 - band), high: mid * (1 + band), basis };
}

/** ส่วนแบ่งยอดรายคน (3 เดือนล่าสุด) — ใช้แบ่งเป้า */
export function staffShares(done: ArchiveMonthMeta[], staffOrder: string[], lastN = 3): Array<{ name: string; share: number }> {
  const recent = done.slice(-lastN);
  const totals = staffOrder.map((n) => ({
    name: n,
    baht: recent.reduce((s, m) => {
      const k = staffKeyIn(m.summary!.byStaff, n);
      return s + (k ? m.summary!.byStaff[k].baht : 0);
    }, 0),
  }));
  const sum = totals.reduce((s, x) => s + x.baht, 0) || 1;
  return totals.filter((x) => x.baht > 0).map((x) => ({ name: x.name, share: x.baht / sum }));
}

// ── 5. อันดับรายเดือน ───────────────────────────────────────────────
export function monthlyRanks(months: ArchiveMonthMeta[], people: string[]): Record<string, Record<string, number | null>> {
  const out: Record<string, Record<string, number | null>> = {};
  for (const m of months) {
    const ranked = Object.entries(m.summary!.byStaff)
      .filter(([, v]) => v.baht > 0)
      .sort((a, b) => b[1].baht - a[1].baht)
      .map(([k]) => k);
    out[m.month] = {};
    for (const p of people) {
      const k = staffKeyIn(m.summary!.byStaff, p);
      const i = k ? ranked.indexOf(k) : -1;
      out[m.month][p] = i >= 0 ? i + 1 : null;
    }
  }
  return out;
}

export function peopleFrom(months: ArchiveMonthMeta[], staffOrder: string[]): string[] {
  const out: string[] = [];
  for (const n of staffOrder) if (months.some((m) => staffKeyIn(m.summary!.byStaff, n))) out.push(n);
  for (const m of months)
    for (const k of Object.keys(m.summary!.byStaff))
      if ((m.summary!.byStaff[k]?.baht ?? 0) > 0 && !out.some((x) => x === k || matchesOfficer(x, k))) out.push(k);
  return out;
}
