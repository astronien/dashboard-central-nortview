import React from "react";
import { Clock, Flame, LayoutGrid } from "lucide-react";

export type DailyReportCellKind = "att" | "unit" | "baht";

export type DailyReportCell = {
  kind: DailyReportCellKind;
  unit?: number;
  /** เมื่อเลือกตัด iPhone บางรุ่น: จำนวนที่เป็นของรุ่นที่ตัด (แยกจาก unit ซึ่งเป็นรุ่นที่นับ) */
  unit18?: number;
  att?: number; // %
  baht?: number;
};

export type DailyReportPreset = {
  id: string;
  name: string;
  kind: DailyReportCellKind;
};

export const ATTACH_PER_BILL_TARGET = 3;

export type DailyReportRow = {
  name: string;
  isTotal?: boolean;
  totalBaht: number;
  totalDevice: number;
  /** จำนวนบิล · บิลที่ผ่าน (attach ≥ 3 ชิ้น) · % บิลที่ผ่าน */
  billCount?: number;
  attachPieces?: number;
  qualifiedBills?: number;
  attachPerBill?: number;
  /** บิล iPhone ที่มี Cover / UFUND / SIM / Acc ≥3 อย่างน้อย 1 อย่าง */
  creditedBills?: number;
  /** ต้องมีกี่บิล (1 ต่อ iPhone 4 เครื่อง) */
  requiredCredits?: number;
  /** true = ขาย iPhone ครบ 4 เครื่องแต่แนบไม่ถึงโควตา → ช่อง iPhone สีแดง */
  iphoneAttachAlert?: boolean;
  /** true = ขาย iPhone 3 เครื่อง (ของก้อน 4) แล้วยังไม่มีบิลแนบ → เตือนสีเหลือง */
  iphoneAttachWarn?: boolean;
  /** รายละเอียดเครดิตต่อบิล (แสดงใน tooltip) */
  creditLog?: string[];
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
  /** มีค่า = ตารางรายเดือน (YYYY-MM-01) */
  monthFrom?: string;
  /** เวลาบิลล่าสุดในข้อมูลวันล่าสุด (HH:MM) */
  lastBillTime?: string;
  /** รายเดือน: กำลังกรองช่วงวันเอง (เช่น รายสัปดาห์) */
  rangeActive?: boolean;
  rangeFrom?: string;
  rangeTo?: string;
  /** วันแรก / วันล่าสุดที่มีข้อมูล (ไว้ทำตัวเลือกช่วงวัน) */
  dataFrom?: string;
  dataTo?: string;
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

const ORDER_KEY = "daily-branch-report-col-order";

export type ReportRange = { from: string; to: string } | null;

export const DailyBranchReportSection: React.FC<{
  data: DailyReportData;
  boost?: string;
  uploadedAt?: string;
  /** ตารางรายเดือน: ช่วงวันที่เลือก + ตัวเปลี่ยน (ไม่ส่ง = ไม่มีตัวเลือก) */
  range?: ReportRange;
  onRangeChange?: (r: ReportRange) => void;
}> = ({
  data,
  boost,
  uploadedAt,
  range,
  onRangeChange,
}) => {
  const isMonthly = Boolean(data.monthFrom);
  // Column order (preset ids) — user can drag the group headers to reorder.
  // Persisted per browser so the layout sticks between visits.
  const [order, setOrder] = React.useState<string[]>([]);
  // มือถือ: คำอธิบายยาว ย่อไว้ 2 บรรทัด กดอ่านต่อได้
  const [legendOpen, setLegendOpen] = React.useState(false);
  const dragId = React.useRef<string | null>(null);

  React.useEffect(() => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]");
    } catch {
      saved = [];
    }
    const ids = data.presets.map((p) => p.id);
    // keep saved order for ids that still exist, then append any new ones
    const next = [...saved.filter((id) => ids.includes(id)), ...ids.filter((id) => !saved.includes(id))];
    setOrder(next);
  }, [data.presets]);

  const presets = React.useMemo(() => {
    if (!order.length) return data.presets;
    const byId = new Map(data.presets.map((p) => [p.id, p]));
    return order.map((id) => byId.get(id)).filter(Boolean) as DailyReportPreset[];
  }, [data.presets, order]);

  const onDrop = (targetId: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    setOrder((prev) => {
      const cur = prev.length ? [...prev] : data.presets.map((p) => p.id);
      const fi = cur.indexOf(from);
      const ti = cur.indexOf(targetId);
      if (fi < 0 || ti < 0) return prev;
      cur.splice(ti, 0, cur.splice(fi, 1)[0]);
      try {
        localStorage.setItem(ORDER_KEY, JSON.stringify(cur));
      } catch {
        /* ignore */
      }
      return cur;
    });
  };

  const resetOrder = () => {
    const ids = data.presets.map((p) => p.id);
    setOrder(ids);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  };

  const hasSplit = data.rows.some((r) =>
    Object.values(r.cells).some((c) => c?.unit18 != null && c.unit18 > 0),
  );

  if (!data.rows.length) return null;

  return (
    <div className="report-card bg-white rounded-2xl border border-slate-200 p-5 ">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <LayoutGrid className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold tracking-tight text-slate-800">
          {isMonthly
            ? data.rangeActive
              ? `รายงานยอดขาย + Attach ช่วง ${fmtDay(data.rangeFrom ?? "")} – ${fmtDay(data.rangeTo ?? "")}`
              : "รายงานยอดขาย + Attach รายเดือน (เดือนล่าสุด)"
            : "รายงานยอดขาย + Attach รายวัน (วันล่าสุด)"}
        </h3>
        {boost ? (
          <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800" title="บิลที่แนบตัวที่เลือกได้เครดิตตามตัวคูณ · ตัวอื่นลดลงระหว่างช่วงโฟกัส">
            <Flame className="w-3.5 h-3.5" /> {boost}
          </span>
        ) : null}
        {data.lastBillTime || uploadedAt ? (
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
            title="ช่วงเวลาของข้อมูลยอดขายที่ใช้คำนวณในตารางนี้"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {data.lastBillTime ? (
              <span>
                ยอดถึงบิลล่าสุด <span className="text-slate-900 font-semibold">{fmtDay(data.latestDate)} {data.lastBillTime} น.</span>
              </span>
            ) : null}
            {data.lastBillTime && uploadedAt ? <span className="text-slate-300">·</span> : null}
            {uploadedAt ? (
              <span>
                อัปโหลดไฟล์เมื่อ <span className="text-slate-900 font-semibold">{uploadedAt}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      {isMonthly && onRangeChange && data.dataTo ? (
        <RangePicker data={data} range={range ?? null} onChange={onRangeChange} />
      ) : null}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
        <p className={`text-xs text-slate-400 ${legendOpen ? "" : "max-md:line-clamp-2"}`}>
          {isMonthly
            ? `${data.rangeActive ? "สะสมช่วง" : "สะสมทั้งเดือน"} ${fmtDay(data.monthFrom ?? "")} – ${fmtDay(data.latestDate)}`
            : `ข้อมูลวันล่าสุด ${fmtDay(data.latestDate)}`} · ATT% = จำนวน ÷ ฐาน (ส่วนใหญ่ ÷ iPhone, AC+ ÷ iPhone+iPad,
          Pencil/iPad Acc ÷ iPad) · <span className="text-emerald-700 font-semibold">บิลผ่าน = บิลที่มี iPhone และมี UFUND+Cover+SIM+Acc ≥ 3 ชิ้น</span>
          {" · "}<span className="px-1 rounded bg-rose-500 text-white font-semibold">iPhone สีแดง</span>{" "}
          = ขาย iPhone ทุก 4 เครื่องแต่ไม่มีบิลที่แนบ Cover / UFUND / SIM / Acc ≥3 ชิ้น
          {" · "}<span className="px-1 rounded bg-amber-300 text-amber-900 font-semibold">iPhone สีเหลือง</span>{" "}
          = เตือน ขายไป 3 เครื่องแล้วยังไม่มีบิลแนบ
          {" · "}<span className="text-slate-500">ลากหัวคอลัมน์เพื่อสลับตำแหน่งได้</span>
          {hasSplit ? (
            <>
              {" "}· <span className="text-amber-600 font-semibold">ตัวเลขส้ม +N (ตัด) = ของ iPhone รุ่นที่เลือกตัด แยกออกมา</span>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className="md:hidden mt-1 text-[11px] font-semibold text-emerald-700 underline"
        >
          {legendOpen ? "ย่อคำอธิบาย" : "อ่านคำอธิบาย"}
        </button>
        </div>
        <button
          type="button"
          onClick={resetOrder}
          className="hidden md:inline shrink-0 text-[11px] text-slate-400 underline hover:text-slate-600"
        >
          รีเซ็ตลำดับคอลัมน์
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap text-slate-700">
          <thead>
            {/* Row 1 — groups */}
            <tr className="border-b border-slate-200">
              <th
                rowSpan={2}
                className="py-2 px-2 font-semibold text-slate-500 sticky left-0 bg-white border-r border-slate-200 text-[11px]"
              >
                พนักงาน
              </th>
              <th rowSpan={2} className="py-2 px-2 font-semibold text-slate-500 text-right bg-slate-50">Total ฿</th>
              <th rowSpan={2} className="py-2 px-2 font-semibold text-slate-500 text-right">Device</th>
              <th colSpan={2} className="py-1.5 px-2 font-semibold text-center bg-slate-100 text-slate-600 border-l border-slate-200">
                iPhone
              </th>
              <th colSpan={2} className="py-1.5 px-2 font-semibold text-center bg-slate-50 text-slate-600 border-l border-slate-200">
                iPad
              </th>
              <th
                colSpan={3}
                className="py-1.5 px-2 font-semibold text-center bg-emerald-100 text-emerald-800 border-l border-slate-200"
                title="บิลที่มี UFUND / Cover / SIM / Accessories รวมอย่างน้อย 3 ชิ้น ถึงจะนับว่าผ่าน"
              >
                บิล Attach ≥{ATTACH_PER_BILL_TARGET} ชิ้น
              </th>
              {presets.map((p, i) => {
                const color = GROUP_COLORS[i % GROUP_COLORS.length];
                const span = p.kind === "att" ? 2 : 1;
                return (
                  <th
                    key={p.id}
                    colSpan={span}
                    rowSpan={span === 1 ? 2 : 1}
                    draggable
                    onDragStart={() => {
                      dragId.current = p.id;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(p.id)}
                    title="ลากเพื่อสลับตำแหน่งคอลัมน์"
                    className={`py-1.5 px-2 font-semibold text-center border-l border-slate-200 cursor-grab active:cursor-grabbing select-none ${color}`}
                  >
                    {p.name}
                  </th>
                );
              })}
            </tr>
            {/* Row 2 — sub labels */}
            <tr className="border-b border-slate-200 text-[11px] text-slate-400 ">
              <th className="py-1 px-2 text-right bg-slate-100 border-l border-slate-200">จำนวน</th>
              <th className="py-1 px-2 text-right bg-slate-100">฿</th>
              <th className="py-1 px-2 text-right bg-slate-50 border-l border-slate-200">จำนวน</th>
              <th className="py-1 px-2 text-right bg-slate-50">฿</th>
              <th className="py-1 px-2 text-right border-l border-slate-200" title="เฉพาะบิลที่มี iPhone">บิล iPhone</th>
              <th className="py-1 px-2 text-right">ผ่าน</th>
              <th className="py-1 px-2 text-center">% ผ่าน</th>
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
                    ? "bg-emerald-50 font-semibold border-b-2 border-emerald-200"
                    : idx % 2 === 0
                      ? "bg-white border-b border-slate-100"
                      : "bg-slate-50/60 border-b border-slate-100"
                }
              >
                <td
                  className={`py-1.5 px-2 font-semibold sticky left-0 border-r border-slate-200 ${
                    r.isTotal ? "bg-emerald-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  {r.name}
                </td>
                <td className="py-1.5 px-2 text-right font-semibold bg-slate-50/40">{fmtBaht(r.totalBaht)}</td>
                <td className="py-1.5 px-2 text-right font-semibold">{num(r.totalDevice)}</td>
                <td
                  className={`py-1.5 px-2 text-right border-l border-slate-200 ${
                    r.iphoneAttachAlert
                      ? "bg-rose-500 text-white font-semibold"
                      : r.iphoneAttachWarn
                        ? "bg-amber-300 text-amber-900 font-semibold"
                        : ""
                  }`}
                  title={
                    r.isTotal
                      ? undefined
                      : `เครดิตแนบ (Cover/UFUND/SIM/Acc≥3, ตามโหมดโฟกัส): ${Math.round((r.creditedBills ?? 0) * 10) / 10} (ต้องมี ${r.requiredCredits ?? 0} — 1 ต่อ iPhone 4 เครื่อง)` +
                        (boost ? `\nโหมดตอนนี้: ${boost}` : "") +
                        (r.creditLog?.length ? `\n\nรายบิล:\n${r.creditLog.join("\n")}` : "")
                  }
                >
                  {num(r.iphoneUnit)}
                </td>
                <td
                  className={`py-1.5 px-2 text-right ${
                    r.iphoneAttachAlert
                      ? "bg-rose-500 text-white"
                      : r.iphoneAttachWarn
                        ? "bg-amber-300 text-amber-900"
                        : "text-slate-400"
                  }`}
                >
                  {r.iphoneBaht ? fmtBaht(r.iphoneBaht) : "–"}
                </td>
                <td className="py-1.5 px-2 text-right border-l border-slate-200">{num(r.ipadUnit)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">{r.ipadBaht ? fmtBaht(r.ipadBaht) : "–"}</td>
                <td className="py-1.5 px-2 text-right border-l border-slate-200">{num(r.billCount ?? 0)}</td>
                <td className="py-1.5 px-2 text-right font-semibold">{num(r.qualifiedBills ?? 0)}</td>
                <td
                  className={`py-1.5 px-2 text-center font-semibold ${
                    (r.attachPerBill ?? 0) >= 50
                      ? "bg-emerald-100 text-emerald-700"
                      : (r.attachPerBill ?? 0) >= 25
                        ? "bg-amber-100 text-amber-700"
                        : (r.attachPerBill ?? 0) > 0
                          ? "bg-rose-100 text-rose-700"
                          : "text-slate-300"
                  }`}
                >
                  {r.billCount ? `${(r.attachPerBill ?? 0).toFixed(1)}%` : "–"}
                </td>
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
                      <td className="py-1.5 px-2 text-right border-l border-slate-200">
                        <div>{num(c?.unit ?? 0)}</div>
                        {c?.unit18 != null && c.unit18 > 0 ? (
                          <div className="text-[11px] font-semibold text-amber-600">+{c.unit18} (ตัด)</div>
                        ) : null}
                      </td>
                      <td className={`py-1.5 px-2 text-center font-semibold ${attFill(att)}`}>
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

// ─── ตัวเลือกช่วงวัน (ทั้งเดือน / รายสัปดาห์ จันทร์–อาทิตย์ / กำหนดเอง) ─────────
const ymdOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const shortDay = (ymd: string) => {
  const [, m, d] = ymd.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** สัปดาห์ (จันทร์–อาทิตย์) ของเดือนล่าสุด ตัดให้อยู่ในเดือน และไม่เกินวันล่าสุดที่มีข้อมูล */
function monthWeeks(latest: string): Array<{ from: string; to: string; label: string }> {
  const last = dateOf(latest);
  const start = new Date(last.getFullYear(), last.getMonth(), 1);
  const out: Array<{ from: string; to: string; label: string }> = [];
  let cur = new Date(start);
  let n = 1;
  while (cur <= last) {
    const dow = (cur.getDay() + 6) % 7; // จันทร์ = 0
    const end = new Date(cur);
    end.setDate(cur.getDate() + (6 - dow));
    const to = end > last ? last : end;
    const from = ymdOf(cur);
    const toY = ymdOf(to);
    out.push({ from, to: toY, label: `W${n} · ${shortDay(from)}${from === toY ? "" : `–${shortDay(toY)}`}` });
    cur = new Date(to);
    cur.setDate(cur.getDate() + 1);
    n++;
  }
  return out;
}

function RangePicker({
  data,
  range,
  onChange,
}: {
  data: DailyReportData;
  range: ReportRange;
  onChange: (r: ReportRange) => void;
}) {
  const latest = data.dataTo ?? data.latestDate;
  const weeks = React.useMemo(() => monthWeeks(latest), [latest]);
  const [custom, setCustom] = React.useState(false);
  const isWeek = (w: { from: string; to: string }) => range?.from === w.from && range?.to === w.to;
  const customActive = Boolean(range) && !weeks.some(isWeek);
  const chip = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
      active
        ? "bg-emerald-600 border-emerald-600 text-white"
        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        <button type="button" className={chip(!range && !custom)} onClick={() => { setCustom(false); onChange(null); }}>
          ทั้งเดือน
        </button>
        {weeks.map((w) => (
          <button key={w.from} type="button" className={chip(isWeek(w))} onClick={() => { setCustom(false); onChange({ from: w.from, to: w.to }); }}>
            {w.label}
          </button>
        ))}
        <button type="button" className={chip(custom || customActive)} onClick={() => setCustom((v) => !v)}>
          กำหนดเอง
        </button>
      </div>
      {custom || customActive ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
          <span>จาก</span>
          <input
            type="date"
            value={range?.from ?? ""}
            min={data.dataFrom}
            max={latest}
            onChange={(e) => {
              const from = e.target.value;
              if (!from) return;
              const to = range?.to && range.to >= from ? range.to : latest;
              onChange({ from, to });
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
          />
          <span>ถึง</span>
          <input
            type="date"
            value={range?.to ?? ""}
            min={range?.from ?? data.dataFrom}
            max={latest}
            onChange={(e) => {
              const to = e.target.value;
              if (!to) return;
              const from = range?.from && range.from <= to ? range.from : (data.dataFrom ?? to);
              onChange({ from, to });
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
          />
        </div>
      ) : null}
    </div>
  );
}
