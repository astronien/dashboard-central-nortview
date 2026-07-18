// Daily post-close analysis engine (rule-based).
//
// Turns the per-officer numbers already computed for the Home combined
// table into human-readable Thai insights: where each person is weak,
// concrete coaching tips grounded in their own figures (gap to target,
// how they compare to the team), a per-person pattern read, and — when
// things are critical — a prioritised action plan. Pure functions with a
// normalised input so the same engine can later feed an AI layer or a
// server-side Telegram job.

import type {
  CombinedOfficerKpiData,
  CombinedOfficerRow,
} from "../components/dashboard/HomeDashboardSection";
import type { PresetCalcType } from "./presetTypes";

export type Severity = "good" | "watch" | "weak" | "critical";

export interface AnalysisMetric {
  /** Category or 7-Wonder name, or "CSAT" */
  label: string;
  /** Achievement vs target, 0–100+ (for CSAT: response rate %) */
  achievePct: number;
  severity: Severity;
  kind: "category" | "wonder" | "csat";
  actual?: number;
  target?: number;
  /** 7-Wonder attach: bills with A / base bills */
  actualA?: number;
  actualB?: number;
  calcType?: PresetCalcType;
  /** e.g. "฿55,000 / ฿110,000" or "2/13 บิล" */
  detail?: string;
  /** e.g. "ขาด ฿445,800" or "เหลืออีก ~3 บิลถึงเป้า" */
  gapText?: string;
  /** team average achievement for this metric */
  peerAvg?: number;
  /** how many units/bills short of target (for prioritising) */
  opportunity?: number;
}

export interface OfficerAnalysis {
  name: string;
  branch: string;
  staffId?: string;
  /** Headline: month-to-date total sales achievement % */
  overallPct: number;
  grade: "A" | "B" | "C" | "D";
  /** One-line pattern read of this person specifically */
  insight: string;
  strengths: AnalysisMetric[];
  weaknesses: AnalysisMetric[];
  recommendations: string[];
  critical: boolean;
  /** Prioritised steps, only when critical */
  actionPlan: string[];
}

export interface StoreAnalysis {
  dateLabel: string;
  officers: OfficerAnalysis[];
  criticalCount: number;
  topWeakAreas: { area: string; avgPct: number }[];
  summary: string[];
}

// ── thresholds ─────────────────────────────────────────────────────────
const WEAK = 80;
const CRIT = 50;
const CSAT_TARGET = 20;
const CSAT_CRIT = 10;
const DEVICE_CATS = ["Mac", "iPad", "iPhone", "Apple Watch"];

const severityFor = (pct: number, weak = WEAK, crit = CRIT): Severity => {
  if (pct >= 100) return "good";
  if (pct >= weak) return "watch";
  if (pct >= crit) return "weak";
  return "critical";
};

const gradeFor = (pct: number): OfficerAnalysis["grade"] =>
  pct >= 100 ? "A" : pct >= 80 ? "B" : pct >= 60 ? "C" : "D";

const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const isPercentPreset = (c: PresetCalcType | undefined): boolean =>
  c === "attach" || c === "bahtRate" || c === "catAttach" || c === "tradeIn";

// The coaching action for a given metric label (what to DO).
function tipFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("ufund"))
    return "เสนอผ่อนผ่าน UFUND (สินเชื่อบุคคล) กับลูกค้าที่ไม่มีบัตรเครดิตแต่สนใจ iPhone/Mac/iPad — เป็นตัวปิดการขายเครื่องราคาสูงที่คนมักพลาด";
  if (l.includes("cover") || l.includes("ac+") || l.includes("ประกัน"))
    return 'เสนอประกัน/บริการทุกบิล iPhone·iPad ด้วยสคริปต์ "ปกป้องเครื่องคุ้มกว่าซ่อม" ปิดตอนจบการขาย';
  if (l.includes("film") || l.includes("ฟิล์ม"))
    return "เสนอฟิล์มพร้อมติดตั้งให้ฟรีทุกเครื่อง ทำเป็นขั้นตอนมาตรฐานก่อนส่งมอบ";
  if (l.includes("case") || l.includes("เคส") || l.includes("pvl"))
    return "bundle เคสตอนปิดการขาย เสนอเป็นเซ็ตกับฟิล์ม";
  if (l.includes("pencil"))
    return "เสนอ Pencil/Keyboard คู่กับ iPad ทุกครั้ง โดยสาธิตการใช้งานจริง";
  if (l.includes("sim"))
    return "เสนอแพ็กเกจ SIM/เน็ตคู่กับเครื่องใหม่ ชูโปรค่าบริการรายเดือน";
  if (l.includes("trade"))
    return "เช็คราคาเทิร์นให้ลูกค้าดูทันทีหน้าเครื่อง ชวนเทิร์นเพื่อลดราคาเครื่องใหม่";
  if (l.includes("csat"))
    return "ชวนลูกค้าสแกน QR ประเมินก่อนออกจากร้านทุกบิล บอกว่าใช้เวลาแค่ 10 วินาที";
  if (l.includes("iphone"))
    return "เน้นรุ่นใหม่ + เทิร์นเครื่องเก่า และผูกกับประกัน/อุปกรณ์เสริมทุกเครื่อง";
  if (l.includes("ipad"))
    return "เจาะกลุ่มนักเรียน/ทำงาน เสนอ iPad + Pencil + เคสเป็นเซ็ต";
  if (l.includes("mac"))
    return "ชูจุดเด่นด้านงาน/เรียน เสนอผ่อน 0% และเทิร์นโน้ตบุ๊กเก่า";
  if (l.includes("watch"))
    return "เสนอคู่กับ iPhone ชูฟีเจอร์สุขภาพ และสาย/เคสเสริม";
  if (l.includes("btb"))
    return "ติดตามดีลองค์กร/ลูกค้าธุรกิจที่ค้างอยู่ และเสนอใบเสนอราคาเชิงรุก";
  return "วางแผนเจาะเป้าหมวดนี้เพิ่ม";
}

// Compose a specific recommendation from the metric's own numbers.
function recommendationFor(m: AnalysisMetric): string {
  const head = `${m.label} ${m.achievePct.toFixed(0)}%`;
  const detail = m.detail ? ` (${m.detail})` : "";
  const gap = m.gapText ? ` ${m.gapText}` : "";
  const peer =
    m.peerAvg !== undefined && m.achievePct < m.peerAvg - 8
      ? ` · ต่ำกว่าค่าเฉลี่ยทีม ${(m.peerAvg - m.achievePct).toFixed(0)}pp`
      : m.peerAvg !== undefined && m.achievePct > m.peerAvg + 12
        ? ` · สูงกว่าทีม แต่ยังไม่ถึงเป้า`
        : "";
  return `${head}${detail}${gap} — ${tipFor(m.label)}${peer}`;
}

// Per-person pattern read (device vs attach vs CSAT).
function computeInsight(
  metrics: AnalysisMetric[],
  overallPct: number,
): string {
  const avg = (arr: AnalysisMetric[]) =>
    arr.length ? arr.reduce((s, m) => s + m.achievePct, 0) / arr.length : NaN;
  const device = avg(
    metrics.filter((m) => m.kind === "category" && DEVICE_CATS.includes(m.label)),
  );
  const attach = avg(metrics.filter((m) => m.kind === "wonder"));
  const csat = metrics.find((m) => m.kind === "csat");

  const parts: string[] = [];
  if (!isNaN(device) && !isNaN(attach)) {
    if (device >= 80 && attach < 70)
      parts.push(
        `ปิดการขายเครื่องได้ดี (หมวดหลักเฉลี่ย ${device.toFixed(0)}%) แต่แนบบริการเสริมน้อย (7 Wonders เฉลี่ย ${attach.toFixed(0)}%) — ทุกเครื่องที่ขายคือโอกาสแนบที่หลุดไป โฟกัส attach จะเพิ่มมาร์จิ้นทันที`,
      );
    else if (attach >= 80 && device < 70)
      parts.push(
        `แนบอุปกรณ์เสริมเก่ง (${attach.toFixed(0)}%) แต่ยอดเครื่องหลักยังต่ำ (${device.toFixed(0)}%) — เพิ่มการปิดการขายเครื่องหลัก โดยเฉพาะรุ่นราคาสูง`,
      );
    else if (device < 60 && attach < 60)
      parts.push(
        `อ่อนทั้งยอดเครื่องและ attach — ต้องเร่งพื้นฐานการขาย เข้าโค้ชแบบตัวต่อตัว`,
      );
    else if (device >= 90 && attach >= 90)
      parts.push(`ทำได้สมดุลทั้งยอดเครื่องและ attach — รักษาระดับและช่วยโค้ชเพื่อน`);
  }
  if (csat && csat.achievePct < CSAT_TARGET)
    parts.push(
      `อัตราการตอบ CSAT ต่ำ (${csat.achievePct.toFixed(0)}%) — เก็บ feedback ลูกค้าได้น้อย ควรชวนสแกน QR ทุกบิล`,
    );

  if (parts.length === 0)
    parts.push(
      overallPct >= 100
        ? "ทำได้ตามเป้าโดยรวม — โฟกัสรักษาระดับและดันหมวดที่ยังพอมีช่องว่าง"
        : `ยอดรวม ${overallPct.toFixed(0)}% ของเป้า — ไล่ดูจุดอ่อนด้านล่างเป็นรายหมวด`,
    );
  return parts.join(" ");
}

// ── build metrics for one officer ──────────────────────────────────────
function buildMetrics(
  row: CombinedOfficerRow,
  categories: string[],
  presets: { id: string; name: string; calcType?: PresetCalcType }[],
  peerAvg: Map<string, number>,
): AnalysisMetric[] {
  const metrics: AnalysisMetric[] = [];

  for (const cat of categories) {
    const c = row.cats[cat];
    if (!c || c.target <= 0) continue;
    const gap = c.target - c.actual;
    metrics.push({
      label: cat,
      achievePct: c.achPercent,
      severity: severityFor(c.achPercent),
      kind: "category",
      actual: c.actual,
      target: c.target,
      detail: `${fmtBaht(c.actual)} / ${fmtBaht(c.target)}`,
      gapText: gap > 0 ? `ขาดอีก ${fmtBaht(gap)}` : undefined,
      peerAvg: peerAvg.get(cat),
      opportunity: gap > 0 ? gap : 0,
    });
  }

  for (const p of presets) {
    const w = row.wonders[p.id];
    if (!w || w.target <= 0) continue;
    const percent = isPercentPreset(p.calcType);
    const pct = percent ? (w.actual / w.target) * 100 : w.achPercent;
    let detail: string | undefined;
    let gapText: string | undefined;
    let opportunity = 0;
    if (w.actualA !== undefined && w.actualB !== undefined) {
      detail = `แนบ ${Math.round(w.actualA)}/${Math.round(w.actualB)} บิล`;
      if (percent && w.actualB > 0) {
        const need = Math.ceil((w.target / 100) * w.actualB);
        opportunity = Math.max(0, need - Math.round(w.actualA));
        if (opportunity > 0)
          gapText = `เหลืออีก ~${opportunity} บิลถึงเป้า`;
      }
    }
    metrics.push({
      label: p.name,
      achievePct: pct,
      severity: severityFor(pct),
      kind: "wonder",
      actualA: w.actualA,
      actualB: w.actualB,
      calcType: p.calcType,
      detail,
      gapText,
      peerAvg: peerAvg.get(p.name),
      opportunity,
    });
  }

  if (row.csat && row.csat.billCount > 0) {
    const rate = (row.csat.responseCount / row.csat.billCount) * 100;
    metrics.push({
      label: "CSAT (อัตราการตอบ)",
      achievePct: rate,
      severity: severityFor(rate, CSAT_TARGET, CSAT_CRIT),
      kind: "csat",
      detail: `ตอบ ${row.csat.responseCount}/${row.csat.billCount} บิล`,
      peerAvg: peerAvg.get("CSAT (อัตราการตอบ)"),
    });
  }

  return metrics;
}

// ── per-officer ────────────────────────────────────────────────────────
export function analyzeOfficer(
  row: CombinedOfficerRow,
  categories: string[],
  presets: { id: string; name: string; calcType?: PresetCalcType }[],
  peerAvg: Map<string, number> = new Map(),
): OfficerAnalysis {
  const metrics = buildMetrics(row, categories, presets, peerAvg);
  const overallPct = row.catTotal.target > 0 ? row.catTotal.achPercent : 0;

  const strengths = metrics
    .filter((m) => m.severity === "good")
    .sort((a, b) => b.achievePct - a.achievePct)
    .slice(0, 3);

  // Rank weaknesses: critical first, then by how far below the team,
  // then by raw achievement — so the list is specific to this person.
  const weaknesses = metrics
    .filter((m) => m.severity === "weak" || m.severity === "critical")
    .sort((a, b) => {
      if (a.severity !== b.severity)
        return a.severity === "critical" ? -1 : 1;
      const aPeer = a.peerAvg !== undefined ? a.peerAvg - a.achievePct : 0;
      const bPeer = b.peerAvg !== undefined ? b.peerAvg - b.achievePct : 0;
      if (Math.abs(bPeer - aPeer) > 3) return bPeer - aPeer;
      return a.achievePct - b.achievePct;
    });

  const recommendations = weaknesses.slice(0, 4).map(recommendationFor);
  const insight = computeInsight(metrics, overallPct);

  const criticalMetrics = metrics.filter((m) => m.severity === "critical");
  const critical = overallPct < CRIT || criticalMetrics.length >= 2;

  const actionPlan: string[] = [];
  if (critical) {
    const focus = (criticalMetrics.length ? criticalMetrics : weaknesses)
      .sort((a, b) => a.achievePct - b.achievePct)
      .slice(0, 3);
    focus.forEach((m, i) =>
      actionPlan.push(`ลำดับ ${i + 1}: ${recommendationFor(m)}`),
    );
    if (overallPct < CRIT)
      actionPlan.push(
        `ยอดรวมทำได้เพียง ${overallPct.toFixed(0)}% ของเป้า — จับคู่โค้ชกับหัวหน้า/พนักงานท็อป ตั้งเป้าย่อยรายวันเพื่อไล่ให้ทัน`,
      );
  }

  return {
    name: row.officer.name,
    branch: row.officer.branch,
    staffId: row.officer.staffId,
    overallPct,
    grade: gradeFor(overallPct),
    insight,
    strengths,
    weaknesses,
    recommendations,
    critical,
    actionPlan,
  };
}

// ── store-wide ─────────────────────────────────────────────────────────
function computePeerAverages(
  data: CombinedOfficerKpiData,
): Map<string, number> {
  const agg = new Map<string, { sum: number; n: number }>();
  const add = (label: string, pct: number) => {
    const cur = agg.get(label) ?? { sum: 0, n: 0 };
    cur.sum += pct;
    cur.n += 1;
    agg.set(label, cur);
  };
  for (const r of data.rows) {
    for (const cat of data.categories) {
      const c = r.cats[cat];
      if (c && c.target > 0) add(cat, c.achPercent);
    }
    for (const p of data.presets) {
      const w = r.wonders[p.id];
      if (w && w.target > 0)
        add(
          p.name,
          isPercentPreset(p.calcType) ? (w.actual / w.target) * 100 : w.achPercent,
        );
    }
    if (r.csat && r.csat.billCount > 0)
      add(
        "CSAT (อัตราการตอบ)",
        (r.csat.responseCount / r.csat.billCount) * 100,
      );
  }
  const out = new Map<string, number>();
  agg.forEach((v, k) => out.set(k, v.n ? v.sum / v.n : 0));
  return out;
}

export function analyzeStore(
  data: CombinedOfficerKpiData,
  dateLabel: string,
): StoreAnalysis {
  const peerAvg = computePeerAverages(data);
  const officers = data.rows.map((r) =>
    analyzeOfficer(r, data.categories, data.presets, peerAvg),
  );

  const criticalCount = officers.filter((o) => o.critical).length;

  const topWeakAreas = Array.from(peerAvg.entries())
    .map(([area, avgPct]) => ({ area, avgPct }))
    .filter((x) => x.avgPct < WEAK)
    .sort((a, b) => a.avgPct - b.avgPct)
    .slice(0, 5);

  const summary: string[] = [];
  const nStaff = officers.length;
  const avgOverall = nStaff
    ? officers.reduce((s, o) => s + o.overallPct, 0) / nStaff
    : 0;
  summary.push(
    `พนักงาน ${nStaff} คน · ยอดรวมเฉลี่ยทำได้ ${avgOverall.toFixed(0)}% ของเป้า`,
  );
  if (criticalCount > 0) {
    const names = officers
      .filter((o) => o.critical)
      .map((o) => o.name)
      .join(", ");
    summary.push(`⚠️ วิกฤติ ${criticalCount} คน ต้องเข้าโค้ชด่วน: ${names}`);
  } else {
    summary.push("✅ ไม่มีใครอยู่ในเกณฑ์วิกฤติวันนี้");
  }
  if (topWeakAreas.length) {
    summary.push(
      `หมวดที่ทั้งร้านควรเร่ง: ${topWeakAreas
        .map((x) => `${x.area} (${x.avgPct.toFixed(0)}%)`)
        .join(" · ")}`,
    );
  }

  return { dateLabel, officers, criticalCount, topWeakAreas, summary };
}

// ── plain-text render (for Telegram / copy) ────────────────────────────
export function analysisToText(store: StoreAnalysis): string {
  const lines: string[] = [];
  lines.push(`📊 บทวิเคราะห์รายวัน — ${store.dateLabel}`);
  lines.push("");
  store.summary.forEach((s) => lines.push(s));
  lines.push("");
  const sorted = [...store.officers].sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return a.overallPct - b.overallPct;
  });
  for (const o of sorted) {
    lines.push(
      `${o.critical ? "🔴" : o.grade === "A" ? "🟢" : "🟡"} ${o.name} — ยอดรวม ${o.overallPct.toFixed(0)}% (เกรด ${o.grade})`,
    );
    lines.push(`  💡 ${o.insight}`);
    o.recommendations.forEach((r) => lines.push(`  • ${r}`));
    if (o.critical && o.actionPlan.length) {
      lines.push("  🚨 แผนแก้ไขด่วน:");
      o.actionPlan.forEach((a) => lines.push(`     - ${a}`));
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
