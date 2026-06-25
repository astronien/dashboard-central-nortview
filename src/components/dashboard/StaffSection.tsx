import { motion, AnimatePresence } from "motion/react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ShoppingBag, Award, Star, Apple, Target, BarChart3, TrendingUp, Layers, User } from "lucide-react";
import React from "react";
import { calcTargetToDate, calcTodayAchievementPct } from "../../lib/targetAggregations";
import type { PresetCalcType } from "../../lib/presetTypes";

export type StaffLeaderboardItem = {
  id: string;
  name: string;
  baseUnits: number;
  attachMap: Record<string, { rate: number; units: number }>;
};

export type PerformanceRow = {
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
  actualA?: number;
  actualB?: number;
  calcType?: PresetCalcType;
};

export type OfficerData = {
  name: string;
  actual: number;
  target: number;
  achPercent?: number;
  forecast: number;
  branch?: string;
};

export type CurrentStaff = {
  name: string;
  store: string;
  stats: {
    sales: number | string;
    target: number | string;
  };
};

export type RadarDatum = {
  subject: string;
  value: number;
};

const isCurrencyCalcType = (calcType: PresetCalcType | undefined): boolean => {
  return calcType === "baht" || calcType === "bahtRate" || calcType === "catBaht";
};

export function StaffSection({
  displayStaffAvatar,
  activeOfficer,
  currentStaff,
  dynamicRadarData,
  renderCustomTick,
  dynamicScore,
  activeStat,
  onSetActiveStat,
  sevenWondersScore,
  dynamicRole,
  dynamicExperience,
  dynamicExpertise,
  dynamicLanguages,
  activeOfficer7WondersPerformance,
  activeOfficerCategoryPerformance,
  todaySalesTotal,
  todayDateLabel,
  categoryPerformanceHint,
  onSetActiveStaffId,
}: {
  displayStaffAvatar: string;
  activeOfficer?: OfficerData;
  currentStaff: CurrentStaff;
  dynamicRadarData: RadarDatum[];
  renderCustomTick: (props: {
    payload?: { value?: string };
    x?: number;
    y?: number;
    textAnchor?: string;
  }) => React.ReactElement | null;
  dynamicScore: number;
  activeStat: string;
  onSetActiveStat: (stat: string) => void;
  sevenWondersScore: number;
  dynamicRole: string;
  dynamicExperience: string;
  dynamicExpertise: string;
  dynamicLanguages: string;
  activeOfficer7WondersPerformance: PerformanceRow[];
  activeOfficerCategoryPerformance: PerformanceRow[];
  todaySalesTotal: number;
  todayDateLabel?: string;
  categoryPerformanceHint?: string | null;
  onSetActiveStaffId: (id: string) => void;
}) {
  const monthlySalesActual = activeOfficer
    ? Math.round(activeOfficer.actual)
    : Number(currentStaff.stats.sales) || 0;
  const monthlySalesTarget = activeOfficer
    ? Math.round(activeOfficer.target)
    : null;
  const monthlySalesPct =
    activeOfficer?.achPercent ??
    (monthlySalesTarget && monthlySalesTarget > 0
      ? (monthlySalesActual / monthlySalesTarget) * 100
      : (() => {
          const targetStr = String(currentStaff.stats.target);
          const pctMatch = targetStr.match(/([\d.]+)\s*%/);
          return pctMatch ? Number(pctMatch[1]) : 0;
        })());

  const fmtSalesNum = (n: number) => n.toLocaleString();
  const fmtSalesPct = (n: number) =>
    `${n >= 100 ? Math.round(n) : n.toFixed(1)}%`;
  const fmtActualAB = (
    a: number | undefined,
    b: number | undefined,
    calcType: PresetCalcType | undefined,
  ): string => {
    if (a === undefined) return "—";
    const isCurrency = isCurrencyCalcType(calcType);
    const aStr = isCurrency
      ? `฿${Math.round(a).toLocaleString()}`
      : Math.round(a).toLocaleString();
    if (b === undefined) return aStr;
    const bStr = isCurrency
      ? `฿${Math.round(b).toLocaleString()}`
      : Math.round(b).toLocaleString();
    return `${aStr}/${bStr}`;
  };
  const isTodayView = activeStat === "target";
  const isCsatView = activeStat === "csat";
  const tableRows = isTodayView
    ? activeOfficerCategoryPerformance
    : activeStat === "csat"
      ? activeOfficer7WondersPerformance
      : activeOfficerCategoryPerformance;

  const currentMonthTotalDays = new Date().getDate() ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 30;
  const currentDay = Math.min(new Date().getDate(), currentMonthTotalDays);
  const todayTarget = activeOfficer
    ? Math.round(calcTargetToDate(activeOfficer.target, currentDay, currentMonthTotalDays))
    : Number(currentStaff.stats.target) || 0;
  const todayAchPercent = calcTodayAchievementPct(todaySalesTotal, todayTarget);

  // PWA / mobile state — runs once on mount
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Reduce animation on small screens for snappier feel
  const reduceMotion = isMobile;

  const officerName = activeOfficer?.name ?? currentStaff.name;
  const officerBranch = activeOfficer?.branch ?? currentStaff.store;
  const firstName = (officerName.split(" ")[0] ?? "").trim();
  const restName = (officerName.split(" ").slice(1).join(" ") ?? "").trim();

  return (
    <motion.div
      key="staff"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 1.04, filter: "blur(8px)" }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
      className="flex flex-col w-full h-full gap-3 sm:gap-4 lg:gap-6 relative pb-4"
    >
      {/* ============ HERO CARD ============ */}
      <div className="relative bg-gradient-to-br from-[#113a29]/80 via-[#0c291d]/85 to-[#051710]/95 backdrop-blur-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.35)] rounded-3xl lg:rounded-[2.5rem] p-4 sm:p-5 lg:p-8 overflow-hidden">
        {/* Decorative glow */}
        {!reduceMotion && (
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="hidden lg:block absolute -top-10 -right-10 w-[400px] h-[400px] bg-emerald-500/15 blur-[85px] rounded-full pointer-events-none -z-0"
          />
        )}

        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-6">
          {/* Avatar + name (mobile combined) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-6 w-full lg:w-[40%]">
            {/* Avatar */}
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 lg:w-44 lg:h-44 shrink-0">
              {!reduceMotion && (
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full pointer-events-none"
                />
              )}
              <img
                src={displayStaffAvatar}
                alt={officerName}
                className="relative w-full h-full object-cover rounded-full border-2 border-white/20 drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              />
            </div>
            {/* Name + branch */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={officerName}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight truncate"
                >
                  {firstName}
                  {restName && <span className="block sm:inline text-white/80 font-medium text-lg sm:text-xl lg:text-2xl ml-0 sm:ml-2">{restName}</span>}
                </motion.h1>
              </AnimatePresence>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/70 text-sm mt-1 truncate">
                <Apple className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{officerBranch}</span>
              </div>
            </div>
          </div>

          {/* Radar chart (mobile: smaller, side) */}
          <div className="w-full lg:w-[30%] flex items-center justify-center relative">
            <div className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] lg:w-[260px] lg:h-[260px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="55%"
                  margin={{ top: 16, right: 20, bottom: 16, left: 20 }}
                  data={dynamicRadarData}
                >
                  <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                  <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Staff"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.15}
                    isAnimationActive={!reduceMotion}
                    animationDuration={800}
                  />
                </RadarChart>
              </ResponsiveContainer>
              {/* Center score */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={dynamicScore}
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.5 }}
                      className="text-white text-lg sm:text-xl lg:text-2xl font-bold"
                    >
                      {dynamicScore}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats (4 cards) */}
          <div className="w-full lg:w-[30%] grid grid-cols-2 gap-2 sm:gap-3">
            <StatCard
              label="ยอดเดือน"
              value={fmtSalesNum(monthlySalesActual)}
              subValue={monthlySalesTarget ? `เป้า ${fmtSalesNum(monthlySalesTarget)}` : undefined}
              badge={fmtSalesPct(monthlySalesPct)}
              badgeColor={monthlySalesPct >= 100 ? "emerald" : monthlySalesPct >= 80 ? "amber" : "rose"}
              icon={<ShoppingBag className="w-4 h-4" />}
              active={activeStat === "sales"}
              onClick={() => onSetActiveStat("sales")}
            />
            <StatCard
              label="7 Wonder"
              value={`${sevenWondersScore}%`}
              icon={<Award className="w-4 h-4" />}
              active={activeStat === "csat"}
              onClick={() => onSetActiveStat("csat")}
            />
            <StatCard
              label="ยอดวันนี้"
              value={fmtSalesNum(todaySalesTotal)}
              subValue={todayDateLabel ? undefined : `เป้า ${fmtSalesNum(todayTarget)}`}
              badge={todayAchPercent > 0 ? fmtSalesPct(todayAchPercent) : undefined}
              badgeColor={todayAchPercent >= 100 ? "emerald" : todayAchPercent >= 80 ? "amber" : "rose"}
              icon={<Star className="w-4 h-4" />}
              active={activeStat === "target"}
              onClick={() => onSetActiveStat("target")}
            />
            <StatCard
              label="สาขา"
              value={officerBranch?.split(" ").pop()?.slice(0, 8) ?? "—"}
              subValue={dynamicRole}
              icon={<User className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* ============ CATEGORY TABLE (Responsive) ============ */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl lg:rounded-[2rem] border border-white/10 p-4 sm:p-5 lg:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg sm:rounded-xl border border-emerald-500/20">
            {activeStat === "csat" ? (
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            ) : (
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {activeStat === "csat"
                ? "7 Wonders Attach Rates"
                : isTodayView
                  ? "ยอดขายวันนี้ตามหมวด"
                  : "Category Performance"}
            </h2>
            <p className="text-[10px] text-white/50 truncate">
              {officerName} • {isCsatView ? "Attach rate breakdown" : isTodayView ? "เป้า/ยอด/ส่วนต่างวันนี้" : "Target / Today / Actual / Ach% / Forecast"}
            </p>
          </div>
        </div>

        {categoryPerformanceHint && activeStat !== "csat" ? (
          <p
            className={`mb-3 rounded-lg border px-3 py-2 text-[11px] ${
              isTodayView
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100/90"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200/90"
            }`}
          >
            {categoryPerformanceHint}
          </p>
        ) : null}

        {/* Mobile: Card view | Tablet+: Table view */}
        {isCsatView ? (
          <CsatMobileCards rows={tableRows} />
        ) : (
          <CategoryMobileCards
            rows={tableRows}
            isTodayView={isTodayView}
            fmtNum={(v) => v.toLocaleString()}
            fmtPct={(v) => `${v.toFixed(1)}%`}
            fmtActualAB={fmtActualAB}
          />
        )}
      </div>
    </motion.div>
  );
}

/* ============ Stat Card ============ */
function StatCard({
  label,
  value,
  subValue,
  badge,
  badgeColor = "emerald",
  icon,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  subValue?: string;
  badge?: string;
  badgeColor?: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const badgeColorMap = {
    emerald: "bg-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/20 text-amber-300",
    rose: "bg-rose-500/20 text-rose-300",
  };
  const Interactive = onClick ? motion.button : motion.div;
  return (
    <Interactive
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={`relative rounded-2xl p-2.5 sm:p-3 text-left border transition-all ${
        active
          ? "bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/60 mb-0.5 font-medium leading-tight uppercase tracking-wider">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base sm:text-lg font-bold text-white leading-tight tabular-nums truncate">
        {value}
      </div>
      {subValue ? (
        <div className="text-[10px] text-white/50 mt-0.5 truncate">{subValue}</div>
      ) : null}
      {badge ? (
        <div
          className={`mt-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColorMap[badgeColor]}`}
        >
          {badge}
        </div>
      ) : null}
    </Interactive>
  );
}

/* ============ Category Mobile Cards ============ */
function CategoryMobileCards({
  rows,
  isTodayView,
  fmtNum,
  fmtPct,
  fmtActualAB,
}: {
  rows: PerformanceRow[];
  isTodayView: boolean;
  fmtNum: (v: number) => string;
  fmtPct: (v: number) => string;
  fmtActualAB: (a?: number, b?: number, calcType?: PresetCalcType) => string;
}) {
  const visible = rows.filter(
    (r) => r.target > 0 || r.actual > 0 || r.actualDay > 0,
  );
  if (visible.length === 0) {
    return (
      <p className="text-xs text-white/40 text-center py-6">
        ยังไม่มีข้อมูล
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {visible.map((row, idx) => {
        const achColor =
          row.achPercent >= 100
            ? "text-emerald-400"
            : row.achPercent >= 80
              ? "text-amber-400"
              : "text-rose-400";
        const isTotal = row.category === "Total";
        return (
          <div
            key={`${row.category}-${idx}`}
            className={`rounded-xl border p-3 ${
              isTotal
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-sm font-bold text-white truncate pr-2">
                {row.category}
              </div>
              <div
                className={`text-sm font-mono font-bold ${achColor} shrink-0`}
              >
                {fmtPct(row.achPercent)}
              </div>
            </div>
            {isTodayView ? (
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Cell label="เป้าวัน" value={row.targetDay > 0 ? fmtNum(row.targetDay) : "—"} />
                <Cell label="ยอดวันนี้" value={row.actualDay > 0 ? fmtNum(row.actualDay) : "—"} highlight />
                <Cell
                  label="ส่วนต่าง"
                  value={row.diffDay !== 0 ? (row.diffDay > 0 ? `+${fmtNum(row.diffDay)}` : fmtNum(row.diffDay)) : "—"}
                  color={row.diffDay > 0 ? "emerald" : row.diffDay < 0 ? "rose" : "white"}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <Cell label="Target" value={row.target > 0 ? fmtNum(row.target) : "—"} />
                <Cell label="Today" value={row.actualDay > 0 ? fmtNum(row.actualDay) : "—"} />
                <Cell label="Actual" value={row.actual > 0 ? fmtNum(row.actual) : "—"} highlight />
                <Cell
                  label="Forecast"
                  value={row.forecast > 0 ? fmtNum(row.forecast) : "—"}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Cell({
  label,
  value,
  highlight = false,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: "emerald" | "rose" | "white";
}) {
  const colorClass = color === "emerald" ? "text-emerald-300" : color === "rose" ? "text-rose-300" : "text-white";
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-white/40 leading-none mb-0.5">
        {label}
      </span>
      <span
        className={`font-mono font-semibold text-[12px] leading-tight tabular-nums truncate ${
          highlight ? "text-white" : colorClass
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ============ CSAT Mobile Cards ============ */
function CsatMobileCards({ rows }: { rows: PerformanceRow[] }) {
  const visible = rows.filter(
    (r) => r.target > 0 || r.actualA !== undefined || r.actualB !== undefined,
  );
  if (visible.length === 0) {
    return <p className="text-xs text-white/40 text-center py-6">ยังไม่มีข้อมูล</p>;
  }
  return (
    <div className="space-y-2">
      {visible.map((row, idx) => {
        const isTotal = row.category === "Total" || row.category === "Average";
        const scaled =
          row.calcType === "attach" ||
          row.calcType === "bahtRate" ||
          row.calcType === "catAttach"
            ? row.target > 0
              ? (row.actual / row.target) * 100
              : 0
            : row.achPercent;
        const achColor =
          scaled >= 100
            ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/30"
            : scaled >= 80
              ? "text-amber-400 bg-amber-500/20 border-amber-500/30"
              : "text-rose-400 bg-rose-500/20 border-rose-500/30";
        return (
          <div
            key={`${row.category}-${idx}`}
            className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
              isTotal
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="text-sm font-bold text-white truncate flex-1 min-w-0">
              {row.category}
            </div>
            <div className="text-right text-[11px] text-white/60 shrink-0">
              <div>เป้า {row.target > 0 ? `${row.target}%` : "—"}</div>
              <div className="text-white">
                {row.actualA !== undefined
                  ? `${row.actualA}${row.actualB !== undefined ? `/${row.actualB}` : ""}`
                  : "—"}
              </div>
            </div>
            <div
              className={`shrink-0 text-sm font-extrabold px-2.5 py-1 rounded-lg border ${achColor}`}
            >
              {scaled.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
