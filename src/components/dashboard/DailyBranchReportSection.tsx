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

const attColor = (att: number): string =>
  att >= 100 ? "text-emerald-400" : att >= 50 ? "text-amber-300" : att > 0 ? "text-rose-400" : "text-white/30";

export const DailyBranchReportSection: React.FC<{ data: DailyReportData }> = ({ data }) => {
  if (!data.rows.length) return null;

  const numCell = (v: number, dim = false) => (
    <span className={dim ? "text-white/40" : "text-white/90 font-semibold"}>
      {v ? v.toLocaleString() : "–"}
    </span>
  );

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 mb-1">
        <LayoutGrid className="w-5 h-5 text-emerald-300" />
        <h3 className="text-lg font-bold tracking-tight text-white">
          รายงานยอดขาย + Attach รายวัน (วันล่าสุด)
        </h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        ข้อมูลวันล่าสุด {fmtDay(data.latestDate)} · ATT% = จำนวนหมวด ÷ ฐาน (ส่วนใหญ่ ÷ iPhone, AC+ ÷ iPhone+iPad,
        Pencil/iPad Acc ÷ iPad) · นับด้วย preset engine (inventory + dedupe)
      </p>

      <div className="overflow-x-auto rounded-xl border border-emerald-500/10">
        <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
              <th className="py-2 px-2 font-bold uppercase tracking-wider sticky left-0 bg-[#0c3123]">พนักงาน</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Total ฿</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Device</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">iPhone</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">iPhone ฿</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">iPad</th>
              <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">iPad ฿</th>
              {data.presets.map((p) => (
                <th key={p.id} className="py-2 px-2 font-bold uppercase tracking-wider text-center">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
            {data.rows.map((r, idx) => (
              <tr
                key={idx}
                className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${
                  r.isTotal ? "bg-[#0c3123]/90 font-bold border-b-2 border-emerald-500/30" : ""
                }`}
              >
                <td className={`py-1.5 px-2 font-bold sticky left-0 ${r.isTotal ? "bg-[#0c3123]" : "bg-[#052b20]"}`}>
                  {r.name}
                </td>
                <td className="py-1.5 px-2 text-right font-semibold">{fmtBaht(r.totalBaht)}</td>
                <td className="py-1.5 px-2 text-right">{numCell(r.totalDevice)}</td>
                <td className="py-1.5 px-2 text-right">{numCell(r.iphoneUnit)}</td>
                <td className="py-1.5 px-2 text-right text-white/50">{r.iphoneBaht ? fmtBaht(r.iphoneBaht) : "–"}</td>
                <td className="py-1.5 px-2 text-right">{numCell(r.ipadUnit)}</td>
                <td className="py-1.5 px-2 text-right text-white/50">{r.ipadBaht ? fmtBaht(r.ipadBaht) : "–"}</td>
                {data.presets.map((p) => {
                  const c = r.cells[p.id];
                  if (!c) return <td key={p.id} className="py-1.5 px-2 text-center text-white/30">–</td>;
                  if (c.kind === "baht") {
                    return (
                      <td key={p.id} className="py-1.5 px-2 text-center text-white/80">
                        {c.baht ? fmtBaht(c.baht) : "–"}
                      </td>
                    );
                  }
                  if (c.kind === "unit") {
                    return (
                      <td key={p.id} className="py-1.5 px-2 text-center">
                        {numCell(c.unit ?? 0)}
                      </td>
                    );
                  }
                  // att
                  return (
                    <td key={p.id} className="py-1.5 px-2 text-center">
                      <div className="font-semibold text-white/90">{(c.unit ?? 0).toLocaleString()}</div>
                      <div className={`text-[9px] font-bold ${attColor(c.att ?? 0)}`}>
                        {(c.att ?? 0).toFixed(1)}%
                      </div>
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
};
