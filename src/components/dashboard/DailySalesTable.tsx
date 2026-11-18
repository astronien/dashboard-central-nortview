import React from "react";
import { CalendarDays } from "lucide-react";
import type { DailySales } from "../../lib/dailySales";

const DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const dm = (ymd: string) => {
  const [, m, d] = ymd.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** ยอดขายรวมแต่ละวันของเดือน + ค่าเฉลี่ยต่อวัน (และเฉลี่ยตามวันในสัปดาห์) */
export function DailySalesTable({ data, dailyTarget }: { data: DailySales; dailyTarget?: number }) {
  if (!data.days.length) return null;
  const max = Math.max(...data.days.map((d) => d.baht), 1);
  const best = data.days.reduce((a, b) => (b.baht > a.baht ? b : a));
  const worst = data.days.reduce((a, b) => (b.baht < a.baht ? b : a));
  const avgPct = (data.avgBaht / max) * 100;
  const hasTarget = (dailyTarget ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold text-white">
            <CalendarDays className="w-4 h-4 text-white/50" />
            ยอดขายรายวัน
          </h3>
          <p className="text-[12px] text-white/60">
            {data.days.length} วัน · เฉลี่ยวันละ <b className="text-white">{baht(data.avgBaht)}</b>
            {hasTarget ? ` · เป้าต่อวัน ${baht(dailyTarget!)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
          <span className="text-white/60">
            ดีสุด <b className="text-emerald-300">{dm(best.ymd)} ({DOW[best.dow]})</b> {baht(best.baht)}
          </span>
          <span className="text-white/60">
            ต่ำสุด <b className="text-white">{dm(worst.ymd)} ({DOW[worst.dow]})</b> {baht(worst.baht)}
          </span>
        </div>
      </div>

      {/* เฉลี่ยตามวันในสัปดาห์ */}
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const v = data.avgByDow[dow];
          const hi = v != null && v >= data.avgBaht;
          return (
            <div key={dow} className="rounded-lg bg-black/20 px-1.5 py-1.5 text-center min-w-0">
              <div className="text-[11px] text-white/60">{DOW[dow]}</div>
              <div className={`text-[12px] font-semibold tabular-nums truncate ${hi ? "text-emerald-300" : "text-white/80"}`}>
                {v == null ? "—" : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${Math.round(v / 1000)}K`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[11px]">
              <th className="py-2 px-3 font-semibold">วันที่</th>
              <th className="py-2 px-3 font-semibold text-right">ยอดขาย</th>
              <th className="py-2 px-3 font-semibold min-w-[140px] hidden md:table-cell">
                <span className="text-white/50">ขีดขาว = ค่าเฉลี่ย</span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">เทียบเฉลี่ย</th>
              {hasTarget ? <th className="py-2 px-3 font-semibold text-right hidden sm:table-cell">ถึงเป้าวัน</th> : null}
              <th className="py-2 px-3 font-semibold text-right hidden sm:table-cell">บิล</th>
              <th className="py-2 px-3 font-semibold text-right hidden sm:table-cell">iPhone</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => {
              const vsAvg = data.avgBaht > 0 ? (d.baht / data.avgBaht) * 100 - 100 : 0;
              const tgt = hasTarget ? (d.baht / dailyTarget!) * 100 : null;
              const weekend = d.dow === 0 || d.dow === 6;
              return (
                <tr key={d.ymd} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <span className="text-white tabular-nums">{dm(d.ymd)}</span>{" "}
                    <span className={weekend ? "text-white/80" : "text-white/50"}>{DOW[d.dow]}</span>
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-white">{baht(d.baht)}</td>
                  <td className="py-1.5 px-3 hidden md:table-cell">
                    <div className="relative">
                      <div className="h-1.5 rounded-full pace-track bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${d.baht >= data.avgBaht ? "bg-emerald-400" : "bg-white/60"}`}
                          style={{ width: `${Math.max(2, (d.baht / max) * 100)}%` }}
                        />
                      </div>
                      <div className="absolute -top-0.5 h-2.5 w-0.5 rounded pace-tick bg-white" style={{ left: `calc(${avgPct}% - 1px)` }} />
                    </div>
                  </td>
                  <td className={`py-1.5 px-3 text-right tabular-nums ${vsAvg >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {vsAvg >= 0 ? "+" : ""}
                    {Math.round(vsAvg)}%
                  </td>
                  {hasTarget ? (
                    <td className={`py-1.5 px-3 text-right tabular-nums hidden sm:table-cell ${tgt! >= 100 ? "text-emerald-300" : "text-white/70"}`}>
                      {Math.round(tgt!)}%
                    </td>
                  ) : null}
                  <td className="py-1.5 px-3 text-right tabular-nums text-white/75 hidden sm:table-cell">{d.bills.toLocaleString()}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-white/75 hidden sm:table-cell">{d.iphone.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15 bg-black/20 font-semibold">
              <td className="py-2 px-3 text-white">รวม</td>
              <td className="py-2 px-3 text-right tabular-nums text-white">{baht(data.totalBaht)}</td>
              <td className="hidden md:table-cell" />
              <td />
              {hasTarget ? (
                <td className="py-2 px-3 text-right tabular-nums text-white/80 hidden sm:table-cell">
                  {Math.round((data.totalBaht / (dailyTarget! * data.days.length)) * 100)}%
                </td>
              ) : null}
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.totalBills.toLocaleString()}</td>
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.totalIphone.toLocaleString()}</td>
            </tr>
            <tr className="bg-black/20 font-semibold">
              <td className="py-2 px-3 text-white">เฉลี่ยต่อวัน</td>
              <td className="py-2 px-3 text-right tabular-nums text-emerald-300">{baht(data.avgBaht)}</td>
              <td className="hidden md:table-cell" />
              <td />
              {hasTarget ? (
                <td className="py-2 px-3 text-right tabular-nums text-white/80 hidden sm:table-cell">
                  {Math.round((data.avgBaht / dailyTarget!) * 100)}%
                </td>
              ) : null}
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.avgBills.toFixed(1)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.avgIphone.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
