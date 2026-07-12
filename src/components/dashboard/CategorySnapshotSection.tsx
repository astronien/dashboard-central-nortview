import React from "react";
import type { LucideIcon } from "lucide-react";
import { Building, Building2, CreditCard, DollarSign, Laptop, Smartphone, Tablet, Watch, ShieldCheck, ShieldPlus, RefreshCw } from "lucide-react";
import type { CategorySnapshotItem } from "../../lib/categorySnapshotBuilder";

const ICONS: Record<string, LucideIcon> = {
  Mac: Laptop,
  iPad: Tablet,
  iPhone: Smartphone,
  "Apple Watch": Watch,
  "BTB(Apple)": Building2,
  BTB: Building,
  "COVER+": ShieldPlus,
  "AC+": ShieldCheck,
  SIM: CreditCard,
  "Trade In": RefreshCw,
};

function formatValue(item: CategorySnapshotItem): string {
  if (item.category === "Trade In") {
    if (item.target > 0) {
      return `${item.actual.toLocaleString()}/${item.target.toLocaleString()}`;
    }
    return item.actual.toLocaleString();
  }
  if (item.measureType === "quantity") {
    return item.actual.toLocaleString();
  }
  if (item.actual >= 1_000_000) {
    return `฿${(item.actual / 1_000_000).toFixed(2)}M`;
  }
  return `฿${Math.round(item.actual).toLocaleString()}`;
}

function formatTarget(item: CategorySnapshotItem): string {
  if (isQuantityItem(item)) {
    return item.target.toLocaleString();
  }
  if (item.target >= 1_000_000) {
    return `฿${(item.target / 1_000_000).toFixed(2)}M`;
  }
  return `฿${Math.round(item.target).toLocaleString()}`;
}

function formatMetric(value: number, measureType: "revenue" | "quantity" | undefined, isCurrency: boolean): string {
  if (isCurrency) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    return Math.round(value).toLocaleString();
  }
  return Math.round(value).toLocaleString();
}

const QUANTITY_CATEGORIES = new Set(["AC+", "SIM", "COVER+", "Trade In"]);

function isQuantityItem(item: CategorySnapshotItem): boolean {
  return item.measureType === "quantity" || QUANTITY_CATEGORIES.has(item.category);
}

export const CategorySnapshotSection = React.forwardRef<HTMLDivElement, { items: CategorySnapshotItem[] }>(
  ({ items }, ref) => {
  const visible = items.filter(
    (item) =>
      item.category === "Trade In" || item.target > 0 || item.actual > 0,
  );
  if (!visible.length) return null;

    return (
      <div ref={ref} className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white">Category KPI Snapshot</h3>
          <p className="text-xs text-white/50 mt-1">
            ยอดขายรายหมวด Mac / iPad / iPhone / Watch / BTB / COVER+ / AC+ / SIM / Trade In — วันนี้ vs เป้ารายวัน vs Forecast (Trade In = สิ้นสุดประมูล/ทั้งหมด)
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {visible.map((item) => {
          const Icon = ICONS[item.category] ?? DollarSign;
          const isCurrency = !isQuantityItem(item);
          const achColor =
            item.achieveRate >= 100
              ? "text-emerald-400"
              : item.achieveRate >= 80
                ? "text-amber-400"
                : "text-rose-400";
          const forecastColor =
            item.forecastRate >= 100
              ? "text-amber-400"
              : item.forecastRate >= 80
                ? "text-amber-400"
                : "text-rose-400";
          return (
            <div
              key={item.category}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/[0.08] transition-colors min-h-[260px]"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-white/60 shrink-0" />
                <span className="text-xs font-bold text-white/70 uppercase tracking-wide truncate">
                  {item.category}
                </span>
              </div>

              <div className="text-2xl font-extrabold text-white leading-none">
                {formatValue(item)}
              </div>
              {item.category === "Trade In" ? (
                <div className="text-[10px] text-white/50 -mt-2">
                  สิ้นสุดประมูล / รายการเทรดทั้งหมด
                </div>
              ) : (
                <div className="text-[10px] text-white/50 -mt-2">
                  Target {formatTarget(item)}
                </div>
              )}

              <div className="flex-1 flex flex-col gap-1.5 text-[11px] border-t border-white/5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Today</span>
                  <span className="text-white/90 font-semibold">
                    {formatMetric(item.today, item.measureType, isCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Target per Day</span>
                  <span className="text-white/90 font-semibold">
                    {formatMetric(item.targetDay, item.measureType, isCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Forecast</span>
                  <span className="text-white/90 font-semibold">
                    {formatMetric(item.forecast, item.measureType, isCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Achieve %</span>
                  <span className={`font-bold ${achColor}`}>
                    {item.achieveRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Forecast %</span>
                  <span className={`font-bold ${forecastColor}`}>
                    {item.forecastRate.toFixed(2)}%
                  </span>
                </div>
                {item.tradeInPerIphonePct != null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Trade In/iPhone (เป้า 20%)</span>
                    <span
                      className={`font-bold ${item.tradeInPerIphonePct >= 20 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {item.tradeInPerIphonePct.toFixed(2)}%
                    </span>
                  </div>
                ) : null}
                {item.tradeInAppraisalPct != null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">ยอดประเมิน (เป้า 50%)</span>
                    <span
                      className={`font-bold ${item.tradeInAppraisalPct >= 50 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {item.tradeInAppraisalPct.toFixed(2)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
