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

export function HomeDashboardSection({
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
        <div className="rounded-xl border border-white/10">
          <table className="w-full text-left border-collapse text-[11px] table-fixed">
            <thead>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th className="py-2.5 px-2 font-bold uppercase tracking-wider w-[140px]">
                  เจ้าหน้าที่
                </th>
                <th className="py-2.5 px-2 font-bold uppercase tracking-wider w-[100px]">
                  สาขา
                </th>
                {presets.map((p) => (
                  <th
                    key={p.id}
                    className="py-2.5 px-2 font-bold uppercase tracking-wider text-right"
                    title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${colorDotClass(p.color)}`} />
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
                  <td className="py-2 px-2 font-medium text-white truncate" title={row.officer.name}>
                    {row.officer.name}
                  </td>
                  <td className="py-2 px-2 text-white/70 truncate" title={row.officer.branch || ""}>
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
      )}
    </div>
  );
}
