import React from "react";
import { AlertCircle, Archive, CheckCircle2, History, Loader2, Upload } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RawRow } from "../../lib/salesAggregations";
import type { Preset } from "../../lib/presetTypes";
import { AttHistoryView } from "./AttHistoryView";
import { CatHistoryView } from "./CatHistoryView";
import { HistorySummaryCards, ProductivityView, RankView, StaffProfileView } from "./HistoryInsights";
import { parseSalesExcelFile } from "../../lib/salesUpload";
import { filterRowsByBranch } from "../../lib/matchHelpers";
import {
  monthLabelTh,
  saveArchiveMonth,
  splitByMonth,
  summarizeMonth,
  type ArchiveMonthMeta,
} from "../../lib/salesArchive";

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`);
const pct = (n: number | null) => (n == null || !Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${Math.round(n)}%`);
/** เป้ารวมของเดือนเก็บอยู่ในลายเซ็น "แถว:ยอดเป้า" */
const targetOf = (m: ArchiveMonthMeta) => {
  const t = Number(String(m.targetSignature ?? "").split(":")[1]);
  return Number.isFinite(t) && t > 0 ? t : null;
};

type View = "total" | "category" | "staff" | "person" | "rank" | "prod" | "cat" | "att";

export function HistorySection({
  branch,
  archiveKey,
  months,
  getCategory,
  onArchiveChanged,
  currentMonth,
  presets = [],
  categoryMaster = [],
  staffOrder = [],
  currentTarget,
  currentActual,
}: {
  currentTarget?: number;
  currentActual?: number;
  presets?: Preset[];
  categoryMaster?: RawRow[];
  staffOrder?: string[];
  branch: string;
  /** คีย์คลัง (รหัสสาขา) — ใช้ตอนบันทึก */
  archiveKey: string;
  months: ArchiveMonthMeta[];
  getCategory: (r: RawRow) => string;
  onArchiveChanged: () => void | Promise<void>;
  /** เดือนของไฟล์ยอดขายปัจจุบัน (YYYY-MM) — เดือนนี้ยังไม่จบ */
  currentMonth?: string;
}) {
  const [view, setView] = React.useState<View>("total");
  const [pick, setPick] = React.useState<string>("");
  const sales = months.filter((m) => m.rowCount > 0 && m.summary);

  const categories = React.useMemo(() => {
    const t = new Map<string, number>();
    for (const m of sales) for (const [k, v] of Object.entries(m.summary!.byCategory)) t.set(k, (t.get(k) ?? 0) + v);
    return Array.from(t.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [sales]);
  const staff = React.useMemo(() => {
    const t = new Map<string, number>();
    for (const m of sales) for (const [k, v] of Object.entries(m.summary!.byStaff)) t.set(k, (t.get(k) ?? 0) + v.baht);
    return Array.from(t.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [sales]);
  const pickNow = view === "category" ? pick || categories[0] || "" : view === "staff" ? pick || staff[0] || "" : "";

  const valueOf = (m: ArchiveMonthMeta) =>
    view === "category"
      ? m.summary!.byCategory[pickNow] ?? 0
      : view === "staff"
        ? m.summary!.byStaff[pickNow]?.baht ?? 0
        : m.summary!.totalBaht;

  const rows = sales.map((m, i) => {
    const v = valueOf(m);
    const prev = i > 0 ? valueOf(sales[i - 1]) : null;
    const yAgo = sales.find((x) => {
      const [y, mo] = m.month.split("-").map(Number);
      return x.month === `${y - 1}-${String(mo).padStart(2, "0")}`;
    });
    const bills = view === "staff" ? m.summary!.byStaff[pickNow]?.bills ?? 0 : m.summary!.bills;
    const iphone = view === "staff" ? m.summary!.byStaff[pickNow]?.iphone ?? 0 : m.summary!.iphone;
    const target = view === "total" ? targetOf(m) : null;
    return {
      month: m.month,
      label: monthLabelTh(m.month),
      value: v,
      mom: prev ? (v / prev) * 100 - 100 : null,
      yoy: yAgo ? (v / valueOf(yAgo)) * 100 - 100 : null,
      perDay: m.summary!.dayCount ? v / m.summary!.dayCount : 0,
      days: m.summary!.dayCount,
      bills,
      ticket: bills ? v / bills : 0,
      iphone,
      target,
      ach: target ? (v / target) * 100 : null,
      partial: m.month === currentMonth,
    };
  });
  const best = rows.filter((r) => !r.partial).reduce<(typeof rows)[number] | null>((a, b) => (!a || b.value > a.value ? b : a), null);

  return (
    <div className="flex flex-col gap-6">
      <HistorySummaryCards
        archiveKey={archiveKey}
        months={months}
        presets={presets}
        categoryMaster={categoryMaster}
        currentMonth={currentMonth}
        staffOrder={staffOrder}
        currentTarget={currentTarget}
        currentActual={currentActual}
      />
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <History className="w-5 h-5 text-white/60" /> ประวัติรายเดือน
            </h2>
            <p className="text-[13px] text-white/60">
              {sales.length ? `เก็บไว้ ${sales.length} เดือน (${monthLabelTh(sales[0].month)} – ${monthLabelTh(sales[sales.length - 1].month)})` : "ยังไม่มีข้อมูลในคลัง"}
              {best ? ` · เดือนที่ดีที่สุด ${best.label} ${baht(best.value)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[13px]">
              {(
                [
                  ["total", "ทั้งร้าน"],
                  ["category", "รายหมวด"],
                  ["staff", "รายคน"],
                  ["person", "การ์ดรายคน"],
                  ["rank", "อันดับ"],
                  ["prod", "ยอดต่อวันทำงาน"],
                  ["cat", "หมวดหลักรายคน"],
                  ["att", "ATT รายคน"],
                ] as Array<[View, string]>
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setView(k);
                    setPick("");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${view === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {view === "category" || view === "staff" ? (
              <select
                value={pickNow}
                onChange={(e) => setPick(e.target.value)}
                className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[13px]"
              >
                {(view === "category" ? categories : staff).map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {view === "person" ? (
          <StaffProfileView
            archiveKey={archiveKey}
            months={months}
            presets={presets}
            categoryMaster={categoryMaster}
            currentMonth={currentMonth}
            staffOrder={staffOrder}
          />
        ) : view === "rank" ? (
          <RankView months={months} currentMonth={currentMonth} staffOrder={staffOrder} />
        ) : view === "prod" ? (
          <ProductivityView archiveKey={archiveKey} months={months} currentMonth={currentMonth} staffOrder={staffOrder} />
        ) : view === "cat" ? (
          <CatHistoryView
            archiveKey={archiveKey}
            months={months}
            categoryMaster={categoryMaster}
            currentMonth={currentMonth}
            staffOrder={staffOrder}
          />
        ) : view === "att" ? (
          <AttHistoryView
            archiveKey={archiveKey}
            months={months}
            presets={presets}
            categoryMaster={categoryMaster}
            currentMonth={currentMonth}
            staffOrder={staffOrder}
          />
        ) : rows.length ? (
          <>
            <div className="daily-chart h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 22, right: 8, bottom: 0, left: -4 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                    tickFormatter={(v: number) => short(v)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(127,127,127,0.12)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as (typeof rows)[number];
                      return (
                        <div className="rounded-lg border border-white/15 bg-[#0c3123] px-3 py-2 text-[12px] text-white">
                          <div className="font-semibold">
                            {r.label}
                            {r.partial ? " (ยังไม่จบเดือน)" : ""}
                          </div>
                          <div className="tabular-nums">{baht(r.value)}</div>
                          {r.target ? <div className="tabular-nums text-white/75">เป้า {baht(r.target)} · {Math.round(r.ach!)}%</div> : null}
                          <div className="tabular-nums text-white/75">เทียบเดือนก่อน {pct(r.mom)}</div>
                          <div className="tabular-nums text-white/75">เฉลี่ยวันละ {baht(r.perDay)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {rows.map((r) => (
                      <Cell key={r.month} fill="#34d399" fillOpacity={r.partial ? 0.45 : 1} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(v: unknown) => short(Number(v))} fill="rgba(255,255,255,0.8)" fontSize={11} />
                  </Bar>
                  {view === "total" ? (
                    <Line dataKey="target" type="monotone" stroke="#fcd34d" strokeWidth={2} dot={{ r: 3, fill: "#fcd34d" }} connectNulls={false} isAnimationActive={false} />
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[12px] text-white/55">
              แท่งจาง = เดือนนี้ (ยังไม่จบเดือน){view === "total" ? " · จุดเหลือง = เป้า (มีตั้งแต่เดือนที่เริ่มเก็บเป้า)" : ""}
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[12px]">
                    <th className="py-2 px-3 font-semibold">เดือน</th>
                    <th className="py-2 px-3 font-semibold text-right">ยอดขาย</th>
                    <th className="py-2 px-3 font-semibold text-right">เทียบเดือนก่อน</th>
                    <th className="py-2 px-3 font-semibold text-right">เทียบปีก่อน</th>
                    <th className="py-2 px-3 font-semibold text-right">เฉลี่ยต่อวัน</th>
                    <th className="py-2 px-3 font-semibold text-right">บิล</th>
                    <th className="py-2 px-3 font-semibold text-right">ยอดต่อบิล</th>
                    <th className="py-2 px-3 font-semibold text-right">iPhone</th>
                    {view === "total" ? <th className="py-2 px-3 font-semibold text-right">ถึงเป้า</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.month} className="border-b border-white/5">
                      <td className="py-2 px-3 text-white whitespace-nowrap">
                        {r.label}
                        {r.partial ? <span className="text-white/50"> (ยังไม่จบ)</span> : null}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-white">{baht(r.value)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${r.mom == null ? "text-white/40" : r.mom >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{pct(r.mom)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${r.yoy == null ? "text-white/40" : r.yoy >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{pct(r.yoy)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-white/80">{baht(r.perDay)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.bills.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.ticket ? baht(r.ticket) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.iphone.toLocaleString()}</td>
                      {view === "total" ? (
                        <td className={`py-2 px-3 text-right tabular-nums ${r.ach == null ? "text-white/40" : r.ach >= 100 ? "text-emerald-300" : "text-white/80"}`}>
                          {r.ach == null ? "—" : `${Math.round(r.ach)}%`}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-white/60">อัปโหลดไฟล์ยอดขายย้อนหลังด้านล่าง หรือรอให้ระบบเก็บเดือนนี้อัตโนมัติ</p>
        )}
      </div>

      <BackfillPanel branch={branch} archiveKey={archiveKey} months={months} getCategory={getCategory} onDone={onArchiveChanged} currentMonth={currentMonth} />
    </div>
  );
}

/** อัปไฟล์ย้อนหลัง (หลายเดือนในไฟล์เดียว) → แยกเดือน → ตรวจ → บันทึกลงคลัง */
function BackfillPanel({
  branch,
  archiveKey,
  months,
  getCategory,
  onDone,
  currentMonth,
}: {
  branch: string;
  archiveKey: string;
  months: ArchiveMonthMeta[];
  getCategory: (r: RawRow) => string;
  onDone: () => void | Promise<void>;
  currentMonth?: string;
}) {
  const [state, setState] = React.useState<"idle" | "reading" | "preview" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = React.useState("");
  const [preview, setPreview] = React.useState<Array<{ month: string; rows: RawRow[]; total: number; exists: boolean; on: boolean }>>([]);
  const [otherBranchRows, setOtherBranchRows] = React.useState(0);
  const [progress, setProgress] = React.useState("");

  const onFile = async (file: File) => {
    setState("reading");
    setMsg("");
    try {
      const all = await parseSalesExcelFile(file);
      const mine = filterRowsByBranch(all, branch);
      setOtherBranchRows(all.length - mine.length);
      const byMonth = splitByMonth(mine);
      if (!byMonth.size) throw new Error("ไม่พบวันที่ (Doc Date) ในไฟล์ หรือไม่มีแถวของสาขานี้");
      setPreview(
        Array.from(byMonth.entries()).map(([month, rows]) => {
          const total = summarizeMonth(rows, getCategory).totalBaht;
          return {
            month,
            rows,
            total,
            exists: months.some((m) => m.month === month && m.rowCount > 0),
            // เดือนปัจจุบันเก็บอัตโนมัติจากไฟล์ Current อยู่แล้ว — ไม่ติ๊กไว้ก่อน
            on: month !== currentMonth,
          };
        }),
      );
      setState("preview");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    const todo = preview.filter((p) => p.on);
    if (!todo.length) return;
    setState("saving");
    try {
      for (let i = 0; i < todo.length; i++) {
        const p = todo[i];
        await saveArchiveMonth({
          branch: archiveKey,
          month: p.month,
          rows: p.rows,
          summary: summarizeMonth(p.rows, getCategory),
          source: "backfill",
          onProgress: (d, t) => setProgress(`เดือน ${i + 1}/${todo.length} (${monthLabelTh(p.month)}) · ส่วนที่ ${d}/${t}`),
        });
      }
      setState("done");
      setMsg(`บันทึกแล้ว ${todo.length} เดือน`);
      setPreview([]);
      await onDone();
    } catch (e) {
      setState("error");
      setMsg(`บันทึกไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)} — ลองกดบันทึกอีกครั้งได้ (เดือนที่บันทึกแล้วจะถูกทับด้วยข้อมูลเดิม)`);
    } finally {
      setProgress("");
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-white/60" />
          <div>
            <h3 className="text-base font-semibold text-white">อัปโหลดยอดขายย้อนหลัง</h3>
            <p className="text-[12px] text-white/60">
              ไฟล์เดียวหลายเดือนได้ (รูปแบบเดียวกับไฟล์ยอดขายรายวัน) — ระบบแยกเป็นรายเดือนให้ และให้ตรวจก่อนบันทึก
            </p>
          </div>
        </div>
        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 cursor-pointer shrink-0">
          {state === "reading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {state === "reading" ? "กำลังอ่านไฟล์…" : "เลือกไฟล์"}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={state === "reading" || state === "saving"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {preview.length ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="text-[13px] text-white/75">
            พบ {preview.length} เดือน · {preview.reduce((s, p) => s + p.rows.length, 0).toLocaleString()} แถว
            {otherBranchRows ? ` · ข้ามแถวของสาขาอื่น ${otherBranchRows.toLocaleString()} แถว` : ""}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[12px]">
                  <th className="py-2 px-3 font-semibold">บันทึก</th>
                  <th className="py-2 px-3 font-semibold">เดือน</th>
                  <th className="py-2 px-3 font-semibold text-right">แถว</th>
                  <th className="py-2 px-3 font-semibold text-right">ยอดรวม</th>
                  <th className="py-2 px-3 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={p.month} className="border-b border-white/5">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={p.on}
                        onChange={() => setPreview((xs) => xs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                        className="accent-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-white">{monthLabelTh(p.month)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white/80">{p.rows.length.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-white">{baht(p.total)}</td>
                    <td className="py-2 px-3 text-[12px] text-white/60">
                      {p.month === currentMonth ? "เดือนปัจจุบัน — ระบบเก็บจากไฟล์ Current อยู่แล้ว" : p.exists ? "มีในคลังแล้ว — จะบันทึกทับ" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={state === "saving" || !preview.some((p) => p.on)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-50"
            >
              {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              บันทึกลงคลัง ({preview.filter((p) => p.on).length} เดือน)
            </button>
            <button type="button" onClick={() => { setPreview([]); setState("idle"); }} className="text-[13px] text-white/60 hover:text-white">
              ยกเลิก
            </button>
            {progress ? <span className="text-[12px] text-white/60">{progress}</span> : null}
          </div>
        </div>
      ) : null}

      {msg ? (
        <p className={`mt-3 flex items-center gap-1.5 text-[13px] ${state === "error" ? "text-rose-300" : "text-emerald-300"}`}>
          {state === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {msg}
        </p>
      ) : null}

      {months.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-white/75">เดือนที่อยู่ในคลัง ({months.filter((m) => m.rowCount > 0).length})</summary>
          <ul className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
            {months.map((m) => (
              <li key={m.month} className="rounded-lg bg-black/20 px-3 py-2">
                <div className="text-white font-semibold">{monthLabelTh(m.month)}</div>
                <div className="text-white/60">
                  {m.rowCount ? `${m.rowCount.toLocaleString()} แถว · ${baht(m.totalBaht)}` : "ไม่มียอดขาย"}
                </div>
                <div className="text-white/50">
                  {m.source === "backfill" ? "อัปย้อนหลัง" : m.source === "auto" ? "เก็บอัตโนมัติ" : ""}
                  {m.targetSignature ? " · มีเป้า" : ""}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
