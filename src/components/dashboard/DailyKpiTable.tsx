import React from "react";
import { CalendarDays } from "lucide-react";
import type { Preset, PresetCalcType } from "../../lib/presetTypes";

export interface DailyCatCell {
  latest: number;
  prev: number;
}
export interface DailyWonderCell {
  latest: number;
  prev: number;
  latestA?: number;
  latestB?: number;
  prevA?: number;
  calcType?: PresetCalcType;
}
export interface DailyOfficerRow {
  officer: { name: string; branch: string; staffId?: string };
  cats: Record<string, DailyCatCell>;
  catTotal: DailyCatCell;
  wonders: Record<string, DailyWonderCell>;
}
export interface DailyKpiData {
  latestDate: string;
  prevDate: string;
  categories: string[];
  presets: Preset[];
  rows: DailyOfficerRow[];
}

const colorDot = (color: string): string => {
  const map: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    purple: "bg-purple-500",
    coral: "bg-orange-500",
  };
  return map[color] || "bg-white/40";
};

const shortWonder = (name: string): string =>
  name.replace(/attach/gi, "").replace(/\s+/g, " ").trim() || name;

const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}K`;
  return Math.round(n).toLocaleString();
};

const fmtWonderVal = (v: number, calcType: PresetCalcType | undefined): string => {
  if (!isFinite(v) || isNaN(v)) return "—";
  switch (calcType) {
    case "attach":
    case "bahtRate":
    case "catAttach":
    case "tradeIn":
      return `${v.toFixed(1)}%`;
    case "baht":
    case "catBaht":
      return `฿${Math.round(v).toLocaleString()}`;
    default:
      return Math.round(v).toLocaleString();
  }
};

// Small up/down delta chip
function Delta({ d, unit = "" }: { d: number; unit?: string }) {
  if (Math.abs(d) < 0.05)
    return <span className="text-[8px] text-white/30">เท่าเดิม</span>;
  const up = d > 0;
  const val = Number.isInteger(d) ? d : d.toFixed(1);
  return (
    <span className={`text-[8px] font-semibold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? "▲" : "▼"}
      {up ? "+" : ""}
      {val}
      {unit}
    </span>
  );
}

function DailyDate({ latestDate, prevDate }: { latestDate: string; prevDate: string }) {
  const fmt = (iso: string) => {
    if (!iso) return "-";
    const [, m, d] = iso.split("-");
    return d && m ? `${d}/${m}` : iso;
  };
  return (
    <span>
      วันล่าสุด <b className="text-white">{fmt(latestDate)}</b> เทียบวันก่อน{" "}
      <b className="text-white">{fmt(prevDate)}</b>
    </span>
  );
}

export function DailyKpiTable({ data }: { data?: DailyKpiData }) {
  if (!data || data.rows.length === 0) return null;
  const { categories, presets, rows } = data;

  const renderCat = (cell: DailyCatCell | undefined, isTotal = false) => {
    if (!cell) return <span className="text-white/25">—</span>;
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className={`font-mono tabular-nums ${isTotal ? "font-bold text-emerald-200" : "font-semibold text-white"}`}>
          {fmtCompact(cell.latest)}
        </span>
        <Delta d={cell.latest - cell.prev} />
      </div>
    );
  };

  const renderWonder = (cell: DailyWonderCell | undefined) => {
    if (!cell) return <span className="text-white/25">—</span>;
    const showAB = cell.latestA !== undefined && cell.latestB !== undefined;
    const primary = showAB
      ? `${Math.round(cell.latestA as number)}/${Math.round(cell.latestB as number)}`
      : fmtWonderVal(cell.latest, cell.calcType);
    const deltaBills =
      showAB && cell.prevA !== undefined
        ? Math.round(cell.latestA as number) - Math.round(cell.prevA)
        : null;
    return (
      <div className="flex flex-col items-end gap-0.5 leading-none">
        <span className="font-mono font-semibold text-white tabular-nums">{primary}</span>
        {deltaBills !== null ? (
          <Delta d={deltaBills} unit=" บิล" />
        ) : (
          <Delta d={cell.latest - cell.prev} />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
          <CalendarDays className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-white">
            ยอดขายตามหมวด + 7 Wonders รายคน (รายวัน)
          </h2>
          <p className="text-[10px] text-white/45">
            <DailyDate latestDate={data.latestDate} prevDate={data.prevDate} /> · เลขบน =
            วันล่าสุด · ▲▼ = เทียบวันก่อนหน้า
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/10 text-white/70">
              <th className="py-1.5 px-2 sticky left-0 bg-[#0c3123] z-10" />
              {categories.length > 0 ? (
                <th
                  colSpan={categories.length + 1}
                  className="py-1.5 px-2 text-center text-[9px] font-bold uppercase tracking-widest text-emerald-300/80 border-l border-white/10"
                >
                  ยอดขายตามหมวด
                </th>
              ) : null}
              {presets.length > 0 ? (
                <th
                  colSpan={presets.length}
                  className="py-1.5 px-2 text-center text-[9px] font-bold uppercase tracking-widest text-amber-300/80 border-l border-white/10"
                >
                  7 Wonders
                </th>
              ) : null}
            </tr>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
              <th className="py-2 px-2 font-bold uppercase tracking-wider sticky left-0 bg-[#0c3123] z-10 min-w-[120px]">
                เจ้าหน้าที่
              </th>
              {categories.map((cat, i) => (
                <th
                  key={cat}
                  className={`py-2 px-2 font-bold uppercase tracking-wide text-right min-w-[62px] ${i === 0 ? "border-l border-white/10" : ""}`}
                >
                  {cat}
                </th>
              ))}
              <th className="py-2 px-2 font-bold uppercase tracking-wide text-right min-w-[68px] text-emerald-300 bg-emerald-500/5">
                Total
              </th>
              {presets.map((p, i) => (
                <th
                  key={p.id}
                  className={`py-2 px-2 font-bold uppercase tracking-wide text-right min-w-[66px] ${i === 0 ? "border-l border-white/10" : ""}`}
                  title={p.labelA + " → " + (p.labelB || "(ไม่มี)")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorDot(p.color)}`} />
                    <span className="truncate max-w-[70px]">{shortWonder(p.name)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.officer.name}-${idx}`}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-1.5 px-2 sticky left-0 bg-[#0a1f17] z-10">
                  <div className="font-medium text-white truncate max-w-[130px]">{row.officer.name}</div>
                  <div className="text-[8px] text-white/40 truncate max-w-[130px]">{row.officer.branch || "-"}</div>
                </td>
                {categories.map((cat, i) => (
                  <td key={cat} className={`py-1.5 px-2 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}>
                    {renderCat(row.cats[cat])}
                  </td>
                ))}
                <td className="py-1.5 px-2 text-right align-top bg-emerald-500/5">
                  {renderCat(row.catTotal, true)}
                </td>
                {presets.map((p, i) => (
                  <td key={p.id} className={`py-1.5 px-2 text-right align-top ${i === 0 ? "border-l border-white/5" : ""}`}>
                    {renderWonder(row.wonders[p.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
