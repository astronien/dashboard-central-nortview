import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Smile, RefreshCw, ArrowUp, ArrowDown, Users } from "lucide-react";
import { fetchTrends, type TrendSnapshot } from "../../lib/trendsApi";

const axisTick = { fill: "#94a3b8", fontSize: 11 };
const gridStroke = "rgba(148,163,184,0.15)";

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
};
const fmtBaht = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`;

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactElement;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
          <p className="text-[11px] text-white/50">{subtitle}</p>
        </div>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendsSection({ branch }: { branch: string }) {
  const [snaps, setSnaps] = React.useState<TrendSnapshot[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    if (!branch) return;
    setLoading(true);
    void fetchTrends(branch, 90).then((s) => {
      setSnaps(s);
      setLoading(false);
    });
  }, [branch]);

  React.useEffect(() => {
    load();
  }, [load]);

  const data = React.useMemo(
    () =>
      snaps.map((s) => ({
        day: fmtDay(s.date),
        actual: Math.round(s.totalActual || 0),
        target: Math.round(s.totalTarget || 0),
        achPct: Number((s.achPct || 0).toFixed(1)),
        nps: s.csat ? Number((s.csat.nps || 0).toFixed(1)) : null,
        responseRate: s.csat ? Number((s.csat.responseRate || 0).toFixed(1)) : null,
      })),
    [snaps],
  );

  const hasCsat = data.some((d) => d.nps !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                แนวโน้มย้อนหลัง
              </h2>
              <p className="text-[11px] text-white/50">
                เก็บอัตโนมัติทุกวันที่เปิดหน้า Home — ดูว่ายอดขายเดินตามเป้าและ CSAT ดีขึ้นไหม
              </p>
            </div>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <ProgressTracker snaps={snaps} />

      {data.length < 2 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-10 text-center">
          <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">
            ยังมีข้อมูลย้อนหลังไม่พอ ({data.length} วัน) — ระบบจะเก็บ snapshot
            อัตโนมัติทุกวันที่เปิดหน้า Home กลับมาดูอีกครั้งในไม่กี่วันครับ
          </p>
        </div>
      ) : (
        <>
          <ChartCard
            icon={TrendingUp}
            title="ยอดขายสะสม (MTD) เทียบเป้า"
            subtitle="ยอดจริงสะสม vs เป้าเดือน รายวัน"
          >
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtBaht(Number(v))}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c291d",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(v: number) => `฿${Number(v).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="actual"
                name="ยอดจริง"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gA)"
              />
              <Line
                type="monotone"
                dataKey="target"
                name="เป้า"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </AreaChart>
          </ChartCard>

          <ChartCard
            icon={TrendingUp}
            title="% ถึงเป้า รายวัน"
            subtitle="เปอร์เซ็นต์ยอดขายเทียบเป้าเดือน (pace)"
          >
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c291d",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(v: number) => `${v}%`}
              />
              <Line
                type="monotone"
                dataKey="achPct"
                name="% ถึงเป้า"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ChartCard>

          {hasCsat ? (
            <ChartCard
              icon={Smile}
              title="CSAT รายวัน"
              subtitle="NPS และอัตราการตอบแบบสอบถาม"
            >
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "#0c291d",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="nps"
                  name="NPS"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="responseRate"
                  name="อัตราการตอบ %"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ChartCard>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Per-person progress tracker: compares each officer's metrics in the two
 * most recent snapshots that carry per-staff data, so a manager can see
 * whether yesterday's coaching moved the needle (what improved / slipped).
 */
type MetricDelta = { label: string; from: number; to: number; delta: number };

function ProgressTracker({ snaps }: { snaps: TrendSnapshot[] }) {
  const withStaff = snaps.filter(
    (s) => Array.isArray(s.staff) && s.staff.length > 0,
  );

  if (withStaff.length < 2) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-white">
            พัฒนาการรายคน
          </h2>
        </div>
        <p className="text-[12px] text-white/55">
          ยังมีข้อมูลไม่พอสำหรับเทียบพัฒนาการ (ต้องมีอย่างน้อย 2 วัน) —
          เปิดหน้า Home ต่อเนื่อง ระบบจะเก็บให้อัตโนมัติ
        </p>
      </div>
    );
  }

  const latest = withStaff[withStaff.length - 1];
  const base = withStaff[withStaff.length - 2];
  const baseMap = new Map((base.staff ?? []).map((s) => [s.name, s]));

  const rows = (latest.staff ?? [])
    .map((cur) => {
      const prev = baseMap.get(cur.name);
      const improved: MetricDelta[] = [];
      const declined: MetricDelta[] = [];
      if (prev) {
        for (const [label, to] of Object.entries(cur.m)) {
          const from = prev.m[label];
          if (from === undefined) continue;
          const delta = to - from;
          if (delta >= 3) improved.push({ label, from, to, delta });
          else if (delta <= -3) declined.push({ label, from, to, delta });
        }
      }
      improved.sort((a, b) => b.delta - a.delta);
      declined.sort((a, b) => a.delta - b.delta);
      return {
        name: cur.name,
        overallPct: cur.overallPct,
        overallDelta: prev ? cur.overallPct - prev.overallPct : null,
        improved,
        declined,
        isNew: !prev,
      };
    })
    .sort((a, b) => (a.overallDelta ?? 0) - (b.overallDelta ?? 0));

  const deltaChip = (d: number | null) => {
    if (d === null) return <span className="text-white/40 text-[11px]">ใหม่</span>;
    if (d > 0)
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[12px] font-bold">
          <ArrowUp className="w-3 h-3" />+{d}
        </span>
      );
    if (d < 0)
      return (
        <span className="inline-flex items-center gap-0.5 text-rose-400 text-[12px] font-bold">
          <ArrowDown className="w-3 h-3" />{d}
        </span>
      );
    return <span className="text-white/40 text-[12px]">เท่าเดิม</span>;
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
          <Users className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            พัฒนาการรายคน
          </h2>
          <p className="text-[11px] text-white/50">
            เทียบ {base.date} → {latest.date} · ดูว่าโค้ชแล้วดีขึ้นตรงไหน (Δ ≥ 3%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-white truncate">{r.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-white/50">ยอดรวม {r.overallPct}%</span>
                {deltaChip(r.overallDelta)}
              </span>
            </div>

            {r.improved.length > 0 ? (
              <div className="mb-1.5">
                <span className="text-[10px] text-emerald-300/80 mr-1">ดีขึ้น:</span>
                {r.improved.map((d) => (
                  <span
                    key={d.label}
                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mr-1 mb-1"
                  >
                    {d.label} {d.from}→{d.to}%
                  </span>
                ))}
              </div>
            ) : null}

            {r.declined.length > 0 ? (
              <div>
                <span className="text-[10px] text-rose-300/80 mr-1">แย่ลง:</span>
                {r.declined.map((d) => (
                  <span
                    key={d.label}
                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 mr-1 mb-1"
                  >
                    {d.label} {d.from}→{d.to}%
                  </span>
                ))}
              </div>
            ) : null}

            {r.improved.length === 0 && r.declined.length === 0 && !r.isNew ? (
              <p className="text-[11px] text-white/40">ไม่มีการเปลี่ยนแปลงชัดเจน</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
