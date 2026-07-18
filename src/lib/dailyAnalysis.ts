// Daily post-close analysis engine (rule-based).
//
// Turns the per-officer numbers already computed for the Home combined
// table into human-readable Thai insights: where each person is weak,
// concrete coaching tips, and — when things are critical — a prioritised
// action plan. Pure functions with a normalised input so the same engine
// can later feed an AI layer or a server-side Telegram job.

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
  /** e.g. "฿55,000 / ฿110,000" or "2/13 บิล" */
  detail?: string;
}

export interface OfficerAnalysis {
  name: string;
  branch: string;
  staffId?: string;
  /** Headline: month-to-date total sales achievement % */
  overallPct: number;
  grade: "A" | "B" | "C" | "D";
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
  /** Weakest areas store-wide (avg achievement across staff) */
  topWeakAreas: { area: string; avgPct: number }[];
  summary: string[];
}

// ── thresholds ─────────────────────────────────────────────────────────
const WEAK = 80; // below target but recoverable
const CRIT = 50; // critical
const CSAT_TARGET = 20; // store response-rate target (%)
const CSAT_CRIT = 10;

const severityFor = (pct: number, weak = WEAK, crit = CRIT): Severity => {
  if (pct >= 100) return "good";
  if (pct >= weak) return "watch";
  if (pct >= crit) return "weak";
  return "critical";
};

const gradeFor = (pct: number): OfficerAnalysis["grade"] => {
  if (pct >= 100) return "A";
  if (pct >= 80) return "B";
  if (pct >= 60) return "C";
  return "D";
};

const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

// ── recommendation mapping (keyword → Thai coaching tip) ───────────────
function recommendationFor(m: AnalysisMetric): string {
  const l = m.label.toLowerCase();
  const gap = m.achievePct < CRIT ? "ต่ำมาก" : "ต่ำกว่าเป้า";

  if (m.kind === "csat") {
    return `อัตราการตอบแบบสอบถาม ${gap} (${m.achievePct.toFixed(0)}%) — ชวนลูกค้าสแกน QR ประเมินก่อนออกจากร้านทุกบิล และแจ้งว่าใช้เวลาแค่ 10 วินาที`;
  }

  if (l.includes("cover") || l.includes("ac+") || l.includes("ufund") || l.includes("ประกัน"))
    return `${m.label} ${gap} — เสนอประกัน/บริการทุกบิล iPhone·iPad ด้วยสคริปต์ "ปกป้องเครื่องคุ้มกว่าซ่อม" และเน้นตอนปิดการขาย`;
  if (l.includes("film") || l.includes("ฟิล์ม") || l.includes("case") || l.includes("เคส") || l.includes("pvl"))
    return `${m.label} ${gap} — bundle ฟิล์ม+เคสตอนปิดการขาย เสนอเป็นเซ็ตพร้อมติดตั้งให้ฟรี`;
  if (l.includes("pencil"))
    return `${m.label} ${gap} — เสนอ Pencil/Keyboard คู่กับ iPad ทุกครั้ง โดยสาธิตการใช้งานจริง`;
  if (l.includes("sim"))
    return `${m.label} ${gap} — เสนอแพ็กเกจ SIM/เน็ตคู่กับเครื่องใหม่ ชูโปรค่าบริการรายเดือน`;
  if (l.includes("trade"))
    return `${m.label} ${gap} — ชวนลูกค้าเทิร์นเครื่องเก่าเพิ่มมูลค่า เช็คราคาเทิร์นให้ดูทันทีหน้าเครื่อง`;
  if (l.includes("iphone"))
    return `ยอด iPhone ${gap} — เน้นรุ่นใหม่ + เทิร์นเครื่องเก่า และผูกกับประกัน/อุปกรณ์เสริม`;
  if (l.includes("ipad"))
    return `ยอด iPad ${gap} — เจาะกลุ่มนักเรียน/ทำงาน เสนอ iPad + Pencil + เคสเป็นเซ็ต`;
  if (l.includes("mac"))
    return `ยอด Mac ${gap} — ชูจุดเด่นด้านงาน/เรียน เสนอผ่อน 0% และเทิร์นโน้ตบุ๊กเก่า`;
  if (l.includes("watch"))
    return `ยอด Apple Watch ${gap} — เสนอคู่กับ iPhone ชูฟีเจอร์สุขภาพ และสาย/เคสเสริม`;
  if (l.includes("btb"))
    return `ยอด ${m.label} ${gap} — ติดตามดีลองค์กร/ลูกค้าธุรกิจที่ค้างอยู่ และเสนอใบเสนอราคาเชิงรุก`;
  return `${m.label} ${gap} (${m.achievePct.toFixed(0)}%) — วางแผนเจาะเป้าหมวดนี้เพิ่ม`;
}

const isPercentPreset = (c: PresetCalcType | undefined): boolean =>
  c === "attach" || c === "bahtRate" || c === "catAttach" || c === "tradeIn";

// ── per-officer ────────────────────────────────────────────────────────
export function analyzeOfficer(
  row: CombinedOfficerRow,
  categories: string[],
  presets: { id: string; name: string; calcType?: PresetCalcType }[],
): OfficerAnalysis {
  const metrics: AnalysisMetric[] = [];

  // Category sales (skip categories with no target)
  for (const cat of categories) {
    const c = row.cats[cat];
    if (!c || c.target <= 0) continue;
    metrics.push({
      label: cat,
      achievePct: c.achPercent,
      severity: severityFor(c.achPercent),
      kind: "category",
      detail: `${fmtBaht(c.actual)} / ${fmtBaht(c.target)}`,
    });
  }

  // 7 Wonders (scale percent-presets vs their target)
  for (const p of presets) {
    const w = row.wonders[p.id];
    if (!w || w.target <= 0) continue;
    const pct = isPercentPreset(p.calcType)
      ? (w.actual / w.target) * 100
      : w.achPercent;
    const detail =
      w.actualA !== undefined && w.actualB !== undefined
        ? `${Math.round(w.actualA)}/${Math.round(w.actualB)} บิล`
        : undefined;
    metrics.push({
      label: p.name,
      achievePct: pct,
      severity: severityFor(pct),
      kind: "wonder",
      detail,
    });
  }

  // CSAT response rate
  if (row.csat && row.csat.billCount > 0) {
    const rate = (row.csat.responseCount / row.csat.billCount) * 100;
    metrics.push({
      label: "CSAT (อัตราการตอบ)",
      achievePct: rate,
      severity: severityFor(rate, CSAT_TARGET, CSAT_CRIT),
      kind: "csat",
      detail: `${row.csat.responseCount}/${row.csat.billCount} บิล`,
    });
  }

  const overallPct = row.catTotal.target > 0 ? row.catTotal.achPercent : 0;

  const strengths = metrics
    .filter((m) => m.severity === "good")
    .sort((a, b) => b.achievePct - a.achievePct)
    .slice(0, 3);

  const weaknesses = metrics
    .filter((m) => m.severity === "weak" || m.severity === "critical")
    .sort((a, b) => a.achievePct - b.achievePct);

  const recommendations = weaknesses.slice(0, 4).map(recommendationFor);

  const criticalMetrics = metrics.filter((m) => m.severity === "critical");
  const critical = overallPct < CRIT || criticalMetrics.length >= 2;

  const actionPlan: string[] = [];
  if (critical) {
    const focus = (criticalMetrics.length ? criticalMetrics : weaknesses)
      .sort((a, b) => a.achievePct - b.achievePct)
      .slice(0, 3);
    focus.forEach((m, i) => {
      actionPlan.push(`ลำดับ ${i + 1}: ${recommendationFor(m)}`);
    });
    if (overallPct < CRIT) {
      actionPlan.push(
        `ยอดรวมทำได้เพียง ${overallPct.toFixed(0)}% ของเป้า — จับคู่โค้ชกับหัวหน้า/พนักงานท็อป และตั้งเป้าย่อยรายวันเพื่อไล่ตามให้ทัน`,
      );
    }
  }

  return {
    name: row.officer.name,
    branch: row.officer.branch,
    staffId: row.officer.staffId,
    overallPct,
    grade: gradeFor(overallPct),
    strengths,
    weaknesses,
    recommendations,
    critical,
    actionPlan,
  };
}

// ── store-wide ─────────────────────────────────────────────────────────
export function analyzeStore(
  data: CombinedOfficerKpiData,
  dateLabel: string,
): StoreAnalysis {
  const officers = data.rows.map((r) =>
    analyzeOfficer(r, data.categories, data.presets),
  );

  const criticalCount = officers.filter((o) => o.critical).length;

  // Weakest areas store-wide: average achievement per metric label
  const agg = new Map<string, { sum: number; n: number }>();
  for (const r of data.rows) {
    const a = analyzeOfficer(r, data.categories, data.presets);
    for (const m of [...a.weaknesses, ...a.strengths]) {
      const cur = agg.get(m.label) ?? { sum: 0, n: 0 };
      cur.sum += m.achievePct;
      cur.n += 1;
      agg.set(m.label, cur);
    }
  }
  const topWeakAreas = Array.from(agg.entries())
    .map(([area, v]) => ({ area, avgPct: v.n ? v.sum / v.n : 0 }))
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
    if (o.weaknesses.length) {
      lines.push(
        `  จุดอ่อน: ${o.weaknesses
          .slice(0, 4)
          .map((w) => `${w.label} ${w.achievePct.toFixed(0)}%`)
          .join(", ")}`,
      );
    }
    o.recommendations.forEach((r) => lines.push(`  • ${r}`));
    if (o.critical && o.actionPlan.length) {
      lines.push("  🚨 แผนแก้ไขด่วน:");
      o.actionPlan.forEach((a) => lines.push(`     - ${a}`));
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
