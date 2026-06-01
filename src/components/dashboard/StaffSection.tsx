import { motion, AnimatePresence } from "motion/react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ShoppingBag, Award, Star, TrendingUp, Apple } from "lucide-react";
import React from "react";
import { calcTargetToDate, calcTodayAchievementPct } from "../../lib/targetAggregations";

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
  activeTab,
  onSetActiveTab,
  staffLeaderboard,
  parsedOfficers,
  attachMatchesOfficer,
  overallAttachRate,
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
  activeTab: string;
  onSetActiveTab: (tab: string) => void;
  staffLeaderboard: StaffLeaderboardItem[];
  parsedOfficers: OfficerData[];
  attachMatchesOfficer: (a: string, b: string) => boolean;
  overallAttachRate: (item: StaffLeaderboardItem) => number;
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
  const isTodayView = activeStat === "target";
  const tableRows = isTodayView
    ? activeOfficerCategoryPerformance
    : activeStat === "csat"
      ? activeOfficer7WondersPerformance
      : activeOfficerCategoryPerformance;

  const topAttachSummary = React.useMemo(() => {
    const matched = staffLeaderboard.find((item) =>
      activeOfficer ? attachMatchesOfficer(item.name, activeOfficer.name) : false,
    );
    if (!matched) return null;

    const best = Object.entries(matched.attachMap)
      .map(([key, value]) => ({ key, rate: value?.rate ?? 0, units: value?.units ?? 0 }))
      .sort((a, b) => b.rate - a.rate)[0];

    return best ?? null;
  }, [staffLeaderboard, activeOfficer, attachMatchesOfficer]);

  const focusKpiSummary = React.useMemo(() => {
    const rows = activeOfficerCategoryPerformance.filter((row) => row.category !== "Total" && row.category !== "Average");
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.achDayPercent - a.achDayPercent)[0] ?? null;
  }, [activeOfficerCategoryPerformance]);

  const currentMonthTotalDays = new Date().getDate() ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 30;
  const currentDay = Math.min(new Date().getDate(), currentMonthTotalDays);
  const todayTarget = activeOfficer
    ? Math.round(calcTargetToDate(activeOfficer.target, currentDay, currentMonthTotalDays))
    : Number(currentStaff.stats.target) || 0;
  const todayAchPercent = calcTodayAchievementPct(todaySalesTotal, todayTarget);
  const todayGap = todayTarget - todaySalesTotal;

  return (
              <motion.div
                key="staff"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col w-full h-full gap-6 relative"
              >
                {/* TOP HALF: Person | Radar | Stats */}
                <div className="flex-1 bg-gradient-to-br from-[#113a29]/80 via-[#0c291d]/85 to-[#051710]/95 backdrop-blur-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.35)] rounded-[2.5rem] p-6 lg:p-8 lg:pb-6 flex flex-col lg:flex-row min-h-[360px] lg:min-h-[460px] shrink-0 relative overflow-visible gap-6 lg:gap-0">
                  {/* Left Column - Image */}
                  <div className="lg:w-[38%] relative self-stretch flex items-end justify-center z-30 min-h-[320px] sm:min-h-[360px] lg:min-h-0 pointer-events-none -mb-6 lg:-ml-8 lg:-mt-20 xl:-mt-28">
                    <motion.div
                      animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[85%] max-w-[360px] h-[60%] bg-emerald-500/15 blur-[60px] lg:blur-[85px] rounded-full pointer-events-none -z-10 mix-blend-screen"
                    />
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={displayStaffAvatar}
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97, filter: "blur(6px)" }}
                        transition={{ duration: 0.45, type: "spring", bounce: 0.3 }}
                        src={displayStaffAvatar}
                        alt={activeOfficer?.name ?? currentStaff.name}
                        className="relative z-20 mx-auto w-auto h-[105%] max-h-[480px] sm:max-h-[520px] lg:h-[125%] lg:max-h-[640px] xl:h-[130%] lg:scale-105 xl:scale-110 object-contain object-bottom drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)] pointer-events-none"
                        style={{
                          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 95%)",
                          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 95%)",
                        }}
                      />
                    </AnimatePresence>
                  </div>

                  {/* Center Column - Radar Chart */}
                  <div className="lg:w-[28%] relative flex items-center justify-center py-4 lg:py-0 z-40 overflow-visible">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.65, type: "spring", bounce: 0.25, delay: 0.15 }}
                      className="w-full max-w-[300px] h-[300px] min-h-[300px] relative text-xs overflow-visible [&_.recharts-wrapper]:!overflow-visible [&_svg]:!overflow-visible"
                    >
                      <ResponsiveContainer width="100%" height={300} minWidth={0}>
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="52%"
                          margin={{ top: 28, right: 36, bottom: 28, left: 36 }}
                          data={dynamicRadarData}
                        >
                          <PolarGrid
                            gridType="polygon"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={1}
                          />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={renderCustomTick}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Staff"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="#10b981"
                            fillOpacity={0.15}
                            isAnimationActive={true}
                            animationDuration={800}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      {/* Center Value */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={dynamicScore}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="text-white/60 text-3xl font-bold tracking-tighter"
                            >
                              {dynamicScore}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column - Stats Grid */}
                  <div className="lg:w-[34%] flex flex-col justify-center lg:justify-end pb-4 relative z-40">
                    <motion.div
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, type: "spring", bounce: 0.2, delay: 0.1 }}
                      className="text-center lg:text-right mb-4"
                    >
                      <AnimatePresence mode="wait">
                        <motion.h1
                          key={activeOfficer?.name ?? currentStaff.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight text-white"
                        >
                          {(activeOfficer?.name ?? currentStaff.name).split(" ")[0]}
                          <br className="hidden lg:block" />{" "}
                          {(activeOfficer?.name ?? currentStaff.name).split(" ")[1] || ""}
                        </motion.h1>
                      </AnimatePresence>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeOfficer?.branch ?? currentStaff.store}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center lg:justify-end gap-2 text-white/80 font-medium"
                        >
                          <Apple className="w-4 h-4" /> {activeOfficer?.branch ?? currentStaff.store}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>

                    {/* Top 3 Stats */}
                    <div className="flex justify-center lg:justify-end gap-3 mb-3">
                      <motion.button
                        onClick={() => onSetActiveStat("sales")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-2xl px-2 py-3 w-28 sm:w-32 min-h-[104px] text-center border shadow-lg transition-all duration-200 overflow-visible ${activeStat === "sales" ? "bg-[#0c3123] border-white/30 ring-1 ring-emerald-500/50" : "bg-black/20 border-white/5 hover:bg-black/30"}`}
                      >
                        <ShoppingBag
                          className={`w-5 h-5 mx-auto mb-1.5 shrink-0 ${activeStat === "sales" ? "text-white" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/70 mb-1.5 font-medium leading-tight">
                          Monthly Sales
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${monthlySalesActual}-${monthlySalesTarget}-${monthlySalesPct}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="w-full space-y-1 text-[9px] leading-snug overflow-visible"
                          >
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">ยอดจริง</span>
                              <span className="font-bold text-white tabular-nums truncate">
                                {fmtSalesNum(monthlySalesActual)}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">เป้า</span>
                              <span className="font-semibold text-white/85 tabular-nums truncate">
                                {monthlySalesTarget != null
                                  ? fmtSalesNum(monthlySalesTarget)
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">ถึงเป้า</span>
                              <span className="font-bold text-emerald-300 tabular-nums">
                                {fmtSalesPct(monthlySalesPct)}
                              </span>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        onClick={() => onSetActiveStat("csat")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`backdrop-blur-md rounded-2xl px-2 py-4 w-28 sm:w-32 text-center border shadow-inner transition-all duration-200 ${activeStat === "csat" ? "bg-white/[0.15] border-white/30 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        <Award
                          className={`w-5 h-5 mx-auto mb-2 ${activeStat === "csat" ? "text-emerald-300 fill-emerald-300/20" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/80 mb-1 font-medium">
                          7 Wonder
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={sevenWondersScore}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xl lg:text-2xl font-bold text-white"
                          >
                            {sevenWondersScore}%
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        onClick={() => onSetActiveStat("target")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`backdrop-blur-xl rounded-2xl px-2 py-4 w-28 sm:w-32 text-center border shadow-xl relative overflow-hidden transition-all duration-200 ${activeStat === "target" ? "bg-white/20 border-white/40 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        {activeStat === "target" && (
                          <div className="absolute inset-0 bg-emerald-400/20 mix-blend-overlay"></div>
                        )}
                        <Star
                          className={`w-5 h-5 mx-auto mb-2 relative z-10 ${activeStat === "target" ? "text-emerald-200 fill-emerald-200" : "text-white/60"}`}
                        />
                        <div className="text-[10px] relative z-10 text-emerald-100 mb-0.5 font-medium">
                          ยอดวันนี้
                        </div>
                        {todayDateLabel ? (
                          <div className="text-[8px] relative z-10 text-white/45 mb-1 leading-tight px-0.5">
                            {todayDateLabel}
                          </div>
                        ) : null}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={todaySalesTotal}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={`font-bold text-white relative z-10 transition-all ${
                              fmtSalesNum(todaySalesTotal).length > 7
                                ? "text-base sm:text-lg lg:text-xl tracking-tighter"
                                : "text-xl lg:text-2xl"
                            }`}
                          >
                            {fmtSalesNum(todaySalesTotal)}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>

                    {/* Bottom 2x2 Stats */}
                    <div className="grid grid-cols-2 gap-2 lg:gap-3 justify-center lg:justify-end max-w-[340px] w-full mx-auto lg:mx-0 lg:ml-auto">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.25 }}
                        whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 20px rgba(16, 185, 129, 0.1)" }}
                        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center transition-colors duration-200"
                      >
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Target Today
                        </div>
                        <div className="text-[10px] lg:text-xs font-semibold w-full truncate">
                          ฿{fmtSalesNum(Math.round((monthlySalesTarget ?? 0) / 30))}
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
                        whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 20px rgba(16, 185, 129, 0.1)" }}
                        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center transition-colors duration-200"
                      >
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Today Ach%
                        </div>
                        <div className="text-[10px] lg:text-xs font-semibold w-full truncate">
                          {fmtSalesPct(monthlySalesPct)}
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.35 }}
                        whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 20px rgba(16, 185, 129, 0.1)" }}
                        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center transition-colors duration-200"
                      >
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Top Attach / Focus KPI
                        </div>
                        <div className="text-[10px] lg:text-xs font-semibold w-full truncate">
                          {topAttachSummary ? `${topAttachSummary.key} ${Math.round(topAttachSummary.rate)}%` : "—"}
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
                        whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 20px rgba(16, 185, 129, 0.1)" }}
                        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center flex flex-col items-center justify-center overflow-hidden min-w-0 transition-colors duration-200"
                      >
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Language
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={dynamicLanguages}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs font-semibold flex items-center gap-1.5 h-4"
                          >
                            <div className="w-[14px] h-[10px] bg-slate-800 rounded-[2px] overflow-hidden flex relative border border-white/20">
                              <div className="w-full flex flex-col justify-between">
                                <div className="h-[2px] bg-red-600"></div>
                                <div className="h-[2px] bg-white"></div>
                                <div className="h-[2px] bg-blue-800"></div>
                                <div className="h-[2px] bg-white"></div>
                                <div className="h-[2px] bg-red-600"></div>
                              </div>
                            </div>{" "}
                            {dynamicLanguages}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </div>
                </div>


                {/* BOTTOM HALF: Tables */}
                <div className="relative z-40 flex flex-col lg:flex-row gap-6 min-h-[260px]">
                  {/* Category Performance or 7 Wonders Attach Rates Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, type: "spring", bounce: 0.15 }}
                    className="lg:w-2/3 bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {activeStat === "csat" ? (
                          <Award className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-white">
                          {activeStat === "csat"
                            ? "7 Wonders Attach Rates"
                            : isTodayView
                              ? "ยอดขายวันนี้ตามหมวด"
                              : "Category Performance vs. Target"}
                        </h2>
                        <p className="text-[10px] text-white/50">
                          {activeStat === "csat"
                            ? `Attach rate breakdown for ${activeOfficer?.name ?? currentStaff.name} against KPI targets`
                            : isTodayView
                              ? `ยอดขายของวันปัจจุบัน — ${activeOfficer?.name ?? currentStaff.name}${todayDateLabel ? ` • ${todayDateLabel}` : ""}`
                              : `Performance breakdown for ${activeOfficer?.name ?? currentStaff.name} by product category`}
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
                    
                    <div className="flex-1 overflow-x-auto rounded-xl border border-emerald-500/10">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                            <th className="py-2.5 px-3 font-bold uppercase tracking-wider">
                              {activeStat === "csat" ? "Attach Category" : "Group Category"}
                            </th>
                            {isTodayView ? (
                              <>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  เป้าวัน
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  ยอดวันนี้
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  ส่วนต่าง
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">
                                  % ถึงเป้า
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Target</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Actual</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">Ach. %</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Forecast</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">%Forecast</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Last Month</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% MoM</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Last Year</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% YoY</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Target Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Actual Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Diff Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% Ach Day</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <AnimatePresence mode="wait">
                          <motion.tbody
                            key={activeStat}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={{ duration: 0.25 }}
                            className="divide-y divide-emerald-500/10 bg-[#052b20]/60"
                          >
                            {tableRows.map((row, idx) => {
                              const isCsat = activeStat === "csat";
                              const isTotal = row.category === "Total" || row.category === "Average";
                              const fmtNum = (val: number) => isCsat ? `${val.toFixed(2)}%` : val.toLocaleString();
                              const fmtPct = (val: number) => `${val.toFixed(2)}%`;
                              
                              const getBadgeClass = (rate: number) => {
                                if (rate >= 100) return "bg-green-500/20 text-green-400 font-extrabold px-1.5 py-0.5 rounded border border-green-500/20";
                                if (rate >= 80) return "bg-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20";
                                return "bg-rose-500/20 text-rose-400 font-extrabold px-1.5 py-0.5 rounded border border-rose-500/20";
                              };

                              const getDiffClass = (diff: number) => {
                                if (diff > 0) return "text-green-400 font-bold";
                                if (diff === 0) return "text-white/60";
                                return "text-rose-400 font-bold";
                              };

                              const getDiffText = (diff: number) => {
                                if (isCsat) return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`;
                                return diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                              };

                              if (isTodayView) {
                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${isTotal ? "bg-[#0c3123]/90 font-bold border-t border-emerald-500/30" : ""}`}
                                  >
                                    <td className="py-2.5 px-3 font-bold">{row.category}</td>
                                    <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>
                                      {fmtNum(row.targetDay)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actualDay)}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className={getDiffClass(row.diffDay)}>
                                        {getDiffText(row.diffDay)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={getBadgeClass(row.achDayPercent)}>
                                        {fmtPct(row.achDayPercent)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr 
                                  key={idx} 
                                  className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${isTotal ? "bg-[#0c3123]/90 font-bold border-t border-emerald-500/30" : ""}`}
                                >
                                  <td className="py-2.5 px-3 font-bold">{row.category}</td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.target)}</td>
                                  <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actual)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.achPercent)}>
                                      {fmtPct(row.achPercent)}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.forecast)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.forecastPercent)}>
                                      {fmtPct(row.forecastPercent)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white/50">{fmtNum(row.lastMonth)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={row.momPercent === "New" ? "text-emerald-400 font-bold" : "text-white/80"}>
                                      {typeof row.momPercent === "number" ? fmtPct(row.momPercent) : row.momPercent}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white/50">{fmtNum(row.lastYear)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={row.yoyPercent === "New" ? "text-emerald-400 font-bold" : "text-white/80"}>
                                      {typeof row.yoyPercent === "number" ? fmtPct(row.yoyPercent) : row.yoyPercent}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.targetDay)}</td>
                                  <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actualDay)}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={getDiffClass(row.diffDay)}>
                                      {getDiffText(row.diffDay)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.achDayPercent)}>
                                      {fmtPct(row.achDayPercent)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </motion.tbody>
                        </AnimatePresence>
                      </table>
                    </div>
                  </motion.div>

                  {/* Top Performers */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35, type: "spring", bounce: 0.15 }}
                    className="lg:w-1/3 flex flex-col gap-4"
                  >
                    {/* Header Tabs */}
                    <div className="flex items-center gap-6 text-sm font-medium px-2">
                      <button
                        onClick={() => onSetActiveTab("Store")}
                        className={`flex items-center gap-2 transition-colors ${activeTab === "Store" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        {activeTab === "Store" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        )}
                        Top Performers
                      </button>
                      <button
                        onClick={() => onSetActiveTab("Region")}
                        className={`transition-colors ${activeTab === "Region" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        Store
                      </button>
                      <button
                        onClick={() => onSetActiveTab("Area")}
                        className={`transition-colors ${activeTab === "Area" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        Region
                      </button>
                    </div>

                    {/* Performers List */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
                        transition={{ duration: 0.25 }}
                        className="flex-1 flex flex-col gap-2.5 relative"
                      >
                        {staffLeaderboard.map((performer, rank) => {
                          const officerIndex = parsedOfficers.findIndex((o) =>
                            attachMatchesOfficer(o.name, performer.name),
                          );
                          const attachRate = overallAttachRate(performer);
                          const displayUnits = performer.baseUnits || 0;
                          const isFirst = rank === 0;
                          const isLast =
                            rank === staffLeaderboard.length - 1 &&
                            staffLeaderboard.length === 3;
                          const shortName = performer.name.split(" ");
                          const label =
                            shortName.length > 1
                              ? `${shortName[0]} ${shortName[1].charAt(0)}.`
                              : performer.name;

                          return (
                            <motion.div
                              key={performer.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: rank * 0.08, type: "spring", stiffness: 100 }}
                              whileHover={{ scale: 1.03, x: 4, transition: { duration: 0.15 } }}
                              whileTap={{ scale: 0.98 }}
                              className={`${isFirst ? "bg-white/10 backdrop-blur-md border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.1)]" : "bg-white/5 backdrop-blur-sm border-white/5"} rounded-2xl p-3.5 flex items-center border cursor-pointer hover:bg-white/[0.15] hover:border-emerald-500/30 transition-colors duration-200 ${isLast ? "h-[72px] overflow-hidden relative" : ""}`}
                              onClick={() => {
                                if (officerIndex >= 0)
                                  onSetActiveStaffId(String(officerIndex + 1));
                              }}
                            >
                              <div
                                className={`${isFirst ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/10 border border-white/5 text-white/80"} rounded-full w-9 h-9 flex items-center justify-center font-bold text-base mr-3`}
                              >
                                {rank + 1}
                              </div>
                              <div>
                                <div
                                  className={`text-[9px] uppercase tracking-wider mb-0.5 ${isFirst ? "text-white/60" : isLast ? "text-white/40" : "text-white/50"}`}
                                >
                                  This Month
                                </div>
                                <div
                                  className={`font-semibold text-[13px] ${isFirst ? "text-white" : isLast ? "text-white/70 font-medium" : "text-white/90 font-medium"}`}
                                >
                                  {isFirst ? performer.name : label}
                                </div>
                              </div>
                              <div
                                className={`ml-auto text-right flex flex-col items-end ${isLast ? "mr-2" : ""}`}
                              >
                                <div
                                  className={`font-bold text-lg leading-tight ${isFirst ? "" : isLast ? "text-white/70" : "text-white/90"}`}
                                >
                                  {displayUnits.toLocaleString()}
                                </div>
                                {!isLast && (
                                  <div
                                    className={`${attachRate >= 20 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/60 border-white/10"} text-[9px] font-bold px-1.5 py-0.5 rounded border mt-1 leading-none`}
                                  >
                                    {attachRate}%
                                  </div>
                                )}
                              </div>
                              {isLast && (
                                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[rgba(18,54,39,1)] to-transparent pointer-events-none rounded-b-2xl" />
                              )}
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
  );
}
