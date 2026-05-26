import { Activity, DollarSign, Laptop, PenTool, Rocket, ShieldCheck, Smartphone, Star, Tablet, TrendingUp, TrendingDown, Building, Building2 } from "lucide-react";
import type { DerivedHomeStat } from "./dashboardTypes";
import { KpiCard } from "./KpiCard";

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

export function HomeDashboardSection({
  derivedHomeStats,
  monthlyPerformance,
}: {
  derivedHomeStats: DerivedHomeStat[];
  monthlyPerformance: MonthlyPerformance;
}) {
  const gradeColor =
    monthlyPerformance.overallScore.grade === "A"
      ? "text-emerald-400"
      : monthlyPerformance.overallScore.grade === "B"
        ? "text-blue-400"
        : monthlyPerformance.overallScore.grade === "C"
          ? "text-amber-400"
          : "text-rose-400";

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

      <div className="flex items-center gap-3 mt-4">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"><Rocket className="w-5 h-5 text-emerald-400 animate-pulse" /></div>
        <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">Monthly Overall Performance</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
        {/* Overall Score */}
        <div className="bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 min-h-[220px] group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">Overall Score</span>
            <Star className="w-4 h-4 text-white/30 group-hover:text-amber-400 group-hover:rotate-12 transition-all duration-300" />
          </div>
          <div className="flex-1 flex flex-col justify-center my-2">
            <div className="w-16 h-16 bg-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] rounded-2xl border border-white/5 flex items-center justify-center mx-auto group-hover:scale-105 transition-all duration-300">
              <span className={`text-3xl font-black ${gradeColor}`}>{monthlyPerformance.overallScore.grade}</span>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] tracking-wider text-white/40 font-bold uppercase">{monthlyPerformance.overallScore.score.toFixed(2)} AVG. SCORE</span>
          </div>
        </div>

        {/* Actual Sales */}
        <KpiCard
          title="Actual Sales"
          icon={DollarSign}
          score={64}
          rate={monthlyPerformance.actualSales.rate}
          progressWidth={monthlyPerformance.actualSales.rate}
          leftLabel="Sales Actual"
          leftValue={`${(monthlyPerformance.actualSales.actual / 1000000).toFixed(2)}M`}
          leftSub={`of ${(monthlyPerformance.actualSales.target / 1000000).toFixed(2)}M Target`}
          rightLabel="Achievement"
          rightValue={`${monthlyPerformance.actualSales.rate.toFixed(2)}%`}
          rightSub="Achieve"
        />

        {/* True Sim */}
        <KpiCard
          title="True Sim"
          icon={Smartphone}
          score={100}
          rate={monthlyPerformance.trueSim.rate}
          progressWidth={monthlyPerformance.trueSim.rate}
          leftLabel="SIMs / Devices"
          leftValue={`${monthlyPerformance.trueSim.count}`}
          leftSub={`base: ${monthlyPerformance.trueSim.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.trueSim.target}%`}
          rightSub="Required"
        />

        {/* Case iPhone */}
        <KpiCard
          title="Case iPhone"
          icon={Smartphone}
          score={79}
          rate={monthlyPerformance.caseIphone.rate}
          progressWidth={monthlyPerformance.caseIphone.rate}
          leftLabel="Cases / Devices"
          leftValue={`${monthlyPerformance.caseIphone.count}`}
          leftSub={`base: ${monthlyPerformance.caseIphone.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.caseIphone.target}%`}
          rightSub="Required"
        />

        {/* UFUND PERSONAL */}
        <KpiCard
          title="UFUND PERSONAL"
          icon={Activity}
          score={90}
          rate={monthlyPerformance.ufundPersonal.rate}
          progressWidth={monthlyPerformance.ufundPersonal.rate * 5}
          leftLabel="UFUND / Devices"
          leftValue={`${monthlyPerformance.ufundPersonal.count}`}
          leftSub={`base: ${monthlyPerformance.ufundPersonal.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.ufundPersonal.target}%`}
          rightSub="Required"
        />

        {/* COVER + */}
        <KpiCard
          title="COVER +"
          icon={ShieldCheck}
          score={56}
          rate={monthlyPerformance.coverPlus.rate}
          progressWidth={monthlyPerformance.coverPlus.rate * 4}
          progressColor="from-amber-400 to-emerald-500"
          leftLabel="Cover / Devices"
          leftValue={`${monthlyPerformance.coverPlus.count}`}
          leftSub={`base: ${monthlyPerformance.coverPlus.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.coverPlus.target}%`}
          rightSub="Required"
          variant="highlight"
        />

        {/* Pencil Attach */}
        <KpiCard
          title="Pencil Attach"
          icon={PenTool}
          score={81}
          rate={monthlyPerformance.pencil.rate}
          progressWidth={monthlyPerformance.pencil.rate}
          leftLabel="Pencils / iPads"
          leftValue={`${monthlyPerformance.pencil.count}`}
          leftSub={`base: ${monthlyPerformance.pencil.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.pencil.target}%`}
          rightSub="Required"
        />

        {/* KPIs Mac 10% */}
        <KpiCard
          title="KPIs Mac 10%"
          icon={Laptop}
          score={100}
          rate={monthlyPerformance.kpisMac.rate}
          progressWidth={monthlyPerformance.kpisMac.rate * 10}
          leftLabel="Mac / Devices"
          leftValue={`${monthlyPerformance.kpisMac.count}`}
          leftSub={`base: ${monthlyPerformance.kpisMac.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.kpisMac.target}%`}
          rightSub="Required"
        />

        {/* KPIs iPad 30% */}
        <KpiCard
          title="KPIs iPad 30%"
          icon={Tablet}
          score={100}
          rate={monthlyPerformance.kpisIpad.rate}
          progressWidth={monthlyPerformance.kpisIpad.rate * 3.33}
          leftLabel="iPad / Devices"
          leftValue={`${monthlyPerformance.kpisIpad.count}`}
          leftSub={`base: ${monthlyPerformance.kpisIpad.base}`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.kpisIpad.target}%`}
          rightSub="Required"
        />

        {/* BTB Mix */}
        <KpiCard
          title="BTB Mix"
          icon={Building}
          score={85}
          rate={monthlyPerformance.btbMix.rate}
          progressWidth={monthlyPerformance.btbMix.rate * 10}
          leftLabel="BTB Sales"
          leftValue={`${(monthlyPerformance.btbMix.btbSales / 1000000).toFixed(2)}M`}
          leftSub={`total: ${(monthlyPerformance.btbMix.totalSales / 1000000).toFixed(2)}M`}
          rightLabel="Target"
          rightValue={`${monthlyPerformance.btbMix.target}%`}
          rightSub="Required"
        />

        {/* Mac Growth YoY */}
        <KpiCard
          title="Mac Growth YoY"
          icon={Laptop}
          score={monthlyPerformance.macYoY.rate >= monthlyPerformance.macYoY.targetRate ? 100 : 45}
          rate={monthlyPerformance.macYoY.rate}
          progressWidth={Math.max(0, Math.min((monthlyPerformance.macYoY.rate / (monthlyPerformance.macYoY.targetRate || 10)) * 100, 100))}
          progressColor={monthlyPerformance.macYoY.rate >= monthlyPerformance.macYoY.targetRate ? "from-emerald-500 to-teal-400" : "from-rose-500 to-orange-400"}
          leftLabel="Mac Sales"
          leftValue={`${(monthlyPerformance.macYoY.actual / 1000000).toFixed(2)}M`}
          leftSub={`target: ${(monthlyPerformance.macYoY.target / 1000000).toFixed(2)}M`}
          rightLabel="Target Rate"
          rightValue={`${monthlyPerformance.macYoY.targetRate}%`}
          rightSub="YoY"
        />

        {/* Total Sales Growth YoY */}
        <KpiCard
          title="Total Sales YoY"
          icon={DollarSign}
          score={monthlyPerformance.totalYoY.rate >= monthlyPerformance.totalYoY.targetRate ? 100 : 45}
          rate={monthlyPerformance.totalYoY.rate}
          progressWidth={Math.max(0, Math.min((monthlyPerformance.totalYoY.rate / (monthlyPerformance.totalYoY.targetRate || 10)) * 100, 100))}
          progressColor={monthlyPerformance.totalYoY.rate >= monthlyPerformance.totalYoY.targetRate ? "from-emerald-500 to-teal-400" : "from-rose-500 to-orange-400"}
          leftLabel="Total Sales"
          leftValue={`${(monthlyPerformance.totalYoY.actual / 1000000).toFixed(2)}M`}
          leftSub={`target: ${(monthlyPerformance.totalYoY.target / 1000000).toFixed(2)}M`}
          rightLabel="Target Rate"
          rightValue={`${monthlyPerformance.totalYoY.targetRate}%`}
          rightSub="YoY"
        />
      </div>
    </>
  );
}
