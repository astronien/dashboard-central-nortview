import { type LucideIcon } from "lucide-react";

export function KpiCard({
  title,
  icon: Icon,
  score,
  rate,
  progressWidth,
  progressColor = "from-emerald-500 to-teal-400",
  leftLabel,
  leftValue,
  leftSub,
  rightLabel,
  rightValue,
  rightSub,
  variant = "default",
}: {
  title: string;
  icon: LucideIcon;
  score: number;
  rate: number;
  progressWidth: number;
  progressColor?: string;
  leftLabel: string;
  leftValue: string;
  leftSub: string;
  rightLabel: string;
  rightValue: string;
  rightSub: string;
  variant?: "default" | "highlight";
}) {
  const isHighlight = variant === "highlight";
  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between transition-all duration-300 min-h-[220px] group relative overflow-hidden ${
        isHighlight
          ? "bg-[#032e1f] border-[#10b981]/30 hover:bg-[#043d29] hover:border-[#10b981]/50"
          : "bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/[0.08] hover:border-white/20"
      }`}
    >
      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/15 transition-all duration-500" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-lg border ${isHighlight ? "bg-white/5 border-white/5" : "bg-white/5 border-white/5 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors"}`}>
            <Icon className={`w-3.5 h-3.5 ${isHighlight ? "text-amber-400" : "text-white/50 group-hover:text-emerald-400 transition-colors"}`} />
          </div>
          <span className={`text-[11px] font-bold tracking-wide ${isHighlight ? "text-white" : "text-white/70"}`}>{title}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[7px] uppercase tracking-wider font-bold leading-none mb-0.5 ${isHighlight ? "text-white/40" : "text-white/40"}`}>SCORE</span>
          <span className={`text-sm font-black leading-none ${score >= 80 ? (isHighlight ? "text-[#34d399]" : "text-emerald-400") : score >= 60 ? (isHighlight ? "text-amber-400" : "text-blue-400") : "text-rose-400"}`}>{score}</span>
        </div>
      </div>

      <div className="my-auto py-3 relative z-10 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isHighlight ? "text-white/60" : "text-white/45"}`}>Progress</span>
          <span className={`text-[10px] font-extrabold ${isHighlight ? "text-amber-400" : "text-emerald-400"}`}>{rate.toFixed(2)}%</span>
        </div>
        <div className={`w-full rounded-full h-2 overflow-hidden border p-[1px] ${isHighlight ? "bg-white/10 border-white/5" : "bg-white/10 border-white/5"}`}>
          <div className={`bg-gradient-to-r ${progressColor} h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]`} style={{ width: `${Math.min(progressWidth, 100)}%` }} />
        </div>
      </div>

      <div className="flex justify-between items-end gap-1.5 mt-auto pt-3 border-t relative z-10">
        <div className="flex flex-col min-w-0">
          <span className={`text-[8px] font-bold uppercase tracking-wider truncate ${isHighlight ? "text-white/60" : "text-white/45"}`}>{leftLabel}</span>
          <span className="text-xs font-black text-white mt-0.5 leading-none tracking-tight truncate">{leftValue}</span>
          <span className={`text-[8px] mt-1 font-medium truncate ${isHighlight ? "text-white/40" : "text-white/35"}`}>{leftSub}</span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-[8px] font-bold uppercase tracking-wider ${isHighlight ? "text-white/60" : "text-white/45"}`}>{rightLabel}</span>
          <span className={`text-xs font-black mt-0.5 leading-none tracking-tight ${isHighlight ? "text-amber-400" : "text-emerald-400"}`}>{rightValue}</span>
          <span className={`text-[8px] mt-1 font-medium ${isHighlight ? "text-white/40" : "text-white/35"}`}>{rightSub}</span>
        </div>
      </div>
    </div>
  );
}
