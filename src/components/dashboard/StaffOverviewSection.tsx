import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Check, ChevronDown, SlidersHorizontal, Target, TrendingUp, Users } from "lucide-react";
import CategoryTreePicker from "../CategoryTreePicker";
import AttachTargetGroupEditor from "../AttachTargetGroupEditor";
import type { AttachTargetGroup } from "../../lib/attachRate";

const DEFAULT_ATTACH_CATEGORIES = ["Cover+", "AC+", "Pencil", "Case", "SIM"];
const ATTACH_CHART_COLORS = ["#34d399", "#2dd4bf", "#818cf8", "#f472b6", "#fbbf24"];

type AttachMatrixRow = { id: string; name: string; staffId: string; branch: string; avatar: string; baseUnits: number; rates: Record<string, number>; units: Record<string, number>; isHit: Record<string, boolean>; attachMap: Record<string, { rate: number; units: number }> };
type AttachMatrixDisplayRow = { name: string; branch: string; baseUnits: number; rates: Record<string, number>; units: Record<string, number>; isHit: Record<string, boolean>; shortName: string };
type PcZoneStat = { name: string; units: number; revenue: number; topBrands: { name: string; units: number; revenue: number }[] };
type OfficerReport = { name: string; branch: string; actual: number; target: number; rate: number; achPercent: number; forecast: number };
type CategoryTreeMap = Map<string, Set<string>>;
type WonderMetricConfig = { key: string; label: string; target: number; valueType: "rate" | "units" };

export function StaffOverviewSection(props: {
  staffCategoryTree: CategoryTreeMap;
  staffBaseCategories: string[];
  staffAttachGroups: AttachTargetGroup[];
  staffFilterBranch: string;
  staffBranchesList: string[];
  staffKpiTargets: Record<string, number>;
  selectedAttachOfficers: string[];
  attachOverviewChartData: AttachMatrixDisplayRow[];
  attachTargetCategories: string[];
  attachOverviewRows: AttachMatrixRow[];
  pcZoneStats: PcZoneStat[];
  staffAttachMatrix: AttachMatrixRow[];
  parsedOfficers: OfficerReport[];
  onToggleStaffCategory: (cat: string, isBase: boolean) => void;
  onAttachGroupsChange: (groups: AttachTargetGroup[]) => void;
  onBranchChange: (branch: string) => void;
  onSetKpi: (label: string, value: number) => void;
  onToggleOfficer: (name: string) => void;
  onOpenStaffProfile: (name: string) => void;
  formatOfficerShortName: (name: string) => string;
  matchesOfficer: (a: string, b: string) => boolean;
}) {
  const { staffCategoryTree, staffBaseCategories, staffAttachGroups, staffFilterBranch, staffBranchesList, staffKpiTargets, selectedAttachOfficers, attachOverviewChartData, attachTargetCategories, attachOverviewRows, pcZoneStats, staffAttachMatrix, parsedOfficers, onToggleStaffCategory, onAttachGroupsChange, onBranchChange, onSetKpi, onToggleOfficer, onOpenStaffProfile, formatOfficerShortName, matchesOfficer } = props;
  const [tab, setTab] = useState<"leaderboard" | "attach_builder" | "pc_zone">("leaderboard");
  const [builderOpen, setBuilderOpen] = useState(false);

  const summaryCards = useMemo(() => [
    { label: "Officers", value: parsedOfficers.length.toLocaleString(), hint: "รวมพนักงานทั้งหมด", icon: Users },
    { label: "Base Categories", value: staffBaseCategories.length.toLocaleString(), hint: "หมวดตัวหาร", icon: TrendingUp },
    { label: "Attach Groups", value: staffAttachGroups.length.toLocaleString(), hint: "กลุ่มตัวแนบ", icon: Award },
    { label: "Selected Officers", value: selectedAttachOfficers.length ? selectedAttachOfficers.length.toLocaleString() : "All", hint: "ผู้ถูกกรอง", icon: Check },
  ], [parsedOfficers.length, staffBaseCategories.length, staffAttachGroups.length, selectedAttachOfficers.length]);

  const topStaff = useMemo(() => {
    const ranked = [...parsedOfficers].sort((a, b) => b.actual - a.actual);
    const top = ranked[0];
    if (!top) return null;

    const dailyTarget = top.target > 0 ? top.target / 30 : 0;
    const dailyActual = top.actual > 0 ? top.actual / 30 : 0;
    const dailyGap = dailyTarget - dailyActual;
    const todayAch = dailyTarget > 0 ? (dailyActual / dailyTarget) * 100 : 0;

    const topAttach = staffAttachMatrix.find((row) => matchesOfficer(row.name, top.name));
    const focusAttach = topAttach
      ? Object.entries(topAttach.attachMap)
          .map(([key, value]) => ({ key, rate: value?.rate ?? 0, units: value?.units ?? 0 }))
          .sort((a, b) => b.rate - a.rate)[0]
      : null;

    return {
      ...top,
      rank: 1,
      rankLabel: "🥇",
      shortBranch: top.branch || "Unknown Branch",
      avatar: topAttach?.avatar ?? "/staff1.png",
      todayTarget: dailyTarget,
      todayActual: dailyActual,
      todayGap: dailyGap,
      todayAch,
      focusAttach,
    };
  }, [parsedOfficers, staffAttachMatrix, matchesOfficer]);

  const branchSummaryRows = useMemo(() => {
    const map = new Map<string, { branch: string; officers: number; actual: number; target: number; ach: number; forecast: number }>();
    parsedOfficers.forEach((officer) => {
      const key = officer.branch || "Unknown Branch";
      const current = map.get(key) ?? { branch: key, officers: 0, actual: 0, target: 0, ach: 0, forecast: 0 };
      current.officers += 1;
      current.actual += officer.actual;
      current.target += officer.target;
      current.forecast += officer.forecast;
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((row) => ({ ...row, ach: row.target > 0 ? (row.actual / row.target) * 100 : 0 }))
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 8);
  }, [parsedOfficers]);

  const categorySummaryRows = useMemo(() => {
    const map = new Map<string, { category: string; revenue: number; units: number; officers: Set<string> }>();
    staffAttachMatrix.forEach((row) => {
      Object.entries(row.attachMap).forEach(([category, info]) => {
        const current = map.get(category) ?? { category, revenue: 0, units: 0, officers: new Set<string>() };
        current.revenue += row.baseUnits * (info.rate / 100);
        current.units += info.units;
        current.officers.add(row.name);
        map.set(category, current);
      });
    });
    return Array.from(map.values())
      .map((row) => ({ ...row, officers: row.officers.size }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [staffAttachMatrix]);

  const kpiRadarData = useMemo(() => {
    const totalTarget = parsedOfficers.reduce((sum, officer) => sum + officer.target, 0);
    const totalActual = parsedOfficers.reduce((sum, officer) => sum + officer.actual, 0);
    const avgRate = parsedOfficers.length ? parsedOfficers.reduce((sum, officer) => sum + officer.rate, 0) / parsedOfficers.length : 0;
    const topBranchAch = branchSummaryRows[0]?.ach ?? 0;
    const topCategoryRevenue = categorySummaryRows[0]?.revenue ?? 0;
    return [
      { subject: "Avg Staff", value: Math.min(Math.round(avgRate), 100), fullMark: 100 },
      { subject: "Top Branch", value: Math.min(Math.round(topBranchAch), 100), fullMark: 100 },
      { subject: "Sales/Target", value: Math.min(totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0, 100), fullMark: 100 },
      { subject: "Category Mix", value: Math.min(Math.round(topCategoryRevenue / Math.max(totalActual, 1) * 100), 100), fullMark: 100 },
      { subject: "Attach Breadth", value: Math.min(Math.round((categorySummaryRows.length / Math.max(staffAttachGroups.length, 1)) * 100), 100), fullMark: 100 },
    ];
  }, [parsedOfficers, branchSummaryRows, categorySummaryRows, staffAttachGroups.length]);

  const wonderMetricConfigs = useMemo<WonderMetricConfig[]>(() => {
    const sourceLabels =
      staffAttachGroups.length > 0
        ? staffAttachGroups.map((group) => group.label)
        : attachTargetCategories.length > 0
          ? attachTargetCategories
          : Object.keys(staffAttachMatrix[0]?.attachMap ?? {});

    return sourceLabels.map((label) => ({
      key: label,
      label,
      target: Math.max(0, Number(staffKpiTargets[label] ?? 0)),
      valueType: "rate",
    }));
  }, [staffAttachGroups, attachTargetCategories, staffAttachMatrix, staffKpiTargets]);

  return (
    <motion.div key="staff_overview" initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex flex-col gap-6 w-full h-full">
      {topStaff && (
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 via-white/10 to-cyan-500/20 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.22),transparent_35%),radial-gradient(circle_at_left,rgba(45,212,191,0.18),transparent_30%)] pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-emerald-400/40 blur-lg" />
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10">
                <img
                  src={topStaff.avatar}
                  alt={topStaff.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#0c3123] border border-emerald-400/30 text-emerald-300 text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg">
                {topStaff.rankLabel} TOP STAFF
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80 border border-white/10">#1 Rank</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-100 border border-emerald-400/20">Highest Actual Sales</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm truncate">{topStaff.name}</h2>
              <p className="text-sm text-white/75 mt-1 truncate">{topStaff.shortBranch}</p>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Target Today</div>
                  <div className="text-lg font-black text-white">฿{Math.round(topStaff.todayTarget).toLocaleString()}</div>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Today Ach%</div>
                  <div className="text-lg font-black text-emerald-300">{topStaff.todayAch.toFixed(1)}%</div>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Top Attach / Focus KPI</div>
                  <div className="text-lg font-black text-cyan-200">{topStaff.focusAttach ? `${topStaff.focusAttach.key} ${Math.round(topStaff.focusAttach.rate)}%` : "—"}</div>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-md">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Today Gap</div>
                  <div className={`text-lg font-black ${topStaff.todayGap <= 0 ? "text-emerald-300" : "text-rose-300"}`}>฿{Math.abs(Math.round(topStaff.todayGap)).toLocaleString()} {topStaff.todayGap <= 0 ? "ahead" : "need"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative z-20 animate-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Staff Attach Rate & PC Performance</h2>
            <p className="text-xs text-white/60 mt-1">วิเคราะห์เปรียบเทียบคะแนนแนบพนักงาน ยอดขายพีซี และแบรนด์อุปกรณ์เสริมภายนอก</p>
          </div>
          <div className="flex items-center bg-black/20 border border-white/5 rounded-xl p-1 text-xs font-semibold self-stretch md:self-auto justify-center">
            {(["leaderboard", "attach_builder", "pc_zone"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-2 rounded-lg transition-all duration-200 cursor-pointer ${tab === t ? "bg-emerald-500 text-white shadow-lg font-bold" : "text-white/60 hover:text-white"}`}>
                {t === "leaderboard" ? "🏅 Staff Leaderboard" : t === "attach_builder" ? "🛠️ Attach Builder (เดิม)" : "💼 PC Zone Performance"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/45">{card.label}</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{card.value}</h3>
                </div>
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-white/55">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Performance Radar</h3>
            <p className="text-xs text-white/50">ภาพรวมจาก staff / branch / category</p>
          </div>
          <div className="text-xs text-white/50">derived benchmark</div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={kpiRadarData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
            <Radar name="Score" dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.35} />
            <RechartsTooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as { subject: string; value: number };
              return <div className="rounded-xl border border-white/10 bg-[#0c3123]/95 px-3 py-2 text-xs shadow-xl text-white">{item.subject}: {item.value}%</div>;
            }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {tab === "attach_builder" ? (
        <AttachBuilderTab {...{ staffCategoryTree, staffBaseCategories, staffAttachGroups, staffFilterBranch, staffBranchesList, staffKpiTargets, selectedAttachOfficers, attachOverviewChartData, attachTargetCategories, attachOverviewRows, builderOpen, onToggleBuilder: () => setBuilderOpen((v) => !v), onToggleStaffCategory, onAttachGroupsChange, onBranchChange, onSetKpi, onToggleOfficer, parsedOfficers }} />
      ) : tab === "pc_zone" ? (
        <PcZoneTab pcZoneStats={pcZoneStats} />
      ) : (
        <div className="space-y-6">
          <LeaderboardTab staffAttachMatrix={staffAttachMatrix} parsedOfficers={parsedOfficers} formatOfficerShortName={formatOfficerShortName} matchesOfficer={matchesOfficer} wonderMetricConfigs={wonderMetricConfigs} onOpenStaffProfile={onOpenStaffProfile} />
          <SummaryTablesSection branchSummaryRows={branchSummaryRows} categorySummaryRows={categorySummaryRows} />
        </div>
      )}
    </motion.div>
  );
}

function LeaderboardTab({ staffAttachMatrix, parsedOfficers, formatOfficerShortName, matchesOfficer, wonderMetricConfigs, onOpenStaffProfile }: { staffAttachMatrix: AttachMatrixRow[]; parsedOfficers: OfficerReport[]; formatOfficerShortName: (name: string) => string; matchesOfficer: (a: string, b: string) => boolean; wonderMetricConfigs: WonderMetricConfig[]; onOpenStaffProfile: (name: string) => void; }) {
  const highlightedMetrics = wonderMetricConfigs.slice(0, 4);

  return <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{highlightedMetrics.map((metric) => <div key={metric.key} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"><span className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-3 border-b border-white/5 pb-2">{metric.label}{metric.target > 0 ? ` tgt${metric.target}%` : ""}</span><div className="space-y-2.5">{staffAttachMatrix.map((row) => ({ name: row.name, value: metric.valueType === "units" ? (row.attachMap[metric.key]?.units || 0) : (row.attachMap[metric.key]?.rate || 0) })).sort((a, b) => b.value - a.value).slice(0, 5).map((p, idx) => <button type="button" key={`${metric.key}-${p.name}`} className="flex justify-between items-center text-xs w-full cursor-pointer" onClick={() => onOpenStaffProfile(p.name)}><span className="text-white/80 font-medium truncate max-w-[120px]">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`} {formatOfficerShortName(p.name)}</span><span className={`font-bold ${metric.target > 0 && metric.valueType === "rate" && p.value >= metric.target ? "text-emerald-400" : "text-white"}`}>{metric.valueType === "units" ? `${Math.round(p.value)} U` : `${Math.round(p.value)}%`}</span></button>)}</div></div>)}</div><div className="overflow-x-auto"><table className="w-full text-left text-xs border-collapse"><thead><tr className="border-b border-white/10 text-white/50"><th className="py-3 pr-4 font-bold text-center">#</th><th className="py-3 px-3 font-bold">Staff</th><th className="py-3 px-3 font-bold text-right">Target</th><th className="py-3 px-3 font-bold text-right">Actual</th><th className="py-3 px-3 font-bold text-center">Ach%</th><th className="py-3 px-3 font-bold text-right">Forecast</th>{wonderMetricConfigs.map((metric) => <th key={metric.key} className="py-3 px-3 font-bold text-center">{metric.label}{metric.valueType === "rate" && metric.target > 0 ? ` (${Math.round(metric.target)}%)` : ""}</th>)}</tr></thead><tbody>{staffAttachMatrix.map((staff, idx) => { const officerState = parsedOfficers.find((o) => matchesOfficer(o.name, staff.name)); const target = officerState?.target || 0; const actual = officerState?.actual || 0; const achPercent = officerState?.achPercent || 0; const forecast = officerState?.forecast || 0; const rankEmoji = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`; return <tr key={staff.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onOpenStaffProfile(staff.name)}><td className="py-3.5 pr-4 text-center font-bold text-sm">{rankEmoji}</td><td className="py-3.5 px-3"><button type="button" className="text-left cursor-pointer"><div className="font-semibold text-white/95 underline-offset-2 hover:underline">{staff.name}</div><div className="text-[10px] text-white/45">ID: {staff.staffId} · {staff.branch || "Unknown Branch"}</div></button></td><td className="py-3.5 px-3 text-right font-medium text-white/70">฿{Math.round(target).toLocaleString()}</td><td className="py-3.5 px-3 text-right font-bold text-white">฿{Math.round(actual).toLocaleString()}</td><td className="py-3.5 px-3 text-center"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${achPercent >= 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/70"}`}>{achPercent.toFixed(1)}%</span></td><td className="py-3.5 px-3 text-right font-medium text-white/60">฿{Math.round(forecast).toLocaleString()}</td>{wonderMetricConfigs.map((metric) => { const value = metric.valueType === "units" ? (staff.attachMap[metric.key]?.units || 0) : (staff.attachMap[metric.key]?.rate || 0); const isHit = metric.valueType === "rate" && metric.target > 0 && value >= metric.target; return <td key={`${staff.id}-${metric.key}`} className="py-3.5 px-3 text-center"><button type="button" className={`font-semibold cursor-pointer ${isHit ? "text-emerald-400" : "text-white/60"}`} onClick={(event) => { event.stopPropagation(); onOpenStaffProfile(staff.name); }}>{metric.valueType === "units" ? `${Math.round(value)} U` : `${Math.round(value)}%`}</button></td>; })}</tr>; })}</tbody></table></div></div>;
}

function PcZoneTab({ pcZoneStats }: { pcZoneStats: PcZoneStat[] }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{pcZoneStats.map((dist) => <div key={dist.name} className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"><div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4"><div><h4 className="text-base font-bold text-teal-300 tracking-tight">{dist.name}</h4><span className="text-[10px] text-white/50">Accessories managed group</span></div><span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-extrabold">{dist.units} Units</span></div><div className="space-y-3.5">{dist.topBrands.length === 0 ? <p className="text-xs text-white/40 text-center py-4">ไม่มีข้อมูลยอดขายในกลุ่มนี้</p> : dist.topBrands.map((brand, idx) => <div key={idx} className="flex justify-between items-center text-xs"><span className="text-white/80 font-medium truncate max-w-[120px]">{idx + 1}. {brand.name}</span><span className="font-extrabold text-white">฿{Math.round(brand.revenue).toLocaleString()} ({brand.units} U)</span></div>)}</div><div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs"><span className="text-white/40">Total Revenue</span><span className="font-bold text-white">฿{Math.round(dist.revenue).toLocaleString()}</span></div></div>)}</div>;
}

function SummaryTablesSection({
  branchSummaryRows,
  categorySummaryRows,
}: {
  branchSummaryRows: { branch: string; officers: number; actual: number; target: number; ach: number; forecast: number }[];
  categorySummaryRows: { category: string; revenue: number; units: number; officers: number }[];
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">Branch Summary</h3>
          <span className="text-xs text-white/50">Top 8</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="py-3 pr-4 font-bold text-center">#</th>
                <th className="py-3 px-3 font-bold">Branch</th>
                <th className="py-3 px-3 font-bold text-center">Staff</th>
                <th className="py-3 px-3 font-bold text-right">Target</th>
                <th className="py-3 px-3 font-bold text-right">Actual</th>
                <th className="py-3 px-3 font-bold text-center">Ach%</th>
                <th className="py-3 px-3 font-bold text-right">Forecast</th>
              </tr>
            </thead>
            <tbody>
              {branchSummaryRows.map((row, idx) => (
                <tr key={row.branch} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-center text-white/80 font-bold">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-white/95">{row.branch}</td>
                  <td className="py-3 px-3 text-center text-white/70">{row.officers}</td>
                  <td className="py-3 px-3 text-right text-white/70">฿{Math.round(row.target).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">฿{Math.round(row.actual).toLocaleString()}</td>
                  <td className="py-3 px-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.ach >= 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/70"}`}>{row.ach.toFixed(1)}%</span></td>
                  <td className="py-3 px-3 text-right text-white/70">฿{Math.round(row.forecast).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">Product Summary</h3>
          <span className="text-xs text-white/50">Attach by category</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="py-3 pr-4 font-bold text-center">#</th>
                <th className="py-3 px-3 font-bold">Category</th>
                <th className="py-3 px-3 font-bold text-center">Officers</th>
                <th className="py-3 px-3 font-bold text-right">Units</th>
                <th className="py-3 px-3 font-bold text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {categorySummaryRows.map((row, idx) => (
                <tr key={row.category} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-center text-white/80 font-bold">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-white/95">{row.category}</td>
                  <td className="py-3 px-3 text-center text-white/70">{row.officers}</td>
                  <td className="py-3 px-3 text-right text-white/70">{Math.round(row.units).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">฿{Math.round(row.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttachBuilderTab({ staffCategoryTree, staffBaseCategories, staffAttachGroups, staffFilterBranch, staffBranchesList, staffKpiTargets, selectedAttachOfficers, attachOverviewChartData, attachTargetCategories, attachOverviewRows, builderOpen, onToggleBuilder, onToggleStaffCategory, onAttachGroupsChange, onBranchChange, onSetKpi, onToggleOfficer, parsedOfficers }: { staffCategoryTree: CategoryTreeMap; staffBaseCategories: string[]; staffAttachGroups: AttachTargetGroup[]; staffFilterBranch: string; staffBranchesList: string[]; staffKpiTargets: Record<string, number>; selectedAttachOfficers: string[]; attachOverviewChartData: AttachMatrixDisplayRow[]; attachTargetCategories: string[]; attachOverviewRows: AttachMatrixRow[]; builderOpen: boolean; onToggleBuilder: () => void; onToggleStaffCategory: (cat: string, isBase: boolean) => void; onAttachGroupsChange: (groups: AttachTargetGroup[]) => void; onBranchChange: (branch: string) => void; onSetKpi: (label: string, value: number) => void; onToggleOfficer: (name: string) => void; parsedOfficers: OfficerReport[]; }) {
  return <>
    <div className="relative z-40"><button type="button" onClick={onToggleBuilder} className="w-full flex items-center justify-between gap-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 px-5 py-3.5 hover:bg-white/[0.14] transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.12)]"><span className="flex items-center gap-2 text-sm font-semibold"><Target className="w-4 h-4 text-emerald-400" />Custom Attach Builder</span><span className="flex items-center gap-3 text-xs text-white/60">{staffBaseCategories.length} base · {staffAttachGroups.length} attach{staffAttachGroups.length > 0 ? ` · KPI ${staffAttachGroups.map((g) => `${staffKpiTargets[g.label] ?? 20}%`).join(" / ")}` : ""}<ChevronDown className={`w-4 h-4 transition-transform ${builderOpen ? "rotate-180" : ""}`} /></span></button><AnimatePresence>{builderOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mt-3 bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"><div className="flex flex-col xl:flex-row gap-5"><div className="flex-1 grid md:grid-cols-2 gap-4"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-3">1. Base Target (ตัวหาร)</span><CategoryTreePicker treeMap={staffCategoryTree} selected={staffBaseCategories} toggle={(cat) => onToggleStaffCategory(cat, true)} variant="base" /></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-3">2. Attach Target (ตัวแนบ)</span><AttachTargetGroupEditor treeMap={staffCategoryTree} groups={staffAttachGroups} onGroupsChange={onAttachGroupsChange} /></div></div><div className="xl:w-56 flex flex-col gap-4 shrink-0"><div><label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 block">Branch</label><select value={staffFilterBranch} onChange={(e) => onBranchChange(e.target.value)} className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500">{staffBranchesList.map((b) => <option key={b} value={b} className="text-gray-900">{b.replace(/^ID\d+ : /, "")}</option>)}</select></div><div><div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-2 flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" />Target KPI ต่อหมวด Attach</div>{staffAttachGroups.length === 0 ? <p className="text-xs text-white/50">เลือกหมวดหรือสร้างกลุ่ม Attach ก่อน</p> : <div className="space-y-3 max-h-40 overflow-y-auto pr-1">{staffAttachGroups.map((group) => { const kpi = staffKpiTargets[group.label] ?? 20; return <div key={group.id}><label className="flex items-center justify-between gap-2 text-xs mb-1"><span className="text-white/80 truncate">{group.label}</span><span className="bg-teal-500/20 text-teal-200 px-1.5 rounded tabular-nums shrink-0">{kpi}%</span></label><input type="range" min={0} max={100} step={1} value={kpi} onChange={(e) => onSetKpi(group.label, Number(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500" /></div>; })}</div>}</div><div><div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Officer</div><div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1"><label className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"><input type="checkbox" className="hidden" checked={selectedAttachOfficers.length === 0} onChange={() => onToggleOfficer("")} /><div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAttachOfficers.length === 0 ? "bg-emerald-500 border-emerald-500" : "border-white/40"}`}>{selectedAttachOfficers.length === 0 && <Check className="w-3 h-3 text-white" />}</div><span className="text-xs text-white/90">All Officers</span></label>{parsedOfficers.map((officer, idx) => <label key={`${officer.name}-${idx}`} className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"><input type="checkbox" className="hidden" checked={selectedAttachOfficers.includes(officer.name)} onChange={() => onToggleOfficer(officer.name)} /><div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAttachOfficers.includes(officer.name) ? "bg-emerald-500 border-emerald-500" : "border-white/40"}`}>{selectedAttachOfficers.includes(officer.name) && <Check className="w-3 h-3 text-white" />}</div><span className="text-xs text-white/90 truncate">{officer.name}</span></label>)}</div></div></div></div></div></motion.div>}</AnimatePresence></div>
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] min-h-[450px] relative z-10 w-full shrink-0 min-w-0">{staffAttachGroups.length === 0 || staffBaseCategories.length === 0 ? <p className="text-sm text-white/60 py-8 text-center">เลือกอย่างน้อย 1 หมวดใน Base และ Attach จาก Custom Attach Builder</p> : attachOverviewChartData.length === 0 ? <p className="text-sm text-white/60 py-8 text-center">ไม่มีข้อมูลตามเงื่อนไขที่เลือก — ลองอัปโหลดไฟล์หรือเปลี่ยน Branch / Officer</p> : <ResponsiveContainer width="100%" height={420}><BarChart data={attachOverviewChartData} margin={{ top: 16, right: 24, left: 8, bottom: 88 }} barGap={4} barCategoryGap="18%"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="shortName" stroke="rgba(255,255,255,0.3)" interval={0} angle={-42} textAnchor="end" height={88} tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} /><YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} axisLine={false} tickLine={false} dx={-8} tickFormatter={(value) => `${value}%`} /><RechartsTooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const row = payload[0].payload as AttachMatrixDisplayRow; const cats = attachTargetCategories.length > 0 ? attachTargetCategories : DEFAULT_ATTACH_CATEGORIES; return <div className="rounded-xl border border-white/10 bg-[#0c3123]/95 px-3 py-2 text-xs shadow-xl max-w-[260px]"><p className="font-semibold text-white mb-1">{row.name}</p><p className="text-white/60 mb-2">Base: {row.baseUnits.toLocaleString()} U{row.branch ? ` · ${row.branch}` : ""}</p>{cats.map((cat) => <div key={cat} className="flex justify-between gap-3 text-white/80"><span>{cat}</span><span className={row.isHit[cat] ? "text-emerald-400 font-bold" : ""}>{(row.rates[cat] ?? 0).toFixed(1)}% ({row.units[cat] ?? 0} U)</span></div>)}</div>; }} /><Legend wrapperStyle={{ paddingTop: "8px" }} />{(attachTargetCategories.length > 0 ? attachTargetCategories : DEFAULT_ATTACH_CATEGORIES).map((cat, index) => <Bar key={cat} dataKey={cat} name={cat} fill={ATTACH_CHART_COLORS[index % ATTACH_CHART_COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={48} />)}</BarChart></ResponsiveContainer>}</div></>;
}
