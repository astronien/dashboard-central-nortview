import React from "react";
import { CalendarDays } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySales } from "../../lib/dailySales";
import type { DailyInsights } from "../../lib/dailyInsights";

const DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const dm = (ymd: string) => {
  const [, m, d] = ymd.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** ยอดขายรวมแต่ละวันของเดือน + ค่าเฉลี่ยต่อวัน (และเฉลี่ยตามวันในสัปดาห์) */
const short = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`);
/** ป้ายบนแท่ง/จุด: ปัดเป็นพัน (412K) หรือล้าน 1 ตำแหน่ง (1.2M) */
const labelOf = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`;
};

export function DailySalesTable({
  data,
  dailyTarget,
  insights,
}: {
  data: DailySales;
  dailyTarget?: number;
  insights?: DailyInsights | null;
}) {
  const [mode, setMode] = React.useState<"bar" | "dot">("bar");
  if (!data.days.length) return null;
  const max = Math.max(...data.days.map((d) => d.baht), 1);
  // ค่าเฉลี่ยไม่นับวันนี้ที่ยังขายไม่จบ
  const avgRef = insights?.avgComplete || data.avgBaht;
  const partial = insights?.partialDay ?? null;
  const fullDays = partial ? data.days.filter((d) => d.ymd !== partial) : data.days;
  const best = (fullDays.length ? fullDays : data.days).reduce((a, b) => (b.baht > a.baht ? b : a));
  const worst = (fullDays.length ? fullDays : data.days).reduce((a, b) => (b.baht < a.baht ? b : a));
  const avgPct = (avgRef / max) * 100;
  const anomalySet = new Set((insights?.anomalies ?? []).map((a) => a.ymd));
  // เป้าของแต่ละวัน: ถ่วงตามวันในสัปดาห์ (ถ้ามี) ไม่งั้นเท่ากันทุกวัน
  const tgtOf = (ymd: string) => insights?.dayTarget[ymd] ?? dailyTarget ?? 0;
  const hasTarget = (dailyTarget ?? 0) > 0 || Boolean(insights && insights.target > 0);
  const pct = (n: number | null | undefined) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${Math.round(n)}%`);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold text-white">
            <CalendarDays className="w-4 h-4 text-white/50" />
            ยอดขายรายวัน
          </h3>
          <p className="text-[12px] text-white/60">
            {data.days.length} วัน · เฉลี่ยวันละ <b className="text-white">{baht(avgRef)}</b>
            {partial ? " (ไม่นับวันนี้ที่ยังขายไม่จบ)" : ""}
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

      {insights ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
          <Tile
            label={`ต้องทำวันละ (เหลือ ${insights.remainingDays} วัน)`}
            value={baht(insights.requiredPerDay)}
            hint={
              avgRef > 0
                ? insights.requiredPerDay > avgRef
                  ? `ต้องเร่งอีก ${Math.round((insights.requiredPerDay / avgRef) * 100 - 100)}%`
                  : "ทำได้ตามค่าเฉลี่ยก็ถึงเป้า"
                : undefined
            }
            tone={insights.requiredPerDay > avgRef ? "bad" : "good"}
          />
          <Tile
            label="เป้าวันนี้ (ถ่วงตามวัน)"
            value={baht(insights.todayTarget)}
            hint={`วันนี้หนัก ×${insights.todayFactor.toFixed(2)} ของวันที่เหลือ`}
          />
          <Tile
            label="คาดจบเดือน (ถ่วงวัน)"
            value={`${Math.round(insights.forecastPct)}%`}
            hint={baht(insights.forecast)}
            tone={insights.forecastPct >= 100 ? "good" : insights.forecastPct >= 90 ? undefined : "bad"}
          />
          <Tile label="ถึงเป้าวัน" value={`${insights.hitDays}/${insights.completeDays} วัน`} hint="เทียบเป้าถ่วงวันของแต่ละวัน" />
          <Tile
            label="3 วันดีสุด"
            value={`${Math.round(insights.top3Share)}%`}
            hint={insights.top3Share >= 35 ? "ยอดพึ่งไม่กี่วันมาก" : "ของยอดทั้งเดือน"}
            tone={insights.top3Share >= 35 ? "bad" : undefined}
          />
          <Tile label="ยอดต่อบิล" value={baht(insights.avgTicket)} hint="เฉลี่ยวันที่จบแล้ว" />
        </div>
      ) : null}

      {/* กราฟ: แท่ง / จุด · เส้นประ = ค่าเฉลี่ย · เส้นทึบ = เป้าต่อวัน */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-3 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-white/70" /> เฉลี่ย
          </span>
          {hasTarget ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-amber-300" /> {insights ? "เป้ารายวัน (ถ่วงวัน)" : "เป้าต่อวัน"}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> สูงกว่าเฉลี่ย
          </span>
          {anomalySet.size ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> ต่ำผิดปกติ
            </span>
          ) : null}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-black/20 border border-white/10 text-[12px]">
          {(
            [
              ["bar", "แท่ง"],
              ["dot", "จุด"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${mode === k ? "bg-white/15 text-white" : "text-white/60"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {/* จอแคบ: ให้แต่ละวันกว้างพอใส่ป้ายตัวเลข แล้วเลื่อนซ้ายขวาได้ */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1 mb-3">
      <div className="daily-chart h-[220px] md:h-[260px]" style={{ minWidth: `${data.days.length * 30 + 50}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data.days.map((d) => ({ ...d, label: dm(d.ymd), target: tgtOf(d.ymd) || null }))}
            margin={{ top: 20, right: 6, bottom: 0, left: -6 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
              tickFormatter={(v: number) => short(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(127,127,127,0.12)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data.days)[number];
                const vs = avgRef > 0 ? (d.baht / avgRef) * 100 - 100 : 0;
                const t = tgtOf(d.ymd);
                return (
                  <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                    <div className="font-semibold">
                      {dm(d.ymd)} ({DOW[d.dow]})
                    </div>
                    <div className="tabular-nums">{baht(d.baht)}</div>
                    <div className={`tabular-nums ${vs >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {vs >= 0 ? "+" : ""}
                      {Math.round(vs)}% เทียบเฉลี่ย
                    </div>
                    {t > 0 ? (
                      <div className="tabular-nums text-white/70">
                        เป้าวันนี้ {baht(t)} · {Math.round((d.baht / t) * 100)}%
                      </div>
                    ) : null}
                    <div className="tabular-nums text-white/70">
                      {d.bills} บิล · iPhone {d.iphone}
                    </div>
                    {d.ymd === partial ? <div className="text-amber-300">ยังขายไม่จบวัน</div> : null}
                    {anomalySet.has(d.ymd) ? <div className="text-rose-300">ต่ำผิดปกติ</div> : null}
                  </div>
                );
              }}
            />
            {mode === "bar" ? (
              <Bar dataKey="baht" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.days.map((d) => (
                  <Cell
                    key={d.ymd}
                    fill={
                      anomalySet.has(d.ymd) ? "#fb7185" : d.baht >= avgRef ? "#34d399" : "rgba(255,255,255,0.28)"
                    }
                    fillOpacity={d.ymd === partial ? 0.45 : 1}
                  />
                ))}
                <LabelList
                  dataKey="baht"
                  position="top"
                  formatter={labelOf}
                  fill="rgba(255,255,255,0.8)"
                  fontSize={11}
                  offset={4}
                />
              </Bar>
            ) : (
              <Line
                dataKey="baht"
                type="monotone"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: { baht: number; ymd: string } }) => (
                  <circle
                    key={p.payload?.ymd}
                    cx={p.cx}
                    cy={p.cy}
                    r={4}
                    fill={
                      anomalySet.has(p.payload?.ymd ?? "")
                        ? "#fb7185"
                        : (p.payload?.baht ?? 0) >= avgRef
                          ? "#34d399"
                          : "rgba(255,255,255,0.55)"
                    }
                    stroke="none"
                  />
                )}
                activeDot={{ r: 6 }}
              >
                <LabelList
                  dataKey="baht"
                  position="top"
                  formatter={labelOf}
                  fill="rgba(255,255,255,0.8)"
                  fontSize={11}
                  offset={8}
                />
              </Line>
            )}
            <ReferenceLine y={avgRef} stroke="rgba(255,255,255,0.75)" strokeDasharray="5 4" />
            {hasTarget ? (
              <Line
                dataKey="target"
                type="step"
                stroke="#fcd34d"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      </div>

      {/* เฉลี่ยตามวันในสัปดาห์ */}
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const v = data.avgByDow[dow];
          const hi = v != null && v >= avgRef;
          const mom = insights?.momByDow[dow];
          return (
            <div key={dow} className="rounded-lg bg-black/20 px-1.5 py-1.5 text-center min-w-0">
              <div className="text-[11px] text-white/60">{DOW[dow]}</div>
              <div className={`text-[12px] font-semibold tabular-nums truncate ${hi ? "text-emerald-300" : "text-white/80"}`}>
                {v == null ? "—" : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${Math.round(v / 1000)}K`}
              </div>
              {mom != null ? (
                <div className={`text-[11px] tabular-nums ${mom >= 0 ? "text-emerald-300" : "text-rose-300"}`} title="เทียบเดือนก่อน วันเดียวกันในสัปดาห์">
                  {pct(mom)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {insights ? (
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-white/65">
          {insights.momAvg != null ? (
            <span>
              เทียบเดือนก่อน (เฉลี่ยต่อวัน){" "}
              <b className={insights.momAvg >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(insights.momAvg)}</b>
            </span>
          ) : null}
          {insights.paydayLift != null ? (
            <span>
              ช่วงเงินเดือนออก (25–5) ขายมากกว่าวันอื่น{" "}
              <b className={insights.paydayLift >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(insights.paydayLift)}</b>
            </span>
          ) : null}
          {insights.boostLift != null ? (
            <span>
              ช่วงโหมด x2 เทียบนอกช่วง{" "}
              <b className={insights.boostLift >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(insights.boostLift)}</b>
            </span>
          ) : null}
          {insights.anomalies.length ? (
            <span className="text-rose-300">
              วันที่ต่ำผิดปกติ: {insights.anomalies.map((a) => `${dm(a.ymd)} (${DOW[a.dow]}) −${Math.round(a.dropPct)}%`).join(", ")}
            </span>
          ) : null}
        </div>
      ) : null}

      <details className="group">
      <summary className="cursor-pointer select-none text-[12px] font-semibold text-white/70 hover:text-white mb-2">
        ดูเป็นตาราง
      </summary>
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
              const vsAvg = avgRef > 0 ? (d.baht / avgRef) * 100 - 100 : 0;
              const tgt = hasTarget && tgtOf(d.ymd) > 0 ? (d.baht / tgtOf(d.ymd)) * 100 : null;
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
                          className={`h-full rounded-full ${d.baht >= avgRef ? "bg-emerald-400" : "bg-white/60"}`}
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
                  {(() => { const t = data.days.reduce((a, d) => a + tgtOf(d.ymd), 0); return t > 0 ? `${Math.round((data.totalBaht / t) * 100)}%` : "—"; })()}
                </td>
              ) : null}
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.totalBills.toLocaleString()}</td>
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.totalIphone.toLocaleString()}</td>
            </tr>
            <tr className="bg-black/20 font-semibold">
              <td className="py-2 px-3 text-white">เฉลี่ยต่อวัน</td>
              <td className="py-2 px-3 text-right tabular-nums text-emerald-300">{baht(avgRef)}</td>
              <td className="hidden md:table-cell" />
              <td />
              {hasTarget ? (
                <td className="py-2 px-3 text-right tabular-nums text-white/80 hidden sm:table-cell">
                  {(() => { const t = data.days.reduce((a, d) => a + tgtOf(d.ymd), 0) / data.days.length; return t > 0 ? `${Math.round((avgRef / t) * 100)}%` : "—"; })()}
                </td>
              ) : null}
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.avgBills.toFixed(1)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-white hidden sm:table-cell">{data.avgIphone.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      </details>
    </div>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2 min-w-0">
      <div className="text-[11px] text-white/60 truncate">{label}</div>
      <div
        className={`text-[17px] font-semibold tabular-nums ${tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-white"}`}
      >
        {value}
      </div>
      {hint ? <div className="text-[11px] text-white/55 truncate">{hint}</div> : null}
    </div>
  );
}
