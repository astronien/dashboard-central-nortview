import React from "react";
import { TrendingUp, TrendingDown, Building2, User } from "lucide-react";
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

export type CombinedOfficerCell = { actual: number; target: number; achPercent: number };

export type CombinedOfficerRow = {
  officer: { name: string; branch: string; staffId?: string };
  cats: Record<string, CombinedOfficerCell>;
  catTotal: CombinedOfficerCell;
  wonders: Record<string, CombinedOfficerCell>;
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
  categorySnapshotRef,
  captureRef,
}: {
  derivedHomeStats: DerivedHomeStat[];
  monthlyPerformance: MonthlyPerformance;
  categorySnapshots?: CategorySnapshotItem[];
  branchOverviewKpiData?: BranchOverviewKpiData;
  combinedOfficerKpiData?: CombinedOfficerKpiData;
  categorySnapshotRef?: React.RefObject<HTMLDivElement | null>;
  /** Wraps the stat cards + Category KPI Snapshot for screenshot capture */
  captureRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div ref={captureRef} className="flex flex-col gap-6">
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
      </div>

      {branchOverviewKpiData && branchOverviewKpiData.presets.length > 0 ? (
        <BranchOverviewKpiTable data={branchOverviewKpiData} />
      ) : null}

      {combinedOfficerKpiData && combinedOfficerKpiData.rows.length > 0 ? (
        <CombinedOfficerKpiTable data={combinedOfficerKpiData} />
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
function CombinedOfficerKpiTable({ data }: { data: CombinedOfficerKpiData }) {
  const { categories, presets, rows } = data;

  const fmtBaht = (n: number) => Math.round(n).toLocaleString();

  const renderCatCell = (cell: CombinedOfficerCell | undefined) => {
    if (!cell) return <span className="text-white/30">—</span>;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono font-semibold text-white">{fmtBaht(cell.actual)}</span>
        {cell.target > 0 ? (
          <span className={`text-[9px] ${achBadgeClass(cell.achPercent)}`}>
            {cell.achPercent.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[9px] text-white/30">ไม่มีเป้า</span>
        )}
      </div>
    );
  };

  const renderWonderCell = (
    cell: CombinedOfficerCell | undefined,
    calcType: PresetCalcType | undefined,
  ) => {
    if (!cell) return <span className="text-white/30">—</span>;
    // สำหรับ preset แบบเปอร์เซ็นต์ achPercent คือ rate ดิบ — สีของ badge
    // ต้อง scale เทียบเป้า (actual/target*100) ให้เหมือน staff profile
    const isPercentPreset =
      calcType === "attach" ||
      calcType === "bahtRate" ||
      calcType === "catAttach" ||
      calcType === "tradeIn";
    const scaled =
      isPercentPreset && cell.target > 0
        ? (cell.actual / cell.target) * 100
        : cell.achPercent;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono font-semibold text-white">
          {formatKpiCell(cell.actual, calcType)}
        </span>
        {cell.target > 0 ? (
          <span className={`text-[9px] ${achBadgeClass(scaled)}`}>
            {cell.achPercent.toFixed(1)}%
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            ยอดขายตามหมวด + 7 Wonders รายคน
          </h2>
          <p className="text-[11px] text-white/50">
            ยอดขายจริงแยกตามหมวด (พร้อม % ถึงเป้า) และค่า 7 Wonders ของเจ้าหน้าที่แต่ละคน
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
                <th className="py-2 px-3 sticky left-0 bg-[#0c3123] z-10" />
                {categories.length > 0 ? (
                  <th
                    colSpan={categories.length + 1}
                    className="py-2 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-300/80 border-l border-white/10"
                  >
                    ยอดขายตามหมวด
                  </th>
                ) : null}
                {presets.length > 0 ? (
                  <th
                    colSpan={presets.length}
                    className="py-2 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-amber-300/80 border-l border-white/10"
                  >
                    7 Wonders
                  </th>
                ) : null}
              </tr>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th className="py-3 px-3 font-bold uppercase tracking-wider sticky left-0 bg-[#0c3123] z-10 min-w-[160px]">
                  เจ้าหน้าที่
                </th>
                {categories.map((cat, i) => (
                  <th
                    key={cat}
                    className={`py-3 px-3 font-bold uppercase tracking-wider text-right min-w-[100px] ${i === 0 ? "border-l border-white/10" : ""}`}
                  >
                    {cat}
                  </th>
                ))}
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-right min-w-[110px] text-emerald-300">
                  Total
                </th>
                {presets.map((p, i) => (
                  <th
                    key={p.id}
                    className={`py-3 px-3 font-bold uppercase tracking-wider text-right min-w-[110px] ${i === 0 ? "border-l border-white/10" : ""}`}
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
                  <td className="py-2.5 px-3 sticky left-0 bg-[#0a1f17] z-10">
                    <div className="font-medium text-white">{row.officer.name}</div>
                    <div className="text-[9px] text-white/40">{row.officer.branch || "-"}</div>
                  </td>
                  {categories.map((cat, i) => (
                    <td
                      key={cat}
                      className={`py-2.5 px-3 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                    >
                      {renderCatCell(row.cats[cat])}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right align-top bg-emerald-500/5">
                    {renderCatCell(row.catTotal)}
                  </td>
                  {presets.map((p, i) => (
                    <td
                      key={p.id}
                      className={`py-2.5 px-3 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}
                    >
                      {renderWonderCell(row.wonders[p.id], p.calcType)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
