import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock } from "lucide-react";
import type { HourlySales } from "../../lib/hourlySales";

type Metric = "baht" | "bills";

const fmtBaht = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${Math.round(n / 1000)}K` : Math.round(n).toLocaleString();
const fmtDay = (ymd: string) => (ymd ? ymd.split("-").reverse().slice(0, 2).join("/") : "");
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * ช่วงเวลาที่ขายดีในวัน — ยอดเฉลี่ยต่อวันของแต่ละชั่วโมง (ตลอดทั้งเดือน)
 * แท่งที่ขายดีที่สุด 3 ชั่วโมงใช้สีเน้น ที่เหลือเป็นสีกลาง
 */
export function HourlySalesSection({ data, compact = false }: { data: HourlySales; compact?: boolean }) {
  const [metric, setMetric] = React.useState<Metric>("baht");
  if (!data.points.length) return null;

  const val = (p: HourlySales["points"][number]) => (metric === "baht" ? p.avgBaht : p.avgBills);
  const ranked = [...data.points].sort((a, b) => val(b) - val(a));
  const top = new Set(ranked.slice(0, 3).map((p) => p.hour));
  const peak = ranked[0];
  const quiet = ranked[ranked.length - 1];
  const chartData = data.points.map((p) => ({ ...p, v: val(p), label: String(p.hour).padStart(2, "0") }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold text-white">
            <Clock className="w-4 h-4 text-white/50" />
            ช่วงเวลาที่ขายดี
          </h3>
          <p className="text-[12px] text-white/50">
            เฉลี่ยต่อวัน {fmtDay(data.fromDate)}–{fmtDay(data.toDate)} ({data.days} วัน)
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-black/20 border border-white/10 text-[12px]">
          {(
            [
              ["baht", "ยอดขาย"],
              ["bills", "จำนวนบิล"],
            ] as Array<[Metric, string]>
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${metric === k ? "bg-white/15 text-white" : "text-white/55"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <div>
          <span className="text-white/50">ขายดีสุด </span>
          <span className="font-semibold text-emerald-300 tabular-nums">
            {hourLabel(peak.hour)}–{hourLabel(peak.hour + 1)}
          </span>
          <span className="text-white/60 tabular-nums">
            {" "}
            · {metric === "baht" ? `฿${fmtBaht(peak.avgBaht)}` : `${peak.avgBills.toFixed(1)} บิล`} ต่อวัน
          </span>
        </div>
        <div>
          <span className="text-white/50">เงียบสุด </span>
          <span className="font-semibold text-white tabular-nums">
            {hourLabel(quiet.hour)}–{hourLabel(quiet.hour + 1)}
          </span>
        </div>
      </div>

      <div className={`hourly-chart ${compact ? "h-[180px] mt-2" : "h-[240px] mt-3"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: compact ? -20 : -8 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              interval={compact ? 1 : 0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={compact ? 40 : 48}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              tickFormatter={(v: number) => (metric === "baht" ? fmtBaht(v) : String(Math.round(v * 10) / 10))}
            />
            <Tooltip
              cursor={{ fill: "rgba(127,127,127,0.12)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof chartData)[number];
                return (
                  <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                    <div className="font-semibold">
                      {hourLabel(p.hour)}–{hourLabel(p.hour + 1)}
                    </div>
                    <div className="tabular-nums">฿{Math.round(p.avgBaht).toLocaleString()} ต่อวัน</div>
                    <div className="tabular-nums text-white/70">{p.avgBills.toFixed(1)} บิลต่อวัน</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {chartData.map((p) => (
                <Cell key={p.hour} fill={top.has(p.hour) ? "#34d399" : "rgba(255,255,255,0.22)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
