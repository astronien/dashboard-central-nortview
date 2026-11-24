import React from "react";
import { Loader2 } from "lucide-react";
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
import {
  fetchArchiveCalc,
  fetchArchiveMonth,
  hashText,
  monthLabelTh,
  saveArchiveCalc,
  type ArchiveMonthMeta,
} from "../../lib/salesArchive";
import { CAT_TEAM, MAIN_CATS, computeMonthCat, findCatStaffKey, type MonthCat } from "../../lib/catHistory";

const cache = new Map<string, MonthCat>();
const short = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 1_000
      ? `${Math.round(n / 1000)}K`
      : `${Math.round(n)}`;
const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

/**
 * หมวดหลักรายคนย้อนหลัง — ยอดขาย (บาท) ต่อเดือนของแต่ละหมวด
 * ดูทีละคน: 1 กล่อง = 1 หมวด (เส้นเขียว = คนนั้น, เส้นประ = เฉลี่ยต่อคนของทีม)
 * เทียบทุกคน: เลือกหมวด → แท่งยอดเฉลี่ยต่อเดือนของแต่ละคน
 */
export function CatHistoryView({
  archiveKey,
  months,
  categoryMaster,
  currentMonth,
  staffOrder,
}: {
  archiveKey: string;
  months: ArchiveMonthMeta[];
  categoryMaster: RawRow[];
  currentMonth?: string;
  staffOrder: string[];
}) {
  const [range, setRange] = React.useState<3 | 6 | 0>(6);
  const [data, setData] = React.useState<Record<string, MonthCat>>({});
  const [loading, setLoading] = React.useState("");
  const [mode, setMode] = React.useState<"person" | "rank">("person");
  const [who, setWho] = React.useState<string>(CAT_TEAM);
  const [cat, setCat] = React.useState<string>(MAIN_CATS[0]);

  const salesMonths = months.filter((m) => m.rowCount > 0);
  const methodSig = React.useMemo(
    () => "v1." + hashText(JSON.stringify(categoryMaster.map((r) => [r["Cat & Sub Cat"], r["CAT Daily"]]))),
    [categoryMaster],
  );

  // คิดครั้งเดียวเก็บที่ server (เหมือน ATT รายคน)
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading("กำลังโหลด…");
      const saved = await fetchArchiveCalc<MonthCat>(archiveKey, "cat");
      if (cancelled) return;
      const next: Record<string, MonthCat> = {};
      const todo = salesMonths.filter((m) => {
        const sig = `${m.signature}|${methodSig}`;
        const k = `${archiveKey}|${m.month}|${sig}`;
        const mem = cache.get(k) ?? (saved[m.month]?.sig === sig ? saved[m.month]?.data : undefined);
        if (mem) {
          cache.set(k, mem);
          next[m.month] = mem;
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
        const v = computeMonthCat(rows, categoryMaster);
        cache.set(`${archiveKey}|${m.month}|${sig}`, v);
        next[m.month] = v;
        setData({ ...next });
        void saveArchiveCalc(archiveKey, "cat", m.month, sig, v);
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

  const people = React.useMemo(() => {
    const out: string[] = [];
    for (const n of staffOrder) if (used.some((m) => findCatStaffKey(data[m], n))) out.push(n);
    for (const m of used)
      for (const k of Object.keys(data[m] ?? {}))
        if (k !== CAT_TEAM && !out.some((x) => x === k || findCatStaffKey({ [x]: {} } as MonthCat, k))) out.push(k);
    return out;
  }, [used.join(","), data, staffOrder]);

  const valOf = (m: string, person: string, c: string) => {
    const md = data[m];
    if (!md) return null;
    const k = person === CAT_TEAM ? CAT_TEAM : findCatStaffKey(md, person);
    return k ? md[k]?.[c]?.baht ?? 0 : null;
  };
  /** เฉลี่ยต่อคนของทีมในเดือนนั้น = ยอดทีม ÷ จำนวนคนที่มียอดเดือนนั้น */
  const perHead = (m: string, c: string) => {
    const md = data[m];
    if (!md) return null;
    const heads = Object.keys(md).filter((k) => k !== CAT_TEAM && Object.values(md[k]).some((x) => x.baht > 0)).length;
    return heads ? (md[CAT_TEAM]?.[c]?.baht ?? 0) / heads : null;
  };
  const avgOf = (person: string, c: string) => {
    const xs = used.map((m) => valOf(m, person, c)).filter((x): x is number => x != null);
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-white/65">
          ยอดขายต่อเดือน · เฉลี่ย {used.length} เดือนล่าสุด
          {used.length ? ` (${monthLabelTh(used[0])} – ${monthLabelTh(used[used.length - 1])})` : ""} · ไม่นับเดือนนี้
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
              onClick={() => setMode(k)}
              className={`px-3 py-1.5 rounded-lg font-semibold ${mode === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {mode === "person" ? (
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[13px]"
          >
            <option value={CAT_TEAM}>ทั้งร้าน</option>
            {people.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {MAIN_CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold ${cat === c ? "bg-white/15 border-white/25 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "person" ? (
        <>
          <p className="-mt-2 text-[12px] text-white/60">
            แต่ละกล่อง = 1 หมวด · เส้นเขียว = {who === CAT_TEAM ? "ยอดทั้งร้าน" : who.split(" ")[0]}
            {who !== CAT_TEAM ? " · เส้นประ = เฉลี่ยต่อคนของทีม" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {MAIN_CATS.map((c) => {
              const series = used.map((m) => ({ label: monthLabelTh(m), me: valOf(m, who, c), team: perHead(m, c) }));
              const avg = avgOf(who, c);
              const last = series[series.length - 1]?.me ?? null;
              const prev = series.length > 1 ? series[series.length - 2]?.me ?? null : null;
              const ch = last != null && prev ? (last / prev) * 100 - 100 : null;
              return (
                <div key={c} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-semibold text-white">{c}</div>
                    <div className="text-right">
                      <span className="text-xl font-semibold tabular-nums text-white">{avg == null ? "—" : short(avg)}</span>
                      <span className="text-[11px] text-white/55"> /เดือน</span>
                      {ch != null ? (
                        <div className={`text-[11px] ${ch >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          เดือนล่าสุด {ch >= 0 ? "+" : ""}
                          {Math.round(ch)}%
                        </div>
                      ) : null}
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
                          width={48}
                          tickCount={4}
                          domain={[0, "auto"]}
                          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                          tickFormatter={(v: number) => (v === 0 ? "0" : short(v))}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as (typeof series)[number];
                            return (
                              <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                                <div className="font-semibold">{d.label}</div>
                                <div>{d.me == null ? "—" : baht(d.me)}</div>
                                {who !== CAT_TEAM && d.team != null ? <div className="text-white/70">เฉลี่ยต่อคน {baht(d.team)}</div> : null}
                              </div>
                            );
                          }}
                        />
                        {who !== CAT_TEAM ? (
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
          const bars = people
            .map((n) => ({ name: n.split(" ")[0], full: n, v: avgOf(n, cat) }))
            .filter((x) => x.v != null && x.v > 0)
            .sort((a, b) => (b.v ?? 0) - (a.v ?? 0));
          const heads = used.map((m) => perHead(m, cat)).filter((x): x is number => x != null);
          const teamAvg = heads.length ? heads.reduce((s, x) => s + x, 0) / heads.length : null;
          return (
            <>
              <p className="-mt-2 text-[12px] text-white/60">
                {cat}: ยอดเฉลี่ยต่อเดือนของแต่ละคน · แท่งเขียว = สูงกว่าเฉลี่ยต่อคนของทีม · เส้นประ = เฉลี่ยต่อคน {teamAvg != null ? short(teamAvg) : "—"}
              </p>
              <div className="daily-chart" style={{ height: `${Math.max(160, bars.length * 34 + 30)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickFormatter={(v: number) => short(v)} />
                    <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(127,127,127,0.12)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof bars)[number];
                        return (
                          <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                            <div className="font-semibold">{d.full}</div>
                            <div>เฉลี่ย {baht(d.v ?? 0)} ต่อเดือน</div>
                          </div>
                        );
                      }}
                    />
                    {teamAvg != null ? <ReferenceLine x={teamAvg} stroke="rgba(255,255,255,0.6)" strokeDasharray="4 3" /> : null}
                    <Bar dataKey="v" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                      {bars.map((b) => (
                        <Cell key={b.full} fill={teamAvg != null && (b.v ?? 0) >= teamAvg ? "#34d399" : "rgba(255,255,255,0.35)"} />
                      ))}
                      <LabelList dataKey="v" position="right" formatter={(v: unknown) => short(Number(v))} fill="rgba(255,255,255,0.85)" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
