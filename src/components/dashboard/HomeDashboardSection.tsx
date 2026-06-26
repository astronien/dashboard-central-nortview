import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Building2, User, ChevronDown, ChevronRight, Target, BarChart3, LayoutGrid } from "lucide-react";
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

export type CategoryBreakdownRow = {
  category: string;
  target: number;
  actual: number;
  achPercent: number;
  forecast: number;
  forecastPercent: number;
  lastMonth: number;
  momPercent: number | string;
  lastYear: number;
  yoyPercent: number | string;
  targetDay: number;
  actualDay: number;
  diffDay: number;
  achDayPercent: number;
};

export type OfficerCategoryBreakdown = {
  officer: { name: string; branch: string };
  rows: CategoryBreakdownRow[];
};

export type BranchOverviewKpiData = {
  presets: Preset[];
  rows: BranchOverviewKpiRow[];
  breakdownByOfficer: Record<string, OfficerCategoryBreakdown>;
};

 const HomeDashboardSectionImpl = function HomeDashboardSection({
  derivedHomeStats,
  monthlyPerformance,
  categorySnapshots,
  branchOverviewKpiData,
}: {
  derivedHomeStats: DerivedHomeStat[];
  monthlyPerformance: MonthlyPerformance;
  categorySnapshots?: CategorySnapshotItem[];
  branchOverviewKpiData?: BranchOverviewKpiData;
}) {
  return (
    <>
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
        <CategorySnapshotSection items={categorySnapshots} />
      ) : null}

      {branchOverviewKpiData && branchOverviewKpiData.presets.length > 0 ? (
        <BranchOverviewKpiTable data={branchOverviewKpiData} />
      ) : null}
    </>
  );
};

export const HomeDashboardSection = React.memo(HomeDashboardSectionImpl);

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
    default:
      return "—";
  }
};

function BranchOverviewKpiTable({ data }: { data: BranchOverviewKpiData }) {
  const { presets, rows, breakdownByOfficer } = data;
  const breakdownEntries = useMemo(
    () => Object.values(breakdownByOfficer ?? {}),
    [breakdownByOfficer],
  );

  const [view, setView] = useState<"cards" | "summary">("cards");
  const [expandedOfficer, setExpandedOfficer] = useState<string | null>(
    breakdownEntries[0]?.officer.name ?? null,
  );

  if (rows.length === 0 && breakdownEntries.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <p className="text-sm text-white/50 text-center py-8">
          ยังไม่มีข้อมูลเจ้าหน้าที่ — กรุณาอัปโหลดไฟล์ Current
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              view === "cards"
                ? "bg-emerald-500/30 text-emerald-300"
                : "text-white/60 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Card Breakdown
          </button>
          <button
            onClick={() => setView("summary")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              view === "summary"
                ? "bg-emerald-500/30 text-emerald-300"
                : "text-white/60 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Summary Table
          </button>
        </div>
      </div>

      {/* View: Card Breakdown (default) */}
      {view === "cards" && (
        <OfficerCardsView
          breakdownEntries={breakdownEntries}
          rows={rows}
          presets={presets}
          expandedOfficer={expandedOfficer}
          setExpandedOfficer={setExpandedOfficer}
        />
      )}

      {/* View: Summary Table */}
      {view === "summary" && (
        <SummaryTableView rows={rows} presets={presets} />
      )}
    </div>
  );
}

/* ========== Officer Cards View ========== */

function OfficerCardsView({
  breakdownEntries,
  rows,
  presets,
  expandedOfficer,
  setExpandedOfficer,
}: {
  breakdownEntries: OfficerCategoryBreakdown[];
  rows: BranchOverviewKpiRow[];
  presets: Preset[];
  expandedOfficer: string | null;
  setExpandedOfficer: (name: string | null) => void;
}) {
  if (breakdownEntries.length === 0) {
    return (
      <p className="text-sm text-white/50 text-center py-8">
        ยังไม่มีข้อมูล Category Breakdown — กรุณาอัปโหลด Current + Target
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {breakdownEntries.map(({ officer, rows: catRows }) => {
        const isExpanded = expandedOfficer === officer.name;
        const presetRow = rows.find((r) => r.officer.name === officer.name);
        const visible = catRows.filter(
          (r) => r.target > 0 || r.actual > 0,
        );
        const totalRow = visible.find((r) => r.category === "Total");
        const overallAch = totalRow?.achPercent ?? 0;
        const overallColor =
          overallAch >= 100
            ? "text-emerald-400"
            : overallAch >= 80
              ? "text-amber-400"
              : "text-rose-400";

        return (
          <div
            key={officer.name}
            className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
          >
            {/* Header — clickable to expand */}
            <button
              onClick={() =>
                setExpandedOfficer(isExpanded ? null : officer.name)
              }
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {officer.name}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">
                    {officer.branch || "-"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-lg font-bold ${overallColor}`}>
                    {overallAch.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider">
                    Overall
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                )}
              </div>
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                {/* Category breakdown table */}
                <CategoryMiniTable rows={visible} />

                {/* Preset values chips */}
                {presets.length > 0 && presetRow && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {presets.map((p) => {
                      const val = presetRow.results[p.id] ?? 0;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${colorDotClass(p.color)}`}
                          />
                          <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">
                            {p.name}
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            {formatKpiCell(val, p.calcType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Compact category table for the expanded card */
function CategoryMiniTable({ rows }: { rows: CategoryBreakdownRow[] }) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="bg-emerald-500/10 text-emerald-200">
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-[10px]">
              Category
            </th>
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-right text-[10px]">
              Target
            </th>
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-right text-[10px]">
              Today
            </th>
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-right text-[10px]">
              Actual
            </th>
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-center text-[10px]">
              Ach%
            </th>
            <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-right text-[10px]">
              Forecast
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const achColor =
              r.achPercent >= 100
                ? "text-emerald-400"
                : r.achPercent >= 80
                  ? "text-amber-400"
                  : "text-rose-400";
            const isTotal = r.category === "Total";
            return (
              <tr
                key={r.category}
                className={`border-t border-white/5 ${
                  isTotal
                    ? "bg-emerald-500/10 font-bold"
                    : "hover:bg-white/5"
                }`}
              >
                <td
                  className={`py-1.5 px-2 ${isTotal ? "text-white" : "text-white/80"}`}
                >
                  {r.category}
                </td>
                <td className="py-1.5 px-2 text-right text-white/80 font-mono">
                  {r.target > 0 ? Math.round(r.target).toLocaleString() : "—"}
                </td>
                <td className="py-1.5 px-2 text-right text-emerald-300 font-mono">
                  {r.actualDay > 0
                    ? Math.round(r.actualDay).toLocaleString()
                    : "—"}
                </td>
                <td className="py-1.5 px-2 text-right text-white font-mono">
                  {r.actual > 0 ? Math.round(r.actual).toLocaleString() : "—"}
                </td>
                <td
                  className={`py-1.5 px-2 text-center font-mono font-bold ${achColor}`}
                >
                  {r.achPercent.toFixed(1)}%
                </td>
                <td className="py-1.5 px-2 text-right text-white/80 font-mono">
                  {r.forecast > 0 ? Math.round(r.forecast).toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ========== Summary Table View (existing) ========== */

function SummaryTableView({
  rows,
  presets,
}: {
  rows: BranchOverviewKpiRow[];
  presets: Preset[];
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-left border-collapse text-[11px] table-fixed">
        <thead>
          <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
            <th className="py-2.5 px-2 font-bold uppercase tracking-wider w-[160px]">
              เจ้าหน้าที่
            </th>
            <th className="py-2.5 px-2 font-bold uppercase tracking-wider w-[120px]">
              สาขา
            </th>
            {presets.map((p) => (
              <th
                key={p.id}
                className="py-2.5 px-2 font-bold uppercase tracking-wider text-right"
                title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${colorDotClass(p.color)}`}
                  />
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-[8px] text-white/40 font-normal normal-case mt-0.5">
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
              <td
                className="py-2 px-2 font-medium text-white truncate"
                title={row.officer.name}
              >
                {row.officer.name}
              </td>
              <td
                className="py-2 px-2 text-white/70 truncate"
                title={row.officer.branch || ""}
              >
                {row.officer.branch || "-"}
              </td>
              {presets.map((p) => {
                const val = row.results[p.id] ?? 0;
                return (
                  <td
                    key={p.id}
                    className="py-2 px-2 text-right font-mono font-semibold text-white"
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
  );
}
