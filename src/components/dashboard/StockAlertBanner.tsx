import React from "react";
import { BellRing, ChevronRight } from "lucide-react";
import type { ReorderItem } from "../../lib/runRate";
import type { UpcomingReorder } from "../../lib/runRatePrefs";

/** แจ้งเตือนสต็อกบนหน้าหลัก: ใกล้หมด + เฝ้าดู */
export function StockAlertBanner({
  now,
  soon,
  warnDays,
  onOpen,
}: {
  now: ReorderItem[];
  soon: UpcomingReorder[];
  warnDays: number;
  onOpen?: () => void;
}) {
  if (!now.length && !soon.length) return null;
  const names = [...now.map((r) => r.label), ...soon.map((r) => r.label)].slice(0, 3);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="w-full flex items-start gap-3 text-left rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 transition-colors hover:bg-amber-500/15 disabled:cursor-default"
    >
      <BellRing className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-white">
          {now.length ? `สินค้าใกล้หมด ${now.length} รายการ` : ""}
          {now.length && soon.length ? " · " : ""}
          {soon.length ? `เฝ้าดู ${soon.length} รายการ (จะใกล้หมดใน ${warnDays} วัน)` : ""}
        </div>
        <div className="text-[12px] text-white/65 truncate">
          {names.join(" · ")}
          {now.length + soon.length > names.length ? ` และอีก ${now.length + soon.length - names.length} รายการ` : ""}
        </div>
      </div>
      {onOpen ? <ChevronRight className="w-4 h-4 text-white/50 shrink-0 mt-1" /> : null}
    </button>
  );
}
