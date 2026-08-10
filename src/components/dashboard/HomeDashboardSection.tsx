import React from "react";
import { TrendingUp, TrendingDown, Building2, User, Smile, Gauge } from "lucide-react";
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {derivedHomeStats.map((stat, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col justify-between hover:bg-white/[0.15] transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5"><stat.icon className="w-5 h-5 text-emerald-400" /></div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${stat.isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"} flex items-center gap-1`}>
                  {stat.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stat.trend}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60 mb-1">{stat.label}</div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </div>
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
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
          <User className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
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
                <th className="py-3 px-3 font-bold uppercase tracking-wider sticky left-0 bg-[#0c3123] z-10 min-w-[160px]">
                  เจ้าหน้าที่
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider min-w-[120px]">
                  สาขา
                </th>
                {presets.map((p) => (
                  <th
                    key={p.id}
                    className="py-3 px-3 font-bold uppercase tracking-wider text-right min-w-[120px]"
                    title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${colorDotClass(p.color)}`} />
                      <span>{p.name}</span>
                    </div>
                    <div className="text-[9px] text-white/40 font-normal normal-case mt-0.5">
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
                  <td className="py-2.5 px-3 text-white/70">{row.officer.branch || "-"}</td>
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

const achBadgeClass = (rate: number): string => {
  if (rate >= 100)
    return "bg-green-500/20 text-green-400 font-bold px-1 py-0.5 rounded border border-green-500/20";
  if (rate >= 80)
    return "bg-amber-500/20 text-amber-400 font-bold px-1 py-0.5 rounded border border-amber-500/20";
  return "bg-rose-500/20 text-rose-400 font-bold px-1 py-0.5 rounded border border-rose-500/20";
};

/**
 * ตารางรวมหน้า Home: ยอดขายแยกตามหมวด (เหมือน staff profile) + 7 Wonders
 * ทั้งหมดในตารางเดียว ลิสต์เป็นรายเจ้าหน้าที่
 */
const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}K`;
  return Math.round(n).toLocaleString();
};

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
        ? "bg-green-500/20 text-green-400 font-bold px-1 py-0.5 rounded border border-green-500/20"
        : rate >= 25
          ? "bg-amber-500/20 text-amber-400 font-bold px-1 py-0.5 rounded border border-amber-500/20"
          : "bg-rose-500/20 text-rose-400 font-bold px-1 py-0.5 rounded border border-rose-500/20";
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="font-mono font-semibold text-white tabular-nums">
          {Math.round(approved)}/{Math.round(total)}
        </span>
        {total > 0 ? (
          <span className={`text-[8px] ${cls}`}>{rate.toFixed(0)}%</span>
        ) : (
          <span className="text-[8px] text-white/25">—</span>
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

  // ช่องยอดขายตามหมวด: เป้า / ยอดจริง / %ถึงเป้า (3 บรรทัดกะทัดรัด)
  const renderCatCell = (cell: CombinedCatCell | undefined, isTotal = false) => {
    if (!cell) return <span className="text-white/25">—</span>;
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="text-[8px] text-white/35 tabular-nums">
          {cell.target > 0 ? fmtCompact(cell.target) : "—"}
        </span>
        <span className={`font-mono tabular-nums ${isTotal ? "font-bold text-emerald-200" : "font-semibold text-white"}`}>
          {fmtCompact(cell.actual)}
        </span>
        {cell.target > 0 ? (
          <span className={`text-[8px] ${achBadgeClass(cell.achPercent)}`}>
            {cell.achPercent.toFixed(0)}%
          </span>
        ) : (
          <span className="text-[8px] text-white/25">—</span>
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
        <span className="text-[8px] text-white/35 tabular-nums">
          {cell.target > 0 ? (percentPreset ? `${cell.target}%` : fmtCompact(cell.target)) : "—"}
        </span>
        <span className="font-mono font-semibold text-white tabular-nums">{actualText}</span>
        {cell.target > 0 ? (
          <span className={`text-[8px] ${achBadgeClass(scaled)}`}>
            {cell.achPercent.toFixed(0)}%
          </span>
        ) : (
          <span className="text-[8px] text-white/25">—</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            ยอดขายตามหมวด + 7 Wonders รายคน
          </h2>
          <p className="text-[10px] text-white/45">
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
          <table className="w-full text-left border-collapse text-[9px]">
            <thead>
              <tr className="bg-[#0c3123] border-b border-emerald-500/10 text-white/70">
                <th className="py-1 px-1 sticky left-0 bg-[#0c3123] z-10" />
                {categories.length > 0 ? (
                  <th
                    colSpan={categories.length + 1}
                    className="py-1 px-1 text-center text-[9px] font-bold uppercase tracking-widest text-emerald-300/80 border-l border-white/10"
                  >
                    ยอดขายตามหมวด
                  </th>
                ) : null}
                {presets.length > 0 ? (
                  <th
                    colSpan={presets.length + extraTradeCols}
                    className="py-1 px-1 text-center text-[9px] font-bold uppercase tracking-widest text-amber-300/80 border-l border-white/10"
                  >
                    7 Wonders
                  </th>
                ) : null}
                {hasCsat ? (
                  <th className="py-1 px-1 text-center text-[9px] font-bold uppercase tracking-widest text-sky-300/80 border-l border-white/10">
                    CSAT
                  </th>
                ) : null}
              </tr>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th
                  rowSpan={rs}
                  onClick={() => onSort("name")}
                  className="py-1.5 px-1 font-bold uppercase tracking-wider sticky left-0 bg-[#0c3123] z-10 min-w-[84px] cursor-pointer select-none hover:text-white align-bottom"
                >
                  เจ้าหน้าที่{arrow("name")}
                </th>
                {categories.map((cat, i) => (
                  <th
                    key={cat}
                    rowSpan={rs}
                    onClick={() => onSort(`cat:${cat}`)}
                    className={`py-1.5 px-1 font-bold uppercase tracking-wide text-right min-w-[42px] cursor-pointer select-none hover:text-white align-bottom ${i === 0 ? "border-l border-white/10" : ""}`}
                  >
                    {cat}{arrow(`cat:${cat}`)}
                  </th>
                ))}
                <th
                  rowSpan={rs}
                  onClick={() => onSort("total")}
                  className="py-1.5 px-1 font-bold uppercase tracking-wide text-right min-w-[48px] text-emerald-300 bg-emerald-500/5 cursor-pointer select-none hover:text-emerald-200 align-bottom"
                >
                  Total{arrow("total")}
                </th>
                {presets.map((p, i) => {
                  if (isSplit(p)) {
                    return (
                      <th
                        key={p.id}
                        colSpan={2}
                        className={`py-1.5 px-1 font-bold uppercase tracking-wide text-center text-teal-300 ${i === 0 ? "border-l border-white/10" : ""}`}
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
                      className={`py-1.5 px-1 font-bold uppercase tracking-wide text-right min-w-[46px] cursor-pointer select-none hover:text-white align-bottom ${i === 0 ? "border-l border-white/10" : ""}`}
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
                    className="py-1.5 px-1 font-bold uppercase tracking-wide text-right min-w-[58px] text-sky-300 border-l border-white/10 cursor-pointer select-none hover:text-sky-200 align-bottom"
                  >
                    <div>CSAT{arrow("csat")}</div>
                    <div className="text-[8px] text-white/40 font-normal normal-case">
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
                            className="py-1 px-1 font-bold uppercase tracking-wide text-right min-w-[46px] cursor-pointer select-none hover:text-white border-l border-white/10"
                            title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                          >
                            {splitLabel(p).primary}{arrow(`w:${p.id}`)}
                          </th>,
                          <th
                            key={`${p.id}-appr`}
                            onClick={() => onSort(`wA:${p.id}`)}
                            className="py-1 px-1 font-bold uppercase tracking-wide text-right min-w-[46px] cursor-pointer select-none hover:text-white"
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
              {sortedRows.map((row, idx) => (
                <tr
                  key={`${row.officer.name}-${idx}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-1 px-1 sticky left-0 bg-[#0a1f17] z-10">
                    <div className="font-medium text-white truncate max-w-[84px]">{row.officer.name}</div>
                    <div className="text-[8px] text-white/40 truncate max-w-[84px]">{row.officer.branch || "-"}</div>
                  </td>
                  {categories.map((cat, i) => (
                    <td
                      key={cat}
                      className={`py-1 px-1 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                    >
                      {renderCatCell(row.cats[cat])}
                    </td>
                  ))}
                  <td className="py-1 px-1 text-right align-top bg-emerald-500/5">
                    {renderCatCell(row.catTotal, true)}
                  </td>
                  {presets.map((p, i) => {
                    const td = (
                      <td
                        key={p.id}
                        className={`py-1 px-1 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                      >
                        {renderWonderCell(row.wonders[p.id])}
                      </td>
                    );
                    if (!isSplit(p)) return td;
                    return [
                      td,
                      <td
                        key={`${p.id}-appr`}
                        className="py-1 px-1 text-right align-top"
                      >
                        {/ufund/i.test(p.name)
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
                          <span className="text-[8px] text-white/40 tabular-nums">
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
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
          <Smile className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            CSAT ทั้งร้าน
          </h2>
          <p className="text-[10px] text-white/45">
            ผลสำรวจความพึงพอใจของลูกค้า (COM7 CSAT) — เดือนปัจจุบัน
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[10px] text-white/50 mb-1">NPS</div>
          <div className={`text-2xl font-bold tabular-nums ${npsClass}`}>
            {overview.npsScore.toFixed(2)}
          </div>
          <div className="text-[9px] text-white/40 mt-1">
            P {overview.promoters.count} · Pa {overview.passives.count} · D{" "}
            {overview.detractors.count}
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[10px] text-white/50 mb-1">คะแนนเฉลี่ย</div>
          <div className="text-2xl font-bold tabular-nums text-white">
            {overview.avgScore.toFixed(1)}
            <span className="text-sm text-white/40">/{overview.maxScore}</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[10px] text-white/50 mb-1">อัตราการตอบ</div>
          <div className={`text-2xl font-bold tabular-nums ${respClass}`}>
            {overview.submitBillPercent.toFixed(1)}%
          </div>
          <div className="text-[9px] text-white/40 mt-1">
            เป้า {overview.targetBillPercent}%
          </div>
        </div>
        <div className="bg-black/20 rounded-xl border border-white/5 p-3 text-center">
          <div className="text-[10px] text-white/50 mb-1">
            จำนวนตอบ / บิลทั้งหมด
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">
            {overview.submitBill}
            <span className="text-sm text-white/40">/{overview.totalBill}</span>
          </div>
          <div className="text-[9px] text-white/40 mt-1">
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
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-amber-400/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
          <TrendingDown className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            CSAT คะแนนไม่เต็ม ({items.length})
          </h2>
          <p className="text-[10px] text-white/45">
            บิลที่ลูกค้าให้คะแนนต่ำกว่าเต็ม — ดูจุดบริการที่ควรปรับ เพื่อโค้ชรายคน
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/80">
              <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[120px]">วันที่</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[130px]">พนักงาน</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wide text-center">คะแนน</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[200px]">จุดที่ควรปรับ</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[90px]">บิล</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s, i) => (
              <tr key={`${s.billId}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2 px-3 text-white/70 whitespace-nowrap">{fmtDate(s.submittedAt)}</td>
                <td className="py-2 px-3 font-medium text-white">{s.staffName || "-"}</td>
                <td className="py-2 px-3 text-center">
                  <span className="font-mono font-bold text-amber-300">
                    {s.score}
                    <span className="text-white/30 font-normal">/{s.maxScore}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-white/80">
                  {s.weakAspects.length > 0 ? s.weakAspects.join(", ") : "—"}
                </td>
                <td className="py-2 px-3 text-white/40 font-mono text-[10px]">{s.billId}</td>
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

  const tone = onTrack
    ? { bar: "border-emerald-400/30 bg-emerald-500/10", head: "text-emerald-300", icon: "text-emerald-400" }
    : diffPct > -10
      ? { bar: "border-amber-400/30 bg-amber-500/10", head: "text-amber-300", icon: "text-amber-400" }
      : { bar: "border-rose-400/30 bg-rose-500/10", head: "text-rose-300", icon: "text-rose-400" };

  return (
    <div className={`rounded-2xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${tone.bar}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 lg:min-w-[280px]">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <Gauge className={`w-6 h-6 ${tone.icon}`} />
          </div>
          <div>
            <div className={`text-lg font-bold tracking-tight ${tone.head}`}>
              {onTrack
                ? `ตามเป้าอยู่ (+${Math.abs(diffPct).toFixed(0)}%)`
                : `ช้ากว่าเป้า ${Math.abs(diffPct).toFixed(0)}%`}
            </div>
            <div className="text-[11px] text-white/50">
              วันที่ {day}/{totalDays} ของเดือน · ควรทำได้ถึง {fmt(expectedByNow)} แล้ว
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <div className="bg-black/20 rounded-xl border border-white/5 px-3 py-2">
            <div className="text-[10px] text-white/50">ยอดสะสม / เป้า</div>
            <div className="text-sm font-bold text-white tabular-nums">
              {fmt(actual)}<span className="text-white/40 font-normal"> / {fmt(target)}</span>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl border border-white/5 px-3 py-2">
            <div className="text-[10px] text-white/50">
              ต้องทำอีกวันละ {remainingDays > 0 ? `(เหลือ ${remainingDays} วัน)` : "(วันสุดท้าย)"}
            </div>
            <div className={`text-sm font-bold tabular-nums ${tone.head}`}>
              {remainingAmount > 0 ? fmt(neededPerDay) : "ถึงเป้าแล้ว 🎉"}
            </div>
          </div>
          <div className="bg-black/20 rounded-xl border border-white/5 px-3 py-2 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-white/50">คาดว่าจะจบเดือนที่</div>
            <div className="text-sm font-bold text-white tabular-nums">
              {projectedPct.toFixed(0)}%
              <span className="text-white/40 font-normal"> ({fmt(projected)})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
