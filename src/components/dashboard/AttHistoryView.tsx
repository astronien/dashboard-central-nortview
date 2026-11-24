import React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RawRow } from "../../lib/salesAggregations";
import type { Preset } from "../../lib/presetTypes";
import { fetchArchiveCalc, fetchArchiveMonth, hashText, monthLabelTh, saveArchiveCalc, type ArchiveMonthMeta } from "../../lib/salesArchive";
import {
  TEAM,
  attAxes,
  computeMonthAtt,
  findStaffKey,
  rateOf,
  sumCells,
  type AttCell,
  type MonthAtt,
} from "../../lib/attHistory";

// ผลคำนวณต่อเดือน เก็บไว้ระหว่างเปิดหน้า (คีย์รวมลายเซ็นข้อมูล + ชุด preset)
const cache = new Map<string, MonthAtt>();

const fmtPct = (n: number | null) => (n == null ? "—" : `${Math.round(n)}%`);

/**
 * ATT รายคนย้อนหลัง
 * แบบที่ 1: ตารางทุกคน × ทุกแกน (ค่าเฉลี่ย + แนวโน้ม)
 * แบบที่ 2: เลือกทีละคน แถว = เดือน
 * ค่าเฉลี่ย = รวมจำนวนที่แนบทุกเดือน ÷ รวมฐานทุกเดือน · ไม่รวมเดือนนี้ (ยังไม่จบ)
 */
export function AttHistoryView({
  archiveKey,
  months,
  presets,
  categoryMaster,
  currentMonth,
  staffOrder,
}: {
  archiveKey: string;
  months: ArchiveMonthMeta[];
  presets: Preset[];
  categoryMaster: RawRow[];
  currentMonth?: string;
  /** ลำดับชื่อพนักงานปัจจุบัน (คนที่ยังอยู่ขึ้นก่อน) */
  staffOrder: string[];
}) {
  const axes = React.useMemo(() => attAxes(presets), [presets]);
  const [range, setRange] = React.useState<3 | 6 | 0>(6);
  const [data, setData] = React.useState<Record<string, MonthAtt>>({});
  const [loading, setLoading] = React.useState("");
  const [person, setPerson] = React.useState<string>("");
  const [chartMode, setChartMode] = React.useState<"person" | "rank">("person");
  const [who, setWho] = React.useState<string>(TEAM);
  const [axisId, setAxisId] = React.useState<string>("");

  const salesMonths = months.filter((m) => m.rowCount > 0);
  const presetSig = axes.map((p) => `${p.id}:${p.targetPercent ?? ""}:${JSON.stringify(p.filtersA ?? [])}`).join("|");

  // ลายเซ็นของ "วิธีคิด" = เกณฑ์ preset + Category Master — เปลี่ยนเมื่อไรค่อยคิดใหม่
  const methodSig = React.useMemo(
    () => hashText(presetSig) + "." + hashText(JSON.stringify(categoryMaster.map((r) => [r["Cat & Sub Cat"], r["CAT Daily"]]))),
    [presetSig, categoryMaster],
  );

  // คิดครั้งเดียวแล้วเก็บไว้ที่ server — เปิดใหม่/เครื่องอื่นใช้ผลเดิม
  // คิดใหม่เฉพาะเดือนที่ข้อมูลเปลี่ยน (เช่น เดือนนี้) หรือเมื่อแก้ KPI Preset / Category Master
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading("กำลังโหลด…");
      const saved = await fetchArchiveCalc<MonthAtt>(archiveKey, "att");
      if (cancelled) return;
      const next: Record<string, MonthAtt> = {};
      const todo = salesMonths.filter((m) => {
        const sig = `${m.signature}|${methodSig}`;
        const mem = cache.get(`${archiveKey}|${m.month}|${sig}`);
        if (mem) {
          next[m.month] = mem;
          return false;
        }
        const sv = saved[m.month];
        if (sv && sv.sig === sig && sv.data) {
          next[m.month] = sv.data;
          cache.set(`${archiveKey}|${m.month}|${sig}`, sv.data);
          return false;
        }
        return true;
      });
      setData({ ...next });
      for (let i = 0; i < todo.length; i++) {
        const m = todo[i];
        const sig = `${m.signature}|${methodSig}`;
        setLoading(`กำลังคำนวณ ${monthLabelTh(m.month)} (${i + 1}/${todo.length})`);
        const rows = await fetchArchiveMonth(archiveKey, m.month);
        if (cancelled) return;
        const v = computeMonthAtt(rows, axes, categoryMaster);
        cache.set(`${archiveKey}|${m.month}|${sig}`, v);
        next[m.month] = v;
        setData({ ...next });
        void saveArchiveCalc(archiveKey, "att", m.month, sig, v);
      }
      if (!cancelled) setLoading("");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveKey, salesMonths.map((m) => `${m.month}:${m.signature}`).join(","), methodSig]);

  const done = salesMonths.map((m) => m.month).filter((m) => m !== currentMonth && data[m]);
  const used = range ? done.slice(-range) : done;
  const curData = currentMonth ? data[currentMonth] : undefined;

  // รายชื่อ: คนปัจจุบันก่อน แล้วตามด้วยคนที่เคยมียอดในช่วงที่เลือก
  const people = React.useMemo(() => {
    const out: string[] = [];
    const seen = (n: string) => out.some((x) => x === n);
    for (const n of staffOrder) if (used.some((m) => findStaffKey(data[m], n))) out.push(n);
    for (const m of used)
      for (const k of Object.keys(data[m] ?? {}))
        if (k !== TEAM && !out.some((x) => findStaffKey({ [x]: {} } as MonthAtt, k) || x === k) && !seen(k)) out.push(k);
    return out;
  }, [used.join(","), data, staffOrder]);

  const cellOf = (m: string, who: string, pid: string): AttCell | undefined => {
    const md = data[m];
    if (!md) return undefined;
    const k = who === TEAM ? TEAM : findStaffKey(md, who);
    return k ? md[k]?.[pid] : undefined;
  };
  const avgOf = (who: string, pid: string) => sumCells(used.map((m) => cellOf(m, who, pid)));
  const trendOf = (who: string, pid: string): "up" | "down" | "flat" | null => {
    if (used.length < 2) return null;
    const last = rateOf(cellOf(used[used.length - 1], who, pid));
    const before = rateOf(sumCells(used.slice(0, -1).map((m) => cellOf(m, who, pid))));
    if (last == null || before == null) return null;
    return last - before >= 3 ? "up" : before - last >= 3 ? "down" : "flat";
  };
  const tone = (rate: number | null, p: Preset) => {
    const t = p.targetPercent ?? 0;
    if (rate == null || !(t > 0)) return "text-white/80";
    if (rate >= t) return "text-emerald-300 font-semibold";
    if (rate >= t * 0.8) return "text-white/85";
    return "text-rose-300 font-semibold";
  };
  const Trend = ({ t }: { t: ReturnType<typeof trendOf> }) =>
    t === "up" ? (
      <ArrowUpRight className="inline w-3.5 h-3.5 text-emerald-300" />
    ) : t === "down" ? (
      <ArrowDownRight className="inline w-3.5 h-3.5 text-rose-300" />
    ) : t === "flat" ? (
      <ArrowRight className="inline w-3.5 h-3.5 text-white/40" />
    ) : null;

  if (!axes.length) {
    return <p className="text-[13px] text-white/60">ยังไม่มี KPI แบบอัตราแนบที่เปิด "แสดงใน Staff Profile" ในหน้า KPI Preset</p>;
  }

  const sel = person || people[0] || "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-white/65">
          เฉลี่ย {used.length} เดือนล่าสุด{used.length ? ` (${monthLabelTh(used[0])} – ${monthLabelTh(used[used.length - 1])})` : ""} · ไม่นับเดือนนี้
        </p>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-white/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {loading}
            </span>
          ) : null}
          <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[12px]">
            {(
              [
                [3, "3 เดือน"],
                [6, "6 เดือน"],
                [0, "ทั้งหมด"],
              ] as Array<[3 | 6 | 0, string]>
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-lg font-semibold ${range === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── กราฟ (ดูง่าย) ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[13px]">
          {(
            [
              ["person", "ดูทีละคน"],
              ["rank", "เทียบทุกคน"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setChartMode(k)}
              className={`px-3 py-1.5 rounded-lg font-semibold ${chartMode === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {chartMode === "person" ? (
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[13px]"
          >
            <option value={TEAM}>ทั้งทีม</option>
            {people.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {axes.map((p) => {
              const on = (axisId || axes[0].id) === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAxisId(p.id)}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold ${on ? "bg-white/15 border-white/25 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {chartMode === "person" ? (
        <>
          <p className="-mt-2 text-[12px] text-white/60">
            แต่ละกล่อง = 1 แกน · เส้นเขียว = {who === TEAM ? "ทั้งทีม" : who.split(" ")[0]} · เส้นประ = เฉลี่ยทีม · เส้นเหลือง = เป้า
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {axes.map((p) => {
              const series = used.map((m) => ({
                label: monthLabelTh(m),
                me: rateOf(cellOf(m, who, p.id)),
                team: rateOf(cellOf(m, TEAM, p.id)),
              }));
              const avg = rateOf(avgOf(who, p.id));
              const t = p.targetPercent ?? 0;
              const reach = avg != null && t > 0 ? avg >= t : null;
              return (
                <div key={p.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-semibold text-white truncate">{p.name}</div>
                    <div className="text-right">
                      <span className={`text-xl font-semibold tabular-nums ${reach == null ? "text-white" : reach ? "text-emerald-300" : "text-rose-300"}`}>
                        {fmtPct(avg)}
                      </span>
                      {t > 0 ? <span className="text-[11px] text-white/55"> / เป้า {t}%</span> : null}
                    </div>
                  </div>
                  <div className="daily-chart h-[120px] mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          tickCount={4}
                          domain={[0, "auto"]}
                          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                          tickFormatter={(v: number) => `${Math.round(v)}%`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as (typeof series)[number];
                            return (
                              <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                                <div className="font-semibold">{d.label}</div>
                                <div>{who === TEAM ? "ทีม" : who.split(" ")[0]} {fmtPct(d.me)}</div>
                                {who !== TEAM ? <div className="text-white/70">ทีม {fmtPct(d.team)}</div> : null}
                              </div>
                            );
                          }}
                        />
                        {t > 0 ? <ReferenceLine y={t} stroke="#fcd34d" strokeWidth={1.5} /> : null}
                        {who !== TEAM ? (
                          <Line dataKey="team" stroke="rgba(255,255,255,0.55)" strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
                        ) : null}
                        <Line dataKey="me" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} isAnimationActive={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        (() => {
          const p = axes.find((x) => x.id === (axisId || axes[0].id)) ?? axes[0];
          const t = p.targetPercent ?? 0;
          const team = rateOf(avgOf(TEAM, p.id));
          const bars = people
            .map((n) => ({ name: n.split(" ")[0], full: n, v: rateOf(avgOf(n, p.id)), c: avgOf(n, p.id) }))
            .filter((x) => x.v != null)
            .sort((a, b) => (b.v ?? 0) - (a.v ?? 0));
          return (
            <>
              <p className="-mt-2 text-[12px] text-white/60">
                {p.name} เฉลี่ย {used.length} เดือน · แท่งเขียว = ถึงเป้า · เส้นเหลือง = เป้า{t ? ` ${t}%` : ""} · เส้นประ = เฉลี่ยทีม {fmtPct(team)}
              </p>
              <div className="daily-chart" style={{ height: `${Math.max(160, bars.length * 34 + 30)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(127,127,127,0.12)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof bars)[number];
                        return (
                          <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                            <div className="font-semibold">{d.full}</div>
                            <div>
                              {fmtPct(d.v)} · แนบ {d.c.a} จาก {d.c.b}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {t > 0 ? <ReferenceLine x={t} stroke="#fcd34d" strokeWidth={1.5} /> : null}
                    {team != null ? <ReferenceLine x={team} stroke="rgba(255,255,255,0.6)" strokeDasharray="4 3" /> : null}
                    <Bar dataKey="v" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                      {bars.map((b) => (
                        <Cell key={b.full} fill={t > 0 && (b.v ?? 0) >= t ? "#34d399" : "rgba(255,255,255,0.35)"} />
                      ))}
                      <LabelList dataKey="v" position="right" formatter={(v: unknown) => fmtPct(Number(v))} fill="rgba(255,255,255,0.85)" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          );
        })()
      )}

      <details>
        <summary className="cursor-pointer select-none text-[13px] font-semibold text-white/70 hover:text-white">ดูเป็นตาราง</summary>
        <div className="mt-3 flex flex-col gap-5">
      {/* แบบที่ 1: ทุกคน × ทุกแกน */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[12px]">
              <th className="py-2 px-3 font-semibold sticky left-0 bg-[#0c3123] z-10">พนักงาน</th>
              {axes.map((p) => (
                <th key={p.id} className="py-2 px-3 font-semibold text-right whitespace-nowrap">
                  {p.name}
                  {p.targetPercent ? <div className="text-[11px] font-normal text-white/50">เป้า {p.targetPercent}%</div> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((n) => (
              <tr
                key={n}
                onClick={() => setPerson(n)}
                className={`border-b border-white/5 cursor-pointer hover:bg-white/5 ${n === sel ? "bg-white/[0.04]" : ""}`}
              >
                <td className="py-2 px-3 text-white whitespace-nowrap sticky left-0 bg-[#0a1f17] z-10">{n}</td>
                {axes.map((p) => {
                  const c = avgOf(n, p.id);
                  const r = rateOf(c);
                  return (
                    <td key={p.id} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className={tone(r, p)}>{fmtPct(r)}</span> <Trend t={trendOf(n, p.id)} />
                      {c.b > 0 ? <div className="text-[11px] text-white/45">{c.a}/{c.b}</div> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-white/15 bg-black/20">
              <td className="py-2 px-3 font-semibold text-white sticky left-0 bg-[#0c3123] z-10">เฉลี่ยทั้งทีม</td>
              {axes.map((p) => {
                const c = avgOf(TEAM, p.id);
                const r = rateOf(c);
                return (
                  <td key={p.id} className="py-2 px-3 text-right tabular-nums font-semibold">
                    <span className={tone(r, p)}>{fmtPct(r)}</span> <Trend t={trendOf(TEAM, p.id)} />
                    {c.b > 0 ? <div className="text-[11px] font-normal text-white/45">{c.a}/{c.b}</div> : null}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-[12px] text-white/55">กดชื่อพนักงานเพื่อดูรายเดือนด้านล่าง · ตัวเลขเล็ก = แนบได้ / ฐาน</p>

      {/* แบบที่ 2: ทีละคน */}
      {sel ? (
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="text-base font-semibold text-white">รายเดือนของ</h3>
            <select
              value={sel}
              onChange={(e) => setPerson(e.target.value)}
              className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[13px]"
            >
              {people.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[12px]">
                  <th className="py-2 px-3 font-semibold">เดือน</th>
                  {axes.map((p) => (
                    <th key={p.id} className="py-2 px-3 font-semibold text-right whitespace-nowrap">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...used].reverse().map((m) => (
                  <tr key={m} className="border-b border-white/5">
                    <td className="py-2 px-3 text-white whitespace-nowrap">{monthLabelTh(m)}</td>
                    {axes.map((p) => {
                      const c = cellOf(m, sel, p.id);
                      const r = rateOf(c);
                      return (
                        <td key={p.id} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                          <span className={tone(r, p)}>{fmtPct(r)}</span>
                          {c && c.b > 0 ? <span className="text-[11px] text-white/45"> {c.a}/{c.b}</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-white/15 bg-black/20 font-semibold">
                  <td className="py-2 px-3 text-white">เฉลี่ยของ {sel.split(" ")[0]}</td>
                  {axes.map((p) => {
                    const r = rateOf(avgOf(sel, p.id));
                    return (
                      <td key={p.id} className="py-2 px-3 text-right tabular-nums">
                        <span className={tone(r, p)}>{fmtPct(r)}</span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-black/20">
                  <td className="py-2 px-3 text-white/70">เฉลี่ยทั้งทีม</td>
                  {axes.map((p) => {
                    const mine = rateOf(avgOf(sel, p.id));
                    const team = rateOf(avgOf(TEAM, p.id));
                    const diff = mine != null && team != null ? mine - team : null;
                    return (
                      <td key={p.id} className="py-2 px-3 text-right tabular-nums text-white/70">
                        {fmtPct(team)}
                        {diff != null ? (
                          <div className={`text-[11px] ${diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {diff >= 0 ? "สูงกว่าทีม" : "ต่ำกว่าทีม"} {Math.abs(Math.round(diff))}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
                {curData ? (
                  <tr className="text-white/60">
                    <td className="py-2 px-3 whitespace-nowrap">
                      {monthLabelTh(currentMonth!)} <span className="text-[11px]">(ยังไม่จบ ไม่นับในค่าเฉลี่ย)</span>
                    </td>
                    {axes.map((p) => {
                      const k = findStaffKey(curData, sel);
                      const c = k ? curData[k]?.[p.id] : undefined;
                      return (
                        <td key={p.id} className="py-2 px-3 text-right tabular-nums">
                          {fmtPct(rateOf(c))}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
        </div>
      </details>
    </div>
  );
}
