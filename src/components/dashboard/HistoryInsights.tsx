import React from "react";
import { ArrowDown, ArrowUp, Minus, Sparkles, Target } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Cell,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RawRow } from "../../lib/salesAggregations";
import type { Preset } from "../../lib/presetTypes";
import { fetchArchiveTarget, monthLabelTh, type ArchiveMonthMeta } from "../../lib/salesArchive";
import {
  buildMonthStory,
  completeMonths,
  fmtM,
  forecastNextMonth,
  monthlyRanks,
  peopleFrom,
  staffKeyIn,
  staffShares,
  storySentence,
} from "../../lib/historyInsights";
import { attMethodSig, catMethodSig, useArchiveCalc } from "../../hooks/useArchiveCalc";
import { TEAM, attAxes, computeMonthAtt, findStaffKey, rateOf, sumCells, type MonthAtt } from "../../lib/attHistory";
import { CAT_TEAM, MAIN_CATS, computeMonthCat, findCatStaffKey, type MonthCat } from "../../lib/catHistory";
import { computeMonthStaffDays, type StaffDays } from "../../lib/staffDays";
import { matchesOfficer } from "../../lib/matchHelpers";

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1_000 ? `${Math.round(n / 1000)}K` : `${Math.round(n)}`;
const first = (n: string) => n.split(" ")[0];

// ════════════════════════════════════════════════════════════════════
// 1 + 2: สรุปเดือน + คาดยอดเดือนถัดไป (บนสุดของหน้า)
// ════════════════════════════════════════════════════════════════════
export function HistorySummaryCards({
  archiveKey,
  months,
  presets,
  categoryMaster,
  currentMonth,
  staffOrder,
  currentTarget,
  currentActual,
}: {
  archiveKey: string;
  months: ArchiveMonthMeta[];
  presets: Preset[];
  categoryMaster: RawRow[];
  currentMonth?: string;
  staffOrder: string[];
  /** เป้าร้านของเดือนนี้ (จากไฟล์เป้าปัจจุบัน) */
  currentTarget?: number;
  /** ยอดสะสมเดือนนี้ */
  currentActual?: number;
}) {
  const done = completeMonths(months, currentMonth);
  const story = buildMonthStory(done);
  // ATT ทีม: ใช้ผลที่ "ATT รายคน" เคยคิดเก็บไว้ (ไม่คิดใหม่ที่นี่)
  const axes = attAxes(presets);
  const { data: att } = useArchiveCalc<MonthAtt>({
    archiveKey,
    months,
    kind: "att",
    methodSig: attMethodSig(presets, categoryMaster),
    compute: (rows) => computeMonthAtt(rows, axes, categoryMaster),
    computeMissing: false,
  });
  const attNote = React.useMemo(() => {
    if (!story?.prevMonth) return null;
    const L = att[story.month];
    const P = att[story.prevMonth];
    if (!L || !P) return null;
    const diffs = axes
      .map((p) => {
        const a = rateOf(L[TEAM]?.[p.id]);
        const b = rateOf(P[TEAM]?.[p.id]);
        return a != null && b != null ? { name: p.name, d: a - b } : null;
      })
      .filter(Boolean) as Array<{ name: string; d: number }>;
    const big = diffs.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
    if (!big || Math.abs(big.d) < 2) return null;
    return `ATT ${big.name} ${big.d >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(Math.round(big.d))}%`;
  }, [att, story, axes]);

  const fc = forecastNextMonth(done, months);
  const shares = staffShares(done, staffOrder);
  const isCurrent = fc && fc.month === currentMonth;
  const tgt = isCurrent ? currentTarget ?? 0 : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/70 mb-2">
          <Sparkles className="w-4 h-4" /> สรุปเดือนล่าสุด
        </div>
        {story ? (
          <p className="text-[15px] leading-relaxed text-white">{storySentence(story, attNote)}</p>
        ) : (
          <p className="text-[13px] text-white/60">ต้องมีข้อมูลอย่างน้อย 1 เดือนที่จบแล้วในคลัง</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/70 mb-2">
          <Target className="w-4 h-4" /> คาดยอด{fc ? ` ${monthLabelTh(fc.month)}` : "เดือนถัดไป"}
        </div>
        {fc ? (
          <>
            <p className="text-[15px] leading-relaxed text-white">
              น่าจะได้ <b>{fmtM(fc.low)} – {fmtM(fc.high)}</b> (กลางๆ {fmtM(fc.mid)})
              {isCurrent && currentActual ? <> · ตอนนี้ทำได้แล้ว {fmtM(currentActual)}</> : null}
            </p>
            {tgt > 0 ? (
              <p className={`mt-1 text-[14px] ${tgt > fc.high ? "text-rose-300" : tgt < fc.low ? "text-emerald-300" : "text-white/80"}`}>
                เป้าบริษัท {fmtM(tgt)}{" "}
                {tgt > fc.high
                  ? `สูงกว่าช่วงที่น่าจะทำได้ ${Math.round((tgt / fc.high) * 100 - 100)}% — ต้องมีแผนเร่งพิเศษ`
                  : tgt < fc.low
                    ? "ต่ำกว่าที่น่าจะทำได้ — มีโอกาสเกินเป้า"
                    : "อยู่ในช่วงที่ทำได้"}
              </p>
            ) : null}
            <p className="mt-1 text-[12px] text-white/50">คิดจาก: {fc.basis.join(" · ")}</p>
            {shares.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[13px] font-semibold text-white/75">เป้าที่เป็นไปได้รายคน (ตามส่วนแบ่งยอด 3 เดือนล่าสุด)</summary>
                <table className="mt-2 w-full text-[13px]">
                  <thead>
                    <tr className="text-white/55 text-[12px]">
                      <th className="text-left font-semibold py-1">พนักงาน</th>
                      <th className="text-right font-semibold py-1">ส่วนแบ่ง</th>
                      <th className="text-right font-semibold py-1">จากยอดที่คาด</th>
                      {tgt > 0 ? <th className="text-right font-semibold py-1">จากเป้าบริษัท</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {shares.map((s) => (
                      <tr key={s.name} className="border-t border-white/5">
                        <td className="py-1 text-white">{s.name}</td>
                        <td className="py-1 text-right tabular-nums text-white/75">{Math.round(s.share * 100)}%</td>
                        <td className="py-1 text-right tabular-nums text-white">{fmtM(fc.mid * s.share)}</td>
                        {tgt > 0 ? <td className="py-1 text-right tabular-nums text-white/80">{fmtM(tgt * s.share)}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] text-white/60">ต้องมีข้อมูลอย่างน้อย 2 เดือนที่จบแล้วในคลัง</p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 5: อันดับรายเดือน
// ════════════════════════════════════════════════════════════════════
export function RankView({ months, currentMonth, staffOrder }: { months: ArchiveMonthMeta[]; currentMonth?: string; staffOrder: string[] }) {
  const [range, setRange] = React.useState<6 | 12 | 0>(6);
  const done = completeMonths(months, currentMonth);
  const used = range ? done.slice(-range) : done;
  const cur = months.find((m) => m.month === currentMonth && m.summary);
  const cols = cur ? [...used, cur] : used;
  const people = peopleFrom(cols, staffOrder);
  const ranks = monthlyRanks(cols, people);
  const last = cols[cols.length - 1]?.month;
  const sorted = [...people].sort((a, b) => (ranks[last]?.[a] ?? 99) - (ranks[last]?.[b] ?? 99));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-white/65">อันดับยอดขายในทีมแต่ละเดือน · ลูกศร = ขึ้น/ลงจากเดือนก่อน · เรียงตามเดือนล่าสุด</p>
        <RangeBtns<6 | 12 | 0> value={range} options={[6, 12, 0]} onChange={setRange} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-[#0c3123] text-white/70 text-[12px] border-b border-white/10">
              <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-[#0c3123]">พนักงาน</th>
              {cols.map((m) => (
                <th key={m.month} className="py-2 px-3 text-center font-semibold whitespace-nowrap">
                  {monthLabelTh(m.month)}
                  {m.month === currentMonth ? <div className="text-[11px] font-normal text-white/45">ยังไม่จบ</div> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p} className="border-b border-white/5">
                <td className="py-2 px-3 text-white whitespace-nowrap sticky left-0 bg-[#0a1f17]">{p}</td>
                {cols.map((m, i) => {
                  const r = ranks[m.month]?.[p] ?? null;
                  const prev = i > 0 ? ranks[cols[i - 1].month]?.[p] ?? null : null;
                  const d = r != null && prev != null ? prev - r : null;
                  return (
                    <td key={m.month} className="py-2 px-3 text-center tabular-nums whitespace-nowrap">
                      {r == null ? (
                        <span className="text-white/30">—</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 ${r === 1 ? "text-emerald-300 font-semibold" : "text-white"}`}>
                          {r}
                          {d != null && d > 0 ? <ArrowUp className="w-3.5 h-3.5 text-emerald-300" /> : null}
                          {d != null && d < 0 ? <ArrowDown className="w-3.5 h-3.5 text-rose-300" /> : null}
                          {d === 0 ? <Minus className="w-3 h-3 text-white/30" /> : null}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 6: ผลิตภาพต่อคน (ยอดต่อวันที่ทำงาน)
// ════════════════════════════════════════════════════════════════════
export function ProductivityView({
  archiveKey,
  months,
  currentMonth,
  staffOrder,
}: {
  archiveKey: string;
  months: ArchiveMonthMeta[];
  currentMonth?: string;
  staffOrder: string[];
}) {
  const [range, setRange] = React.useState<1 | 3 | 6>(3);
  const { data, loading } = useArchiveCalc<StaffDays>({
    archiveKey,
    months,
    kind: "days",
    methodSig: "v1",
    compute: computeMonthStaffDays,
  });
  const done = completeMonths(months, currentMonth).map((m) => m.month).filter((m) => data[m]);
  const used = done.slice(-range);
  const people = React.useMemo(() => {
    const out: string[] = [];
    for (const n of staffOrder) if (used.some((m) => staffKeyIn(data[m], n))) out.push(n);
    for (const m of used) for (const k of Object.keys(data[m])) if (!out.some((x) => x === k || matchesOfficer(x, k))) out.push(k);
    return out;
  }, [used.join(","), data, staffOrder]);
  const rows = people
    .map((p) => {
      const t = used.reduce(
        (s, m) => {
          const k = staffKeyIn(data[m], p);
          const v = k ? data[m][k] : null;
          return v ? { days: s.days + v.days, bills: s.bills + v.bills, baht: s.baht + v.baht } : s;
        },
        { days: 0, bills: 0, baht: 0 },
      );
      return { name: p, ...t, perDay: t.days ? t.baht / t.days : 0, billsPerDay: t.days ? t.bills / t.days : 0, ticket: t.bills ? t.baht / t.bills : 0 };
    })
    .filter((r) => r.days > 0)
    .sort((a, b) => b.perDay - a.perDay);
  const teamPerDay = rows.length ? rows.reduce((s, r) => s + r.baht, 0) / rows.reduce((s, r) => s + r.days, 0) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-white/65">
          ยอดต่อวันที่ทำงาน (วันที่มีบิล) · ยุติธรรมกว่ายอดรวมเมื่อเข้ากะไม่เท่ากัน · ไม่นับเดือนนี้
          {loading ? ` · ${loading}` : ""}
        </p>
        <RangeBtns<1 | 3 | 6> value={range} options={[1, 3, 6]} onChange={setRange} labels={{ 1: "เดือนล่าสุด", 3: "3 เดือน", 6: "6 เดือน" }} />
      </div>
      {rows.length ? (
        <>
          <div className="daily-chart" style={{ height: `${Math.max(160, rows.length * 34 + 30)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows.map((r) => ({ ...r, label: first(r.name) }))} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickFormatter={(v: number) => short(v)} />
                <YAxis type="category" dataKey="label" width={90} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "rgba(127,127,127,0.12)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as (typeof rows)[number];
                    return (
                      <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                        <div className="font-semibold">{r.name}</div>
                        <div>วันละ {baht(r.perDay)} · {r.days} วันทำงาน</div>
                        <div className="text-white/70">
                          {r.billsPerDay.toFixed(1)} บิล/วัน · บิลละ {baht(r.ticket)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="perDay" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill={r.perDay >= teamPerDay ? "#34d399" : "rgba(255,255,255,0.35)"} />
                  ))}
                  <LabelList dataKey="perDay" position="right" formatter={(v: unknown) => short(Number(v))} fill="rgba(255,255,255,0.85)" fontSize={12} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[12px] text-white/55">แท่งเขียว = สูงกว่าเฉลี่ยทีม ({baht(teamPerDay)}/วัน)</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#0c3123] text-white/70 text-[12px] border-b border-white/10">
                  <th className="py-2 px-3 text-left font-semibold">พนักงาน</th>
                  <th className="py-2 px-3 text-right font-semibold">วันทำงาน</th>
                  <th className="py-2 px-3 text-right font-semibold">ยอดต่อวัน</th>
                  <th className="py-2 px-3 text-right font-semibold">บิลต่อวัน</th>
                  <th className="py-2 px-3 text-right font-semibold">ยอดต่อบิล</th>
                  <th className="py-2 px-3 text-right font-semibold">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-white/5">
                    <td className="py-2 px-3 text-white">{r.name}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.days}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white font-semibold">{baht(r.perDay)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.billsPerDay.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white/80">{baht(r.ticket)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white/80">{baht(r.baht)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-white/60">{loading || "ยังไม่มีข้อมูล"}</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 4 + 11: การ์ดประวัติรายคน (ยอด + เป้า + อันดับ + ATT + หมวดเด่น/อ่อน + ผลิตภาพ)
// ════════════════════════════════════════════════════════════════════
export function StaffProfileView({
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
  staffOrder: string[];
}) {
  const withSummary = months.filter((m) => m.summary && m.rowCount > 0).sort((a, b) => a.month.localeCompare(b.month));
  const people = peopleFrom(withSummary, staffOrder);
  const [who, setWho] = React.useState("");
  const sel = who || people[0] || "";
  const done = completeMonths(months, currentMonth);
  const used = done.slice(-6);

  const axes = attAxes(presets);
  const { data: att, loading: l1 } = useArchiveCalc<MonthAtt>({
    archiveKey,
    months,
    kind: "att",
    methodSig: attMethodSig(presets, categoryMaster),
    compute: (rows) => computeMonthAtt(rows, axes, categoryMaster),
  });
  const { data: cat, loading: l2 } = useArchiveCalc<MonthCat>({
    archiveKey,
    months,
    kind: "cat",
    methodSig: catMethodSig(categoryMaster),
    compute: (rows) => computeMonthCat(rows, categoryMaster),
  });
  const { data: days } = useArchiveCalc<StaffDays>({ archiveKey, months, kind: "days", methodSig: "v1", compute: computeMonthStaffDays });

  // เป้ารายคนจากคลังเป้า (มีตั้งแต่เดือนที่เริ่มเก็บ)
  const [targets, setTargets] = React.useState<Record<string, RawRow[]>>({});
  const targetMonths = withSummary.filter((m) => m.targetSignature).map((m) => m.month);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, RawRow[]> = {};
      for (const m of targetMonths) next[m] = await fetchArchiveTarget(archiveKey, m);
      if (!cancelled) setTargets(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveKey, targetMonths.join(",")]);
  const targetOf = (m: string, name: string) => {
    const row = (targets[m] ?? []).find((r) => matchesOfficer(`${r.NAME ?? ""} ${r.SURNAME ?? ""}`.trim(), name));
    const t = row ? Number(String(row.Total ?? "").replace(/[^\d.-]/g, "")) : 0;
    return t > 0 ? t : null;
  };

  if (!sel) return <p className="text-[13px] text-white/60">ยังไม่มีข้อมูล</p>;

  const ranks = monthlyRanks(withSummary, people);
  const series = withSummary.map((m) => {
    const k = staffKeyIn(m.summary!.byStaff, sel);
    const v = k ? m.summary!.byStaff[k].baht : 0;
    return { month: m.month, label: monthLabelTh(m.month), baht: v, target: targetOf(m.month, sel), rank: ranks[m.month]?.[sel] ?? null, partial: m.month === currentMonth };
  });

  // หมวดเด่น/อ่อน: ส่วนแบ่งของคนนี้ในหมวด เทียบส่วนแบ่งยอดรวมของคนนี้
  const catUsed = used.map((m) => m.month).filter((m) => cat[m]);
  const myTotal = catUsed.reduce((s, m) => {
    const k = findCatStaffKey(cat[m], sel);
    return s + (k ? Object.values(cat[m][k]).reduce((a, c) => a + c.baht, 0) : 0);
  }, 0);
  const teamTotal = catUsed.reduce((s, m) => s + Object.values(cat[m][CAT_TEAM] ?? {}).reduce((a, c) => a + c.baht, 0), 0);
  const overallShare = teamTotal ? myTotal / teamTotal : 0;
  const catIdx = MAIN_CATS.map((c) => {
    const mine = catUsed.reduce((s, m) => {
      const k = findCatStaffKey(cat[m], sel);
      return s + (k ? cat[m][k]?.[c]?.baht ?? 0 : 0);
    }, 0);
    const team = catUsed.reduce((s, m) => s + (cat[m][CAT_TEAM]?.[c]?.baht ?? 0), 0);
    const share = team ? mine / team : 0;
    return { cat: c, mine, idx: overallShare ? share / overallShare : 0 };
  }).filter((x) => x.mine > 0 || x.idx > 0);
  const strong = catIdx.filter((x) => x.idx >= 1.2).sort((a, b) => b.idx - a.idx);
  const weak = catIdx.filter((x) => x.idx <= 0.8).sort((a, b) => a.idx - b.idx);

  const attUsed = used.map((m) => m.month).filter((m) => att[m]);
  const attRows = axes.map((p) => {
    const mine = rateOf(sumCells(attUsed.map((m) => {
      const k = findStaffKey(att[m], sel);
      return k ? att[m][k]?.[p.id] : undefined;
    })));
    const team = rateOf(sumCells(attUsed.map((m) => att[m][TEAM]?.[p.id])));
    return { p, mine, team };
  });

  const dUsed = used.map((m) => m.month).filter((m) => days[m]);
  const prod = dUsed.reduce(
    (s, m) => {
      const k = staffKeyIn(days[m], sel);
      const v = k ? days[m][k] : null;
      return v ? { days: s.days + v.days, baht: s.baht + v.baht, bills: s.bills + v.bills } : s;
    },
    { days: 0, baht: 0, bills: 0 },
  );
  const avgMonthly = series.filter((s) => !s.partial && s.baht > 0);
  const avgM = avgMonthly.length ? avgMonthly.reduce((s, x) => s + x.baht, 0) / avgMonthly.length : 0;
  const lastRank = [...series].reverse().find((s) => !s.partial && s.rank != null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={sel} onChange={(e) => setWho(e.target.value)} className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[14px]">
          {people.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-white/55">ตัวเลขเฉลี่ย/เด่น/อ่อน คิดจาก 6 เดือนล่าสุดที่จบแล้ว{l1 || l2 ? ` · ${l1 || l2}` : ""}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="ยอดเฉลี่ยต่อเดือน" value={fmtM(avgM)} />
        <Stat label="อันดับเดือนล่าสุด" value={lastRank ? `${lastRank.rank} จาก ${Object.keys(withSummary.find((m) => m.month === lastRank.month)!.summary!.byStaff).length}` : "—"} />
        <Stat label="ยอดต่อวันทำงาน" value={prod.days ? baht(prod.baht / prod.days) : "—"} hint={prod.days ? `${prod.days} วัน · บิลละ ${baht(prod.bills ? prod.baht / prod.bills : 0)}` : undefined} />
        <Stat label="ส่วนแบ่งยอดทีม" value={overallShare ? `${Math.round(overallShare * 100)}%` : "—"} />
      </div>

      <div className="rounded-xl border border-white/10 bg-black/10 p-3">
        <div className="text-[13px] font-semibold text-white mb-1">ยอดรายเดือน · จุดเหลือง = เป้า (มีตั้งแต่เดือนที่เริ่มเก็บเป้า) · ตัวเลขใต้เดือน = อันดับ</div>
        <div className="daily-chart h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series.map((s) => ({ ...s, label: `${s.label}${s.rank ? ` (#${s.rank})` : ""}` }))} margin={{ top: 22, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={48} tickCount={4} domain={[0, "auto"]} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickFormatter={(v: number) => (v === 0 ? "0" : short(v))} />
              <Tooltip
                cursor={{ fill: "rgba(127,127,127,0.12)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof series)[number];
                  return (
                    <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                      <div className="font-semibold">{monthLabelTh(d.month)}{d.partial ? " (ยังไม่จบ)" : ""}</div>
                      <div>{baht(d.baht)}</div>
                      {d.target ? <div className="text-white/75">เป้า {baht(d.target)} · {Math.round((d.baht / d.target) * 100)}%</div> : null}
                      {d.rank ? <div className="text-white/75">อันดับ {d.rank}</div> : null}
                    </div>
                  );
                }}
              />
              <Bar dataKey="baht" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {series.map((s) => (
                  <Cell key={s.month} fill="#34d399" fillOpacity={s.partial ? 0.45 : 1} />
                ))}
                <LabelList dataKey="baht" position="top" formatter={(v: unknown) => short(Number(v))} fill="rgba(255,255,255,0.8)" fontSize={11} />
              </Bar>
              <Line dataKey="target" stroke="#fcd34d" strokeWidth={2} dot={{ r: 4, fill: "#fcd34d" }} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="text-[13px] font-semibold text-white mb-2">หมวดเด่น / หมวดอ่อน</div>
          {catUsed.length ? (
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div>
                <span className="text-emerald-300 font-semibold">เด่น: </span>
                <span className="text-white/85">{strong.length ? strong.map((x) => `${x.cat} (${x.idx.toFixed(1)} เท่าของปกติ)`).join(", ") : "—"}</span>
              </div>
              <div>
                <span className="text-rose-300 font-semibold">อ่อน: </span>
                <span className="text-white/85">{weak.length ? weak.map((x) => `${x.cat} (${x.idx.toFixed(1)} เท่า)`).join(", ") : "—"}</span>
              </div>
              <p className="text-[12px] text-white/50">"ปกติ" = ส่วนแบ่งยอดรวมของคนนี้ในทีม · 1.5 เท่า = ขายหมวดนั้นได้มากกว่าสัดส่วนตัวเอง 50%</p>
            </div>
          ) : (
            <p className="text-[13px] text-white/55">{l2 || "ยังไม่มีข้อมูล"}</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="text-[13px] font-semibold text-white mb-2">ATT เทียบทีม</div>
          {attUsed.length ? (
            <div className="flex flex-col gap-1.5">
              {attRows.map(({ p, mine, team }) => {
                const t = p.targetPercent ?? 0;
                const max = Math.max(mine ?? 0, team ?? 0, t, 1);
                return (
                  <div key={p.id} className="text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-white/80">{p.name}</span>
                      <span className="tabular-nums">
                        <b className={mine != null && t > 0 ? (mine >= t ? "text-emerald-300" : "text-rose-300") : "text-white"}>{mine == null ? "—" : `${Math.round(mine)}%`}</b>
                        <span className="text-white/50"> · ทีม {team == null ? "—" : `${Math.round(team)}%`}{t ? ` · เป้า ${t}%` : ""}</span>
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full pace-track bg-white/10 mt-1">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${((mine ?? 0) / max) * 100}%` }} />
                      {team != null ? <div className="absolute -top-0.5 h-2.5 w-0.5 pace-tick bg-white" style={{ left: `${(team / max) * 100}%` }} /> : null}
                    </div>
                  </div>
                );
              })}
              <p className="text-[12px] text-white/50">ขีดขาว = ค่าเฉลี่ยทีม</p>
            </div>
          ) : (
            <p className="text-[13px] text-white/55">{l1 || "ยังไม่มีข้อมูล"}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <div className="text-[12px] text-white/60">{label}</div>
      <div className="text-lg font-semibold text-white tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-white/50">{hint}</div> : null}
    </div>
  );
}

function RangeBtns<T extends number>({
  value,
  options,
  onChange,
  labels,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  labels?: Partial<Record<number, string>>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[12px]">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg font-semibold ${value === o ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
        >
          {labels?.[o] ?? (o === 0 ? "ทั้งหมด" : `${o} เดือน`)}
        </button>
      ))}
    </div>
  );
}
