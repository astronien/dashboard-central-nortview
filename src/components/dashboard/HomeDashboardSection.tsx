import React from "react";
import { TrendingDown, Building2, User, Smile } from "lucide-react";
import type { CsatOverview, CsatLowScore } from "../../lib/csatApi";
import type { CategorySnapshotItem } from "../../lib/categorySnapshotBuilder";
import type { DerivedHomeStat } from "./dashboardTypes";
import { CategorySnapshotSection } from "./CategorySnapshotSection";
import type { Preset } from "../../lib/presetTypes";
import type { PresetCalcType } from "../../lib/presetTypes";

export type MonthlyPerformance = {
  overallScore: { score: number; grade: string };
  actualSales: { actual: number; target: number; rate: number };
  trueSim: { count: number; base: number; rate: number; target: number };
  caseIphone: { count: number; base: number; rate: number; target: number };
  ufundPersonal: { count: number; base: number; rate: number; target: number };
  coverPlus: { count: number; base: number; rate: number; target: number };
  pencil: { count: number; base: number; rate: number; target: number };
  kpisMac: { count: number; base: number; rate: number; target: number };
  kpisIpad: { count: number; base: number; rate: number; target: number };
  btbMix: { btbSales: number; totalSales: number; rate: number; target: number };
  macYoY: { actual: number; target: number; rate: number; targetRate: number };
  totalYoY: { actual: number; target: number; rate: number; targetRate: number };
  gradeDist: { A: number; B: number; C: number; D: number };
  lowForecast: number;
};

export type BranchOverviewKpiRow = {
  officer: { name: string; branch: string };
  results: Record<string, number>;
};

export type BranchOverviewKpiData = {
  presets: Preset[];
  rows: BranchOverviewKpiRow[];
};

export type CombinedCatCell = {
  target: number;
  actual: number;
  achPercent: number;
};

export type CombinedWonderCell = {
  target: number;
  actual: number;
  actualA?: number;
  actualB?: number;
  achPercent: number;
  calcType?: PresetCalcType;
  /** 2nd sub-column numerator: Trade-In ยอดประเมิน (all trades) / UFUND อนุมัติ */
  appraisalA?: number;
  /** 2nd sub-column base (UFUND ยอดยื่น total); Trade-In falls back to iPhone */
  appraisalB?: number;
};

export type CombinedOfficerRow = {
  officer: { name: string; branch: string; staffId?: string };
  cats: Record<string, CombinedCatCell>;
  catTotal: CombinedCatCell;
  wonders: Record<string, CombinedWonderCell>;
  csat?: {
    score: number | null;
    maxScore: number;
    responseCount: number;
    billCount: number;
  };
};

export type CombinedOfficerKpiData = {
  categories: string[];
  presets: Preset[];
  rows: CombinedOfficerRow[];
};

export function HomeDashboardSection({
  derivedHomeStats,
  monthlyPerformance,
  categorySnapshots,
  branchOverviewKpiData,
  combinedOfficerKpiData,
  csatOverview,
  csatLowScores,
  pace,
  categorySnapshotRef,
  captureRef,
  combinedTableRef,
}: {
  derivedHomeStats: DerivedHomeStat[];
  monthlyPerformance: MonthlyPerformance;
  pace?: { actual: number; target: number; currentDay: number; totalDays: number };
  categorySnapshots?: CategorySnapshotItem[];
  branchOverviewKpiData?: BranchOverviewKpiData;
  combinedOfficerKpiData?: CombinedOfficerKpiData;
  csatOverview?: CsatOverview;
  csatLowScores?: CsatLowScore[];
  categorySnapshotRef?: React.RefObject<HTMLDivElement | null>;
  /** Wraps the stat cards + Category KPI Snapshot for screenshot capture */
  captureRef?: React.RefObject<HTMLDivElement | null>;
  /** Wraps the "ยอดขายตามหมวด + 7 Wonders รายคน" table for its own capture */
  combinedTableRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div ref={captureRef} className="flex flex-col gap-6">
        {pace && pace.target > 0 && pace.totalDays > 0 ? (
          <PaceBanner {...pace} />
        ) : null}
        <div className={`grid grid-cols-2 ${derivedHomeStats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-3 md:gap-4`}>
          {derivedHomeStats.map((stat, idx) => (
            <div key={idx} className="bg-white/5 rounded-2xl border border-white/10 p-4 md:p-5 flex flex-col gap-1">
              <div className="text-[13px] text-white/55">{stat.label}</div>
              <div className="text-2xl md:text-[28px] leading-tight font-semibold text-white tabular-nums">{stat.value}</div>
              {stat.trend ? (
                <div className={`text-[12px] flex items-center gap-1 ${stat.isUp ? "text-white/50" : "text-rose-300"}`}>
                  {stat.isUp ? null : <TrendingDown className="w-3.5 h-3.5" />}
                  {stat.trend}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {categorySnapshots && categorySnapshots.length > 0 ? (
          <CategorySnapshotSection ref={categorySnapshotRef} items={categorySnapshots} />
        ) : null}

        {csatOverview ? <CsatStoreCard overview={csatOverview} /> : null}

        {csatLowScores && csatLowScores.length > 0 ? (
          <CsatLowScoresCard items={csatLowScores} />
        ) : null}
      </div>

      {branchOverviewKpiData && branchOverviewKpiData.presets.length > 0 ? (
        <BranchOverviewKpiTable data={branchOverviewKpiData} />
      ) : null}

      {combinedOfficerKpiData && combinedOfficerKpiData.rows.length > 0 ? (
        <div ref={combinedTableRef}>
          <CombinedOfficerKpiTable data={combinedOfficerKpiData} />
        </div>
      ) : null}
    </>
  );
}

const colorDotClass = (color: string) => {
  const map: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    purple: "bg-purple-500",
    coral: "bg-orange-500",
  };
  return map[color] || "bg-white/40";
};

const formatKpiCell = (val: number, calcType: PresetCalcType | undefined): string => {
  if (!isFinite(val) || isNaN(val)) return "—";
  switch (calcType) {
    case "attach":
    case "bahtRate":
    case "catAttach":
    case "tradeIn":
      return `${val.toFixed(1)}%`;
    case "baht":
    case "catBaht":
      return `฿${Math.round(val).toLocaleString()}`;
    case "unit":
    case "catQty":
      return Math.round(val).toLocaleString();
    default:
      return val.toFixed(1);
  }
};

const calcTypeLabel = (calcType: PresetCalcType | undefined): string => {
  switch (calcType) {
    case "attach":
      return "Attach %";
    case "bahtRate":
      return "฿ Attach %";
    case "unit":
      return "Unit";
    case "baht":
      return "Baht";
    case "catBaht":
      return "฿ CatMaster";
    case "catQty":
      return "Qty CatMaster";
    case "catAttach":
      return "ATT % CatMaster";
    case "tradeIn":
      return "Trade In %";
    default:
      return "—";
  }
};

function BranchOverviewKpiTable({ data }: { data: BranchOverviewKpiData }) {
  const { presets, rows } = data;

  return (
    <div className="bg-white/10 rounded-2xl border border-white/10 p-6  overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
          <User className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            ตาราง KPI เจ้าหน้าที่ตามที่เลือก
          </h2>
          <p className="text-[11px] text-white/50">
            แสดงค่า KPI ของ Preset ที่เลือก "หน้ารวมสาขา" แยกตามรายชื่อเจ้าหน้าที่
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-8">
          ยังไม่มีข้อมูลเจ้าหน้าที่ — กรุณาอัปโหลดไฟล์ Current
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th className="py-3 px-3 font-semibold sticky left-0 bg-[#0c3123] z-10 min-w-[110px] md:min-w-[160px]">
                  เจ้าหน้าที่
                </th>
                <th className="hidden md:table-cell py-3 px-3 font-semibold min-w-[120px]">
                  สาขา
                </th>
                {presets.map((p) => (
                  <th
                    key={p.id}
                    className="py-3 px-3 font-semibold text-right min-w-[120px]"
                    title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${colorDotClass(p.color)}`} />
                      <span>{p.name}</span>
                    </div>
                    <div className="text-[11px] text-white/40 font-normal normal-case mt-0.5">
                      {calcTypeLabel(p.calcType)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={`${row.officer.name}-${idx}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium text-white sticky left-0 bg-[#0a1f17] z-10">
                    {row.officer.name}
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3 text-white/70">{row.officer.branch || "-"}</td>
                  {presets.map((p) => {
                    const val = row.results[p.id] ?? 0;
                    return (
                      <td
                        key={p.id}
                        className="py-2.5 px-3 text-right font-mono font-semibold text-white"
                      >
                        {formatKpiCell(val, p.calcType)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// สีบอกสถานะแบบเงียบ: ไม่มีกรอบ/พื้น — ถึงเป้า = เขียว, ต่ำกว่า 80% = แดง, ที่เหลือ = ตัวอักษรปกติ
const achBadgeClass = (rate: number): string => {
  if (rate >= 100) return "text-emerald-300 font-semibold";
  if (rate >= 80) return "text-white/70";
  return "text-rose-300 font-semibold";
};

/**
 * ตารางรวมหน้า Home: ยอดขายแยกตามหมวด (เหมือน staff profile) + 7 Wonders
 * ทั้งหมดในตารางเดียว ลิสต์เป็นรายเจ้าหน้าที่
 */
/** ตัดทศนิยมเหลือ 2 ตำแหน่งแบบไม่ปัดขึ้น (4,847,191 → 4.84) */
const trunc2 = (n: number): string => {
  const t = Math.trunc(n * 100) / 100;
  return t.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
/** ย่อตัวเลข — ค่าจริงไม่ปัดขึ้น แสดง 2 ตำแหน่ง (4.84M, 273.82K) */
const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trunc2(n / 1_000_000)}M`;
  if (abs >= 10_000) return `${trunc2(n / 1000)}K`;
  return Math.trunc(n).toLocaleString();
};
/** % จริง 2 ตำแหน่ง ไม่ปัดขึ้น (87.59%) */
const fmtPct = (n: number): string => `${trunc2(n)}%`;

const isPercentCalc = (calcType: PresetCalcType | undefined): boolean =>
  calcType === "attach" ||
  calcType === "bahtRate" ||
  calcType === "catAttach" ||
  calcType === "tradeIn";

// Shorten a 7-Wonder preset name for the header — drop the word "Attach"
// (it makes the columns needlessly wide, e.g. "ATTACH COVERPLUS" → "COVERPLUS")
const shortWonderName = (name: string): string =>
  name.replace(/attach/gi, "").replace(/\s+/g, " ").trim() || name;

function CombinedOfficerKpiTable({ data }: { data: CombinedOfficerKpiData }) {
  const { categories, presets, rows } = data;
  const hasCsat = rows.some((r) => r.csat && r.csat.score !== null);

  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const onSort = (key: string) =>
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  // Trade-In and UFUND presets get a 2nd sub-column (ยอดประเมิน), nested
  // under a sub-group header (TRADE-IN / UFUND) inside 7 Wonders.
  const splitLabel = (p: Preset): { group: string; primary: string; appr: string } => {
    if (p.calcType === "tradeIn") return { group: "TRADE-IN", primary: "ตกลง", appr: "ประเมิน" };
    if (/ufund/i.test(p.name)) return { group: "UFUND", primary: "ตกลง", appr: "ยอดประเมิน" };
    return { group: shortWonderName(p.name), primary: shortWonderName(p.name), appr: "ประเมิน" };
  };
  const isSplit = (p: Preset) =>
    rows.some((r) => r.wonders[p.id]?.appraisalA !== undefined);
  const extraTradeCols = presets.filter(isSplit).length;
  // With any split preset the header has a 3rd row; other cells span 2 rows.
  const rs = extraTradeCols > 0 ? 2 : 1;
  // Base of the 2nd sub-column: UFUND uses ยอดยื่น (appraisalB); Trade-In
  // falls back to the iPhone base (actualB). Trade-In target 50%, UFUND 100%.
  const apprCell = (w: CombinedWonderCell | undefined): CombinedWonderCell | undefined => {
    if (!w || w.appraisalA === undefined) return undefined;
    const base = w.appraisalB ?? w.actualB ?? 0;
    const rate = base > 0 ? (w.appraisalA / base) * 100 : 0;
    return {
      actual: rate,
      target: w.appraisalB !== undefined ? 100 : 50,
      achPercent: rate,
      actualA: w.appraisalA,
      actualB: base,
      calcType: "tradeIn",
    };
  };
  const apprRate = (w: CombinedWonderCell | undefined): number => {
    if (!w || w.appraisalA === undefined) return -1;
    const base = w.appraisalB ?? w.actualB ?? 0;
    return base > 0 ? (w.appraisalA / base) * 100 : 0;
  };
  // UFUND ยอดประเมิน = อนุมัติ/ยื่น + %อนุมัติ (no target line — approval funnel)
  const renderUfundApprCell = (w: CombinedWonderCell | undefined) => {
    if (!w || w.appraisalA === undefined || w.appraisalB === undefined)
      return <span className="text-white/25">—</span>;
    const approved = w.appraisalA;
    const total = w.appraisalB;
    const rate = total > 0 ? (approved / total) * 100 : 0;
    const cls =
      rate >= 50
        ? "bg-green-500/20 text-green-400 font-semibold px-1 py-0.5 rounded border border-green-500/20"
        : rate >= 25
          ? "bg-amber-500/20 text-amber-400 font-semibold px-1 py-0.5 rounded border border-amber-500/20"
          : "bg-rose-500/20 text-rose-400 font-semibold px-1 py-0.5 rounded border border-rose-500/20";
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="font-mono font-semibold text-white tabular-nums">
          {Math.round(approved)}/{Math.round(total)}
        </span>
        {total > 0 ? (
          <span className={`text-[11px] ${cls}`}>{fmtPct(rate)}</span>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </div>
    );
  };

  const sortVal = (row: (typeof rows)[number], key: string): number | string => {
    if (key === "name") return row.officer.name;
    if (key === "total") return row.catTotal.actual;
    if (key === "csat") return row.csat?.score ?? -1;
    if (key.startsWith("cat:")) return row.cats[key.slice(4)]?.actual ?? -1;
    if (key.startsWith("wA:")) return apprRate(row.wonders[key.slice(3)]);
    if (key.startsWith("w:")) return row.wonders[key.slice(2)]?.actual ?? -1;
    return 0;
  };
  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const va = sortVal(a, sort.key);
      const vb = sortVal(b, sort.key);
      if (typeof va === "string" || typeof vb === "string") {
        const r = String(va).localeCompare(String(vb));
        return sort.dir === "asc" ? r : -r;
      }
      return sort.dir === "asc" ? va - vb : vb - va;
    });
  }, [rows, sort]);
  const arrow = (key: string) => (sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  // แถวรวมทั้งร้าน (บนสุด) — หมวด = ผลรวม · 7 Wonders = รวมจำนวนแนบ ÷ รวมฐาน
  const totalRow = React.useMemo<CombinedOfficerRow>(() => {
    const cats: Record<string, CombinedCatCell> = {};
    const sumCat = (pick: (r: CombinedOfficerRow) => CombinedCatCell | undefined): CombinedCatCell => {
      let actual = 0;
      let target = 0;
      for (const r of rows) {
        const c = pick(r);
        if (!c) continue;
        actual += c.actual || 0;
        target += c.target || 0;
      }
      return { actual, target, achPercent: target > 0 ? (actual / target) * 100 : 0 };
    };
    const catKeys = new Set<string>(categories);
    rows.forEach((r) => Object.keys(r.cats).forEach((k) => catKeys.add(k)));
    catKeys.forEach((k) => {
      cats[k] = sumCat((r) => r.cats[k]);
    });
    const wonders: Record<string, CombinedWonderCell> = {};
    for (const p of presets) {
      const cells = rows.map((r) => r.wonders[p.id]).filter(Boolean) as CombinedWonderCell[];
      if (!cells.length) continue;
      const first = cells[0];
      const hasAB = cells.some((c) => c.actualA !== undefined && c.actualB !== undefined);
      const A = cells.reduce((s2, c) => s2 + (c.actualA ?? 0), 0);
      const B = cells.reduce((s2, c) => s2 + (c.actualB ?? 0), 0);
      const hasAppr = cells.some((c) => c.appraisalA !== undefined);
      const apprA = cells.reduce((s2, c) => s2 + (c.appraisalA ?? 0), 0);
      const apprBVals = cells.filter((c) => c.appraisalB !== undefined);
      const apprB = apprBVals.reduce((s2, c) => s2 + (c.appraisalB ?? 0), 0);
      if (isPercentCalc(first.calcType)) {
        const rate = hasAB && B > 0 ? (A / B) * 100 : 0;
        wonders[p.id] = {
          actual: rate,
          target: first.target,
          achPercent: rate,
          calcType: first.calcType,
          ...(hasAB ? { actualA: A, actualB: B } : {}),
          ...(hasAppr ? { appraisalA: apprA } : {}),
          ...(apprBVals.length ? { appraisalB: apprB } : {}),
        };
      } else {
        const actual = cells.reduce((s2, c) => s2 + (c.actual || 0), 0);
        const target = cells.reduce((s2, c) => s2 + (c.target || 0), 0);
        wonders[p.id] = {
          actual,
          target,
          achPercent: target > 0 ? (actual / target) * 100 : 0,
          calcType: first.calcType,
          ...(hasAB ? { actualA: A, actualB: B } : {}),
        };
      }
    }
    return {
      officer: { name: "รวมทั้งหมด", branch: `${rows.length} คน` },
      cats,
      catTotal: sumCat((r) => r.catTotal),
      wonders,
    };
  }, [rows, categories, presets]);

  // ช่องยอดขายตามหมวด: เป้า / ยอดจริง / %ถึงเป้า (3 บรรทัดกะทัดรัด)
  const renderCatCell = (cell: CombinedCatCell | undefined, isTotal = false) => {
    if (!cell) return <span className="text-white/25">—</span>;
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="text-[11px] text-white/35 tabular-nums">
          {cell.target > 0 ? fmtCompact(cell.target) : "—"}
        </span>
        <span className={`font-mono tabular-nums ${isTotal ? "font-semibold text-emerald-200" : "font-semibold text-white"}`}>
          {fmtCompact(cell.actual)}
        </span>
        {cell.target > 0 ? (
          <span className={`text-[11px] ${achBadgeClass(cell.achPercent)}`}>
            {fmtPct(cell.achPercent)}
          </span>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </div>
    );
  };

  // ช่อง 7 Wonders: เป้า% / ยอด A/B (หรือค่า) / %ถึงเป้า
  const renderWonderCell = (cell: CombinedWonderCell | undefined) => {
    if (!cell) return <span className="text-white/25">—</span>;
    const percentPreset = isPercentCalc(cell.calcType);
    // สีของ badge scale เทียบเป้า (actual/target*100) ให้เหมือน staff profile
    const scaled =
      percentPreset && cell.target > 0 ? (cell.actual / cell.target) * 100 : cell.achPercent;
    const actualText =
      cell.actualA !== undefined && cell.actualB !== undefined
        ? `${Math.round(cell.actualA)}/${Math.round(cell.actualB)}`
        : formatKpiCell(cell.actual, cell.calcType);
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="text-[11px] text-white/35 tabular-nums">
          {cell.target > 0 ? (percentPreset ? `${cell.target}%` : fmtCompact(cell.target)) : "—"}
        </span>
        <span className="font-mono font-semibold text-white tabular-nums">{actualText}</span>
        {cell.target > 0 ? (
          <span className={`text-[11px] ${achBadgeClass(scaled)}`}>
            {fmtPct(cell.achPercent)}
          </span>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </div>
    );
  };

  // แถวรวม: แสดงเฉพาะ % ตัวใหญ่
  const renderTotalPct = (pct: number | null | undefined, scaledForColor?: number) => {
    if (pct == null || !Number.isFinite(pct)) return <span className="text-white/25">—</span>;
    return (
      <span
        className={`inline-block text-[13px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${achBadgeClass(
          scaledForColor ?? pct,
        )}`}
      >
        {fmtPct(pct)}
      </span>
    );
  };
  const totalCatPct = (c: CombinedCatCell | undefined) => (c && c.target > 0 ? c.achPercent : null);
  const totalWonderPct = (w: CombinedWonderCell | undefined) => {
    if (!w) return { pct: null as number | null, scaled: undefined as number | undefined };
    const pctPreset = isPercentCalc(w.calcType);
    if (!pctPreset && !(w.target > 0)) return { pct: null, scaled: undefined };
    return {
      pct: w.achPercent,
      scaled: pctPreset && w.target > 0 ? (w.actual / w.target) * 100 : w.achPercent,
    };
  };

  return (
    <div className="bg-white/10 rounded-2xl border border-white/10 p-3  overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            ยอดขายตามหมวด + 7 Wonders รายคน
          </h2>
          <p className="text-[11px] text-white/45">
            แต่ละช่อง: บนสุด = เป้า · กลาง = ยอดจริง (7 Wonders = จำนวนที่แนบ/ฐาน) · ล่าง = % ถึงเป้า
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-8">
          ยังไม่มีข้อมูลเจ้าหน้าที่ — กรุณาอัปโหลดไฟล์ Current
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0c3123] border-b border-emerald-500/10 text-white/70">
                <th className="py-1 px-1 sticky left-0 bg-[#0c3123] z-10" />
                {categories.length > 0 ? (
                  <th
                    colSpan={categories.length + 1}
                    className="py-1 px-1 text-center text-[11px] font-semibold text-emerald-300/80 border-l border-white/10"
                  >
                    ยอดขายตามหมวด
                  </th>
                ) : null}
                {presets.length > 0 ? (
                  <th
                    colSpan={presets.length + extraTradeCols}
                    className="py-1 px-1 text-center text-[11px] font-semibold text-amber-300/80 border-l border-white/10"
                  >
                    7 Wonders
                  </th>
                ) : null}
                {hasCsat ? (
                  <th className="py-1 px-1 text-center text-[11px] font-semibold text-sky-300/80 border-l border-white/10">
                    CSAT
                  </th>
                ) : null}
              </tr>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th
                  rowSpan={rs}
                  onClick={() => onSort("name")}
                  className="py-1.5 px-1 font-semibold sticky left-0 bg-[#0c3123] z-10 min-w-[84px] cursor-pointer select-none hover:text-white align-bottom"
                >
                  เจ้าหน้าที่{arrow("name")}
                </th>
                {categories.map((cat, i) => (
                  <th
                    key={cat}
                    rowSpan={rs}
                    onClick={() => onSort(`cat:${cat}`)}
                    className={`py-1.5 px-1 font-semibold   text-right min-w-[42px] cursor-pointer select-none hover:text-white align-bottom ${i === 0 ? "border-l border-white/10" : ""}`}
                  >
                    {cat}{arrow(`cat:${cat}`)}
                  </th>
                ))}
                <th
                  rowSpan={rs}
                  onClick={() => onSort("total")}
                  className="py-1.5 px-1 font-semibold text-right min-w-[48px] text-emerald-300 bg-emerald-500/5 cursor-pointer select-none hover:text-emerald-200 align-bottom"
                >
                  Total{arrow("total")}
                </th>
                {presets.map((p, i) => {
                  if (isSplit(p)) {
                    return (
                      <th
                        key={p.id}
                        colSpan={2}
                        className={`py-1.5 px-1 font-semibold   text-center text-teal-300 ${i === 0 ? "border-l border-white/10" : ""}`}
                      >
                        {splitLabel(p).group}
                      </th>
                    );
                  }
                  return (
                    <th
                      key={p.id}
                      rowSpan={rs}
                      onClick={() => onSort(`w:${p.id}`)}
                      className={`py-1.5 px-1 font-semibold   text-right min-w-[46px] cursor-pointer select-none hover:text-white align-bottom ${i === 0 ? "border-l border-white/10" : ""}`}
                      title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorDotClass(p.color)}`} />
                        <span className="truncate max-w-[80px]">
                          {shortWonderName(p.name)}
                          {arrow(`w:${p.id}`)}
                        </span>
                      </div>
                    </th>
                  );
                })}
                {hasCsat ? (
                  <th
                    rowSpan={rs}
                    onClick={() => onSort("csat")}
                    className="py-1.5 px-1 font-semibold text-right min-w-[58px] text-sky-300 border-l border-white/10 cursor-pointer select-none hover:text-sky-200 align-bottom"
                  >
                    <div>CSAT{arrow("csat")}</div>
                    <div className="text-[11px] text-white/40 font-normal normal-case">
                      (คะแนน · ตอบ/บิล)
                    </div>
                  </th>
                ) : null}
              </tr>
              {extraTradeCols > 0 ? (
                <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                  {presets.map((p) =>
                    isSplit(p)
                      ? [
                          <th
                            key={p.id}
                            onClick={() => onSort(`w:${p.id}`)}
                            className="py-1 px-1 font-semibold text-right min-w-[46px] cursor-pointer select-none hover:text-white border-l border-white/10"
                            title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                          >
                            {splitLabel(p).primary}{arrow(`w:${p.id}`)}
                          </th>,
                          <th
                            key={`${p.id}-appr`}
                            onClick={() => onSort(`wA:${p.id}`)}
                            className="py-1 px-1 font-semibold text-right min-w-[46px] cursor-pointer select-none hover:text-white"
                            title={
                              /ufund/i.test(p.name)
                                ? "ยอดยื่น/อนุมัติ (uFund) — อนุมัติ ÷ ยอดยื่น"
                                : "ยอดประเมิน (รายการเทรดทั้งหมด) ÷ iPhone ที่ขายได้"
                            }
                          >
                            {splitLabel(p).appr}{arrow(`wA:${p.id}`)}
                          </th>,
                        ]
                      : null,
                  )}
                </tr>
              ) : null}
            </thead>
            <tbody>
              {[{ row: totalRow, isTotal: true }, ...sortedRows.map((r) => ({ row: r, isTotal: false }))].map(({ row, isTotal }, idx) => (
                <tr
                  key={`${row.officer.name}-${idx}`}
                  className={
                    isTotal
                      ? "total-row border-y-2 border-amber-400/70 bg-amber-400/20 "
                      : "border-b border-white/5 hover:bg-white/5 transition-colors"
                  }
                >
                  <td
                    className={`py-1 px-1 sticky left-0 z-10 ${
                      isTotal ? "total-sticky bg-[#4a3c10] " : "bg-[#0a1f17]"
                    }`}
                  >
                    <div className={`truncate max-w-[84px] ${isTotal ? "text-[11px] font-semibold text-amber-200" : "font-medium text-white"}`}>
                      {isTotal ? "Σ " : ""}{row.officer.name}
                    </div>
                    <div className="text-[11px] text-white/40 truncate max-w-[84px]">{row.officer.branch || "-"}</div>
                  </td>
                  {categories.map((cat, i) => (
                    <td
                      key={cat}
                      className={`py-1 px-1 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                    >
                      {isTotal ? renderTotalPct(totalCatPct(row.cats[cat])) : renderCatCell(row.cats[cat])}
                    </td>
                  ))}
                  <td className="py-1 px-1 text-right align-top bg-emerald-500/5">
                    {isTotal ? renderTotalPct(totalCatPct(row.catTotal)) : renderCatCell(row.catTotal, true)}
                  </td>
                  {presets.map((p, i) => {
                    const td = (
                      <td
                        key={p.id}
                        className={`py-1 px-1 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                      >
                        {isTotal
                          ? (() => {
                              const t = totalWonderPct(row.wonders[p.id]);
                              return renderTotalPct(t.pct, t.scaled);
                            })()
                          : renderWonderCell(row.wonders[p.id])}
                      </td>
                    );
                    if (!isSplit(p)) return td;
                    return [
                      td,
                      <td
                        key={`${p.id}-appr`}
                        className="py-1 px-1 text-right align-top"
                      >
                        {isTotal
                          ? (() => {
                              const w = row.wonders[p.id];
                              if (/ufund/i.test(p.name)) {
                                const tot = w?.appraisalB ?? 0;
                                return renderTotalPct(tot > 0 ? ((w?.appraisalA ?? 0) / tot) * 100 : null);
                              }
                              const a = apprCell(w);
                              return renderTotalPct(a ? a.achPercent : null, a && a.target > 0 ? (a.actual / a.target) * 100 : undefined);
                            })()
                          : /ufund/i.test(p.name)
                            ? renderUfundApprCell(row.wonders[p.id])
                            : renderWonderCell(apprCell(row.wonders[p.id]))}
                      </td>,
                    ];
                  })}
                  {hasCsat ? (
                    <td className="py-1 px-1 text-right align-top border-l border-white/5">
                      {row.csat && row.csat.score !== null ? (
                        <div className="flex flex-col items-end gap-0.5 leading-none">
                          <span
                            className={`font-mono font-semibold tabular-nums ${
                              row.csat.score >= 4.5
                                ? "text-green-400"
                                : row.csat.score >= 4
                                  ? "text-amber-400"
                                  : "text-rose-400"
                            }`}
                          >
                            {row.csat.score.toFixed(2)}
                            <span className="text-white/30 font-normal">/{row.csat.maxScore}</span>
                          </span>
                          <span className="text-[11px] text-white/40 tabular-nums">
                            ตอบ {row.csat.responseCount}
                            {row.csat.billCount > 0
                              ? `/${row.csat.billCount} (${((row.csat.responseCount / row.csat.billCount) * 100).toFixed(0)}%)`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** การ์ด CSAT ทั้งร้าน (NPS / คะแนนเฉลี่ย / อัตราการตอบแบบสอบถาม) */
function CsatStoreCard({ overview }: { overview: CsatOverview }) {
  const npsClass =
    overview.npsScore >= 70
      ? "text-green-400"
      : overview.npsScore >= 30
        ? "text-amber-400"
        : "text-rose-400";
  const respClass =
    overview.submitBillPercent >= overview.targetBillPercent
      ? "text-green-400"
      : "text-amber-400";
  return (
    <div className="bg-white/10 rounded-2xl border border-white/10 p-4 ">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
          <Smile className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            CSAT ทั้งร้าน
          </h2>
          <p className="text-[11px] text-white/45">
            ผลสำรวจความพึงพอใจของลูกค้า (COM7 CSAT) — เดือนปัจจุบัน
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[11px] text-white/50 mb-1">NPS</div>
          <div className={`text-2xl font-semibold tabular-nums ${npsClass}`}>
            {overview.npsScore.toFixed(2)}
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            P {overview.promoters.count} · Pa {overview.passives.count} · D{" "}
            {overview.detractors.count}
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[11px] text-white/50 mb-1">คะแนนเฉลี่ย</div>
          <div className="text-2xl font-semibold tabular-nums text-white">
            {overview.avgScore.toFixed(1)}
            <span className="text-sm text-white/40">/{overview.maxScore}</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[11px] text-white/50 mb-1">อัตราการตอบ</div>
          <div className={`text-2xl font-semibold tabular-nums ${respClass}`}>
            {overview.submitBillPercent.toFixed(1)}%
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            เป้า {overview.targetBillPercent}%
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[11px] text-white/50 mb-1">
            จำนวนตอบ / บิลทั้งหมด
          </div>
          <div className="text-2xl font-semibold tabular-nums text-white">
            {overview.submitBill}
            <span className="text-sm text-white/40">/{overview.totalBill}</span>
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            เป้า {overview.targetBill} ครั้ง
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CSAT drill-down: บิลที่ได้คะแนนไม่เต็ม — เห็นว่าใคร/เมื่อไหร่/จุดบริการไหน
 * ที่ลูกค้าให้คะแนนต่ำ เพื่อตามโค้ชได้ตรงจุด
 */
function CsatLowScoresCard({ items }: { items: CsatLowScore[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? items : items.slice(0, 6);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
    }) + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-white/10 rounded-2xl border border-amber-400/20 p-4 ">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
          <TrendingDown className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">
            CSAT คะแนนไม่เต็ม ({items.length})
          </h2>
          <p className="text-[11px] text-white/45">
            บิลที่ลูกค้าให้คะแนนต่ำกว่าเต็ม — ดูจุดบริการที่ควรปรับ เพื่อโค้ชรายคน
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/80">
              <th className="py-2 px-3 font-semibold min-w-[120px]">วันที่</th>
              <th className="py-2 px-3 font-semibold min-w-[130px]">พนักงาน</th>
              <th className="py-2 px-3 font-semibold text-center">คะแนน</th>
              <th className="py-2 px-3 font-semibold min-w-[200px]">จุดที่ควรปรับ</th>
              <th className="py-2 px-3 font-semibold min-w-[90px]">บิล</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s, i) => (
              <tr key={`${s.billId}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2 px-3 text-white/70 whitespace-nowrap">{fmtDate(s.submittedAt)}</td>
                <td className="py-2 px-3 font-medium text-white">{s.staffName || "-"}</td>
                <td className="py-2 px-3 text-center">
                  <span className="font-mono font-semibold text-amber-300">
                    {s.score}
                    <span className="text-white/30 font-normal">/{s.maxScore}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-white/80">
                  {s.weakAspects.length > 0 ? s.weakAspects.join(", ") : "—"}
                </td>
                <td className="py-2 px-3 text-white/40 font-mono text-[11px]">{s.billId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length > 6 ? (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[11px] text-amber-300 hover:text-amber-200 font-medium"
        >
          {expanded ? "ย่อลง" : `ดูทั้งหมด (${items.length})`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Pace-to-target banner: compares month-to-date sales against the linear
 * pace needed to hit the monthly target, and shows how much per day is
 * needed for the rest of the month + a simple end-of-month projection.
 */
function PaceBanner({
  actual,
  target,
  currentDay,
  totalDays,
}: {
  actual: number;
  target: number;
  currentDay: number;
  totalDays: number;
}) {
  const day = Math.max(1, Math.min(currentDay, totalDays));
  const expectedByNow = target * (day / totalDays);
  const diffPct = expectedByNow > 0 ? (actual / expectedByNow) * 100 - 100 : 0;
  const onTrack = actual >= expectedByNow;
  const remainingDays = Math.max(0, totalDays - day);
  const remainingAmount = Math.max(0, target - actual);
  const neededPerDay = remainingDays > 0 ? remainingAmount / remainingDays : remainingAmount;
  const projected = day > 0 ? (actual / day) * totalDays : 0;
  const projectedPct = target > 0 ? (projected / target) * 100 : 0;

  const fmt = (n: number) => `฿${Math.round(n).toLocaleString()}`;

  const achPct = target > 0 ? (actual / target) * 100 : 0;
  const expectedPct = (day / totalDays) * 100;
  const tone = onTrack
    ? { fill: "bg-emerald-400", head: "text-emerald-300" }
    : diffPct > -10
      ? { fill: "bg-amber-400", head: "text-amber-300" }
      : { fill: "bg-rose-400", head: "text-rose-300" };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[13px] text-white/55">ยอดสะสมเดือนนี้ · วันที่ {day} จาก {totalDays}</div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span className="text-4xl md:text-5xl font-semibold text-white">{fmt(actual)}</span>
            <span className="text-lg text-white/40">/ {fmt(target)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl md:text-3xl font-semibold tabular-nums ${tone.head}`}>{achPct.toFixed(0)}%</div>
          <div className={`text-[13px] ${tone.head}`}>
            {onTrack ? `นำเป้า ${Math.abs(diffPct).toFixed(0)}%` : `ช้ากว่าเป้า ${Math.abs(diffPct).toFixed(0)}%`}
          </div>
        </div>
      </div>

      {/* แถบความคืบหน้า + ขีด "ควรถึงวันนี้" */}
      <div className="relative mt-4 mb-6">
        <div className="h-3 rounded-full pace-track bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${Math.min(achPct, 100)}%` }} />
        </div>
        <div className="absolute -top-1 h-5 w-0.5 rounded pace-tick bg-white" style={{ left: `calc(${Math.min(expectedPct, 100)}% - 1px)` }} />
        <div
          className="absolute top-5 text-[11px] text-white/55 whitespace-nowrap -translate-x-1/2"
          style={{ left: `${Math.min(Math.max(expectedPct, 8), 92)}%` }}
        >
          ควรถึงวันนี้ {fmt(expectedByNow)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 pt-3 border-t border-white/10">
        <div>
          <div className="text-[12px] text-white/50">
            ต้องทำต่อวัน {remainingDays > 0 ? `· เหลือ ${remainingDays} วัน` : "· วันสุดท้าย"}
          </div>
          <div className="text-base font-semibold text-white tabular-nums">
            {remainingAmount > 0 ? fmt(neededPerDay) : "ถึงเป้าแล้ว"}
          </div>
        </div>
        <div>
          <div className="text-[12px] text-white/50">คาดจบเดือน</div>
          <div className="text-base font-semibold text-white tabular-nums">
            {projectedPct.toFixed(0)}% <span className="text-white/40 font-normal text-[13px]">({fmt(projected)})</span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[12px] text-white/50">ยังขาดอีก</div>
          <div className="text-base font-semibold text-white tabular-nums">{fmt(remainingAmount)}</div>
        </div>
      </div>
    </div>
  );
}
