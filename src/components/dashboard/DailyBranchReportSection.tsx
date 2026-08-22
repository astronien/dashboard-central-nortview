import React from "react";
import { LayoutGrid } from "lucide-react";

export type DailyReportCellKind = "att" | "unit" | "baht";

export type DailyReportCell = {
  kind: DailyReportCellKind;
  unit?: number;
  att?: number; // %
  baht?: number;
};

export type DailyReportPreset = {
  id: string;
  name: string;
  kind: DailyReportCellKind;
};

export type DailyReportRow = {
  name: string;
  isTotal?: boolean;
  totalBaht: number;
  totalDevice: number;
  iphoneUnit: number;
  iphoneBaht: number;
  ipadUnit: number;
  ipadBaht: number;
  cells: Record<string, DailyReportCell>;
};

export type DailyReportData = {
  latestDate: string;
  presets: DailyReportPreset[];
  rows: DailyReportRow[];
};

const fmtDay = (ymd: string): string => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

const fmtBaht = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : Math.round(n).toLocaleString();

// Pastel group header colours (cycled per preset) — like the reference report.
const GROUP_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-cyan-100 text-cyan-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-800",
  "bg-indigo-100 text-indigo-800",
  "bg-pink-100 text-pink-800",
];

const attFill = (att: number): string =>
  att >= 100
    ? "bg-emerald-100 text-emerald-700"
    : att >= 50
      ? "bg-amber-100 text-amber-700"
      : att > 0
        ? "bg-rose-100 text-rose-700"
        : "text-slate-300";

const num = (v: number) => (v ? v.toLocaleString() : "–");

export const DailyBranchReportSection: React.FC<{ data: DailyReportData }> = ({ data }) => {
  if (!data.rows.length) return null;

  // Each attach preset takes 2 sub-columns (จำนวน | ATT%); baht/unit take 1.
  const presets = data.presets;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 mb-1">
        <LayoutGrid className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-bold tracking-tight text-slate-800">
          รายงานยอดขาย + Attach รายวัน (วันล่าสุด)
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        ข้อมูลวันล่าสุด {fmtDay(data.latestDate)} · ATT% = จำนวน ÷ ฐาน (ส่วนใหญ่ ÷ iPhone, AC+ ÷ iPhone+iPad,
        Pencil/iPad Acc ÷ iPad)
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap text-slate-700">
          <thead>
            {/* Row 1 — groups */}
            <tr className="border-b border-slate-200">
              <th
                rowSpan={2}
                className="py-2 px-2 font-bold text-slate-500 sticky left-0 bg-white border-r border-slate-200 text-[11px]"
              >
                พนักงาน
              </th>
              <th rowSpan={2} className="py-2 px-2 font-bold text-slate-500 text-right bg-slate-50">Total ฿</th>
              <th rowSpan={2} className="py-2 px-2 font-bold text-slate-500 text-right">Device</th>
              <th colSpan={2} className="py-1.5 px-2 font-bold text-center bg-slate-100 text-slate-600 border-l border-slate-200">
                iPhone
              </th>
              <th colSpan={2} className="py-1.5 px-2 font-bold text-center bg-slate-50 text-slate-600 border-l border-slate-200">
                iPad
              </th>
              {presets.map((p, i) => {
                const color = GROUP_COLORS[i % GROUP_COLORS.length];
                const span = p.kind === "att" ? 2 : 1;
                return (
                  <th
                    key={p.id}
                    colSpan={span}
                    rowSpan={span === 1 ? 2 : 1}
                    className={`py-1.5 px-2 font-bold text-center border-l border-slate-200 ${color}`}
                  >
                    {p.name}
                  </th>
                );
              })}
            </tr>
            {/* Row 2 — sub labels */}
            <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase">
              <th className="py-1 px-2 text-right bg-slate-100 border-l border-slate-200">จำนวน</th>
              <th className="py-1 px-2 text-right bg-slate-100">฿</th>
              <th className="py-1 px-2 text-right bg-slate-50 border-l border-slate-200">จำนวน</th>
              <th className="py-1 px-2 text-right bg-slate-50">฿</th>
              {presets.map((p) =>
                p.kind === "att" ? (
                  <React.Fragment key={p.id}>
                    <th className="py-1 px-2 text-right border-l border-slate-200">จำนวน</th>
                    <th className="py-1 px-2 text-center">ATT%</th>
                  </React.Fragment>
                ) : null,
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, idx) => (
              <tr
                key={idx}
                className={
                  r.isTotal
                    ? "bg-emerald-50 font-bold border-b-2 border-emerald-200"
                    : idx % 2 === 0
                      ? "bg-white border-b border-slate-100"
                      : "bg-slate-50/60 border-b border-slate-100"
                }
              >
                <td
                  className={`py-1.5 px-2 font-bold sticky left-0 border-r border-slate-200 ${
                    r.isTotal ? "bg-emerald-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  {r.name}
                </td>
                <td className="py-1.5 px-2 text-right font-semibold bg-slate-50/40">{fmtBaht(r.totalBaht)}</td>
                <td className="py-1.5 px-2 text-right font-semibold">{num(r.totalDevice)}</td>
                <td className="py-1.5 px-2 text-right border-l border-slate-200">{num(r.iphoneUnit)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">{r.iphoneBaht ? fmtBaht(r.iphoneBaht) : "–"}</td>
                <td className="py-1.5 px-2 text-right border-l border-slate-200">{num(r.ipadUnit)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">{r.ipadBaht ? fmtBaht(r.ipadBaht) : "–"}</td>
                {presets.map((p) => {
                  const c = r.cells[p.id];
                  if (p.kind === "baht") {
                    return (
                      <td key={p.id} className="py-1.5 px-2 text-center border-l border-slate-200">
                        {c?.baht ? fmtBaht(c.baht) : "–"}
                      </td>
                    );
                  }
                  if (p.kind === "unit") {
                    return (
                      <td key={p.id} className="py-1.5 px-2 text-center border-l border-slate-200">
                        {num(c?.unit ?? 0)}
                      </td>
                    );
                  }
                  // att → 2 cells: จำนวน | ATT%
                  const att = c?.att ?? 0;
                  return (
                    <React.Fragment key={p.id}>
                      <td className="py-1.5 px-2 text-right border-l border-slate-200">{num(c?.unit ?? 0)}</td>
                      <td className={`py-1.5 px-2 text-center font-bold ${attFill(att)}`}>
                        {c?.unit || att > 0 ? `${att.toFixed(1)}%` : "–"}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
