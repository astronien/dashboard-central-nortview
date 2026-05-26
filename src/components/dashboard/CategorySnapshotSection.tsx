import type { LucideIcon } from "lucide-react";
import { Building, Building2, CreditCard, DollarSign, Laptop, Smartphone, Tablet, Watch } from "lucide-react";
import type { CategorySnapshotItem } from "../../lib/categorySnapshotBuilder";

const ICONS: Record<string, LucideIcon> = {
  "Total Sales": DollarSign,
  Mac: Laptop,
  iPad: Tablet,
  iPhone: Smartphone,
  "Apple Watch": Watch,
  "BTB(Apple)": Building2,
  BTB: Building,
  SIM: CreditCard,
};

function formatValue(item: CategorySnapshotItem): string {
  if (item.measureType === "quantity") {
    return item.actual.toLocaleString();
  }
  if (item.actual >= 1_000_000) {
    return `฿${(item.actual / 1_000_000).toFixed(2)}M`;
  }
  return `฿${Math.round(item.actual).toLocaleString()}`;
}

function formatTarget(item: CategorySnapshotItem): string {
  if (item.measureType === "quantity") {
    return item.target.toLocaleString();
  }
  if (item.target >= 1_000_000) {
    return `฿${(item.target / 1_000_000).toFixed(2)}M`;
  }
  return `฿${Math.round(item.target).toLocaleString()}`;
}

export function CategorySnapshotSection({ items }: { items: CategorySnapshotItem[] }) {
  const visible = items.filter((item) => item.target > 0 || item.actual > 0);
  if (!visible.length) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white">Category KPI Snapshot</h3>
          <p className="text-xs text-white/50 mt-1">
            เป้ารายหมวด iPhone / iPad / Mac / Watch / SIM / BTB / BTB(Apple) จากไฟล์เป้า
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {visible.map((item) => {
          const Icon = ICONS[item.category] ?? DollarSign;
          const achColor =
            item.achieveRate >= 100
              ? "text-emerald-400"
              : item.achieveRate >= 80
                ? "text-amber-400"
                : "text-rose-400";
          return (
            <div
              key={item.category}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2 hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide truncate">
                  {item.category}
                </span>
              </div>
              <div className="text-lg font-bold text-white leading-tight">{formatValue(item)}</div>
              <div className="text-[10px] text-white/50">
                เป้า {formatTarget(item)}
              </div>
              <div className={`text-sm font-semibold ${achColor}`}>
                {item.achieveRate.toFixed(1)}%
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  style={{ width: `${Math.min(item.achieveRate, 140)}%` }}
                />
              </div>
              <div className="text-[9px] text-white/40">
                FC {item.forecastRate.toFixed(0)}% • วันนี้ {item.todayAchieveRate.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
