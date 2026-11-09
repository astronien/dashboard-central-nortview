import React from "react";

/** ตัวเลขเงินแบบสั้นสำหรับจอเล็ก: 9.43M / 228K / 950 */
export const fmtShort = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000) return `${Math.round(v / 1000)}K`;
  if (a >= 1_000) return `${(v / 1000).toFixed(1)}K`;
  return Math.round(v).toLocaleString();
};

/** % แบบตัดทศนิยม (ไม่ปัดขึ้น) ให้ตรงกับตารางบนคอม */
export const fmtPctShort = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  if (Math.abs(v) >= 100) return `${Math.trunc(v)}%`;
  return `${Math.trunc(v * 10) / 10}%`;
};

export type Tone = "good" | "warn" | "bad" | "none";
export const toneOf = (pct: number | null | undefined): Tone => {
  if (pct == null || !Number.isFinite(pct)) return "none";
  if (pct >= 100) return "good";
  if (pct >= 80) return "warn";
  return "bad";
};
const BAR: Record<Tone, string> = {
  good: "bg-emerald-400",
  warn: "bg-white/60",
  bad: "bg-rose-400",
  none: "bg-white/30",
};
const PILL: Record<Tone, string> = {
  good: "border-transparent text-emerald-300",
  warn: "border-transparent text-white/80",
  bad: "border-transparent text-rose-300",
  none: "border-transparent text-white/50",
};

/** แถบความคืบหน้า — mark = ขีด "ควรถึงวันนี้" (%) */
export function Bar({ pct, tone, mark }: { pct: number; tone?: Tone; mark?: number | null }) {
  const t = tone ?? toneOf(pct);
  const w = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className="relative mt-1">
      <div className="h-1.5 rounded-full pace-track bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${BAR[t]}`} style={{ width: `${w}%` }} />
      </div>
      {mark != null && Number.isFinite(mark) ? (
        <div className="absolute -top-0.5 h-2.5 w-0.5 rounded pace-tick bg-white" style={{ left: `calc(${Math.min(Math.max(mark, 0), 100)}% - 1px)` }} />
      ) : null}
    </div>
  );
}

export function Pill({ pct, tone, text }: { pct?: number; tone?: Tone; text?: string }) {
  const t = tone ?? toneOf(pct);
  return (
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 rounded-md border text-[12px] font-semibold tabular-nums ${PILL[t]}`}>
      {text ?? (pct == null ? "—" : fmtPctShort(pct))}
    </span>
  );
}

/** ปุ่มแท็บแบบแบ่งช่อง (segmented control) */
export function Segmented<K extends string>({
  value,
  options,
  onChange,
}: {
  value: K;
  options: Array<{ key: K; label: string; badge?: number }>;
  onChange: (k: K) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors relative ${
            value === o.key ? "bg-white/15 text-white" : "text-white/55"
          }`}
        >
          {o.label}
          {o.badge ? (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-semibold align-middle">
              {o.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name.replace(/\s+/g, "").slice(0, 2);
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-emerald-500/20 border border-white/15 flex items-center justify-center text-[12px] font-semibold text-emerald-200"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover object-top" /> : initials}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white/10 border border-white/10 p-3.5 ${className}`}>{children}</div>;
}
