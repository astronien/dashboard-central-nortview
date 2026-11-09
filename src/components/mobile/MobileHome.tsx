import React from "react";
import { ChevronDown, ChevronRight, Gauge, Table2 } from "lucide-react";
import type { CategorySnapshotItem } from "../../lib/categorySnapshotBuilder";
import type {
  CombinedOfficerKpiData,
  CombinedOfficerRow,
  CombinedWonderCell,
} from "../dashboard/HomeDashboardSection";
import type { DailyReportData } from "../dashboard/DailyBranchReportSection";
import type { HourlySales } from "../../lib/hourlySales";
import { HourlySalesSection } from "../dashboard/HourlySalesSection";
import { Avatar, Bar, Card, Pill, Segmented, fmtPctShort, fmtShort, toneOf } from "./mobileUi";

const isPctCalc = (c?: string) => c === "attach" || c === "bahtRate" || c === "catAttach" || c === "tradeIn";
/** % ถึงเป้าของ 7 Wonders (ประเภท % เทียบ actual ÷ target) */
export const wonderPct = (w: CombinedWonderCell | undefined): number | null => {
  if (!w || !(w.target > 0)) return null;
  return isPctCalc(w.calcType) ? (w.actual / w.target) * 100 : w.achPercent;
};
const fmtDay = (ymd: string) => {
  if (!ymd) return "";
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
};

type Tab = "month" | "today";

export function MobileHome({
  storeName,
  pace,
  categories,
  combined,
  daily,
  hourly,
  avatarOf,
  onOpenStaff,
  fullView,
}: {
  storeName: string;
  pace: { actual: number; target: number; currentDay: number; totalDays: number };
  categories: CategorySnapshotItem[];
  combined: CombinedOfficerKpiData;
  daily: DailyReportData;
  hourly?: HourlySales;
  avatarOf: (name: string, staffId?: string) => string | undefined;
  onOpenStaff: (name: string) => void;
  /** ตารางเต็มแบบบนคอม (เปิดด้วยปุ่ม) */
  fullView: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<Tab>("month");
  const [open, setOpen] = React.useState<string | null>(null);
  const [showFull, setShowFull] = React.useState(false);

  // ── สรุปความเร็ว (pace) ─────────────────────────────────────────────
  const { actual, target, currentDay, totalDays } = pace;
  const ach = target > 0 ? (actual / target) * 100 : 0;
  const expectedPct = totalDays > 0 ? (currentDay / totalDays) * 100 : 0;
  // เทียบกับยอดที่ควรถึงวันนี้ (สูตรเดียวกับการ์ดบนคอม)
  const expectedAmt = target * (expectedPct / 100);
  const gap = expectedAmt > 0 ? (actual / expectedAmt) * 100 - 100 : 0;
  const daysLeft = Math.max(totalDays - currentDay, 0);
  const perDay = daysLeft > 0 ? Math.max(target - actual, 0) / daysLeft : 0;
  const forecastPct = currentDay > 0 && target > 0 ? ((actual / currentDay) * totalDays / target) * 100 : 0;
  const paceTone = gap >= 0 ? "good" : gap >= -10 ? "warn" : "bad";
  const paceCls = "border-white/10 bg-white/5";
  const paceText =
    paceTone === "good" ? "text-emerald-300" : paceTone === "warn" ? "text-amber-300" : "text-rose-300";

  const staffRows = React.useMemo(
    () => [...combined.rows].sort((a, b) => (b.catTotal.achPercent || 0) - (a.catTotal.achPercent || 0)),
    [combined.rows],
  );
  const dailyRows = daily.rows.filter((r) => !r.isTotal).sort((a, b) => b.totalBaht - a.totalBaht);
  const dailyTotal = daily.rows.find((r) => r.isTotal);
  const alertCount = daily.rows.filter((r) => !r.isTotal && r.iphoneAttachAlert).length;

  return (
    <div className="flex flex-col gap-3">
      {/* หัว: สาขา + ข้อมูลถึงเมื่อไร */}
      <div className="flex items-end justify-between px-0.5">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-white truncate">{storeName}</div>
          <div className="text-[11px] text-white/55">
            ข้อมูลถึง {fmtDay(daily.latestDate)}
            {daily.lastBillTime ? ` ${daily.lastBillTime} น.` : ""} · วันที่ {currentDay}/{totalDays}
          </div>
        </div>
      </div>

      {/* ยอด / เป้า */}
      {target > 0 ? (
        <div className={`rounded-2xl border p-3.5 ${paceCls}`}>
          <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${paceText}`}>
            <Gauge className="w-4 h-4" />
            {gap >= 0 ? `นำเป้า ${Math.round(gap)}%` : `ช้ากว่าเป้า ${Math.round(-gap)}%`}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] font-semibold text-white tabular-nums">฿{fmtShort(actual)}</span>
            <span className="text-[13px] text-white/55 tabular-nums">/ {fmtShort(target)}</span>
            <span className={`ml-auto text-[18px] font-semibold tabular-nums ${paceText}`}>{fmtPctShort(ach)}</span>
          </div>
          <Bar pct={ach} tone={paceTone} mark={expectedPct} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
              <div className="text-white/50">ต้องทำต่อวัน</div>
              <div className="font-semibold text-white tabular-nums">฿{fmtShort(perDay)}</div>
            </div>
            <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
              <div className="text-white/50">คาดจบเดือน</div>
              <div className="font-semibold text-white tabular-nums">{fmtPctShort(forecastPct)}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* หมวด: เลื่อนแนวนอน */}
      {categories.length ? (
        <div className="-mx-3 px-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((c) => {
            const pct = c.achieveRate;
            return (
              <div key={c.category} className="shrink-0 w-[104px] rounded-xl bg-white/10 border border-white/10 px-2.5 py-2">
                <div className="text-[11px] text-white/60 truncate">{c.category}</div>
                <div className="text-[16px] font-semibold text-white tabular-nums">{fmtPctShort(pct)}</div>
                <Bar pct={pct} mark={c.forecastRate > 0 && pct > 0 ? (pct / c.forecastRate) * 100 : null} />
                <div className="mt-1 text-[11px] text-white/45 tabular-nums truncate">
                  วันนี้ {c.measureType === "quantity" ? Math.round(c.today) : fmtShort(c.today)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {hourly ? <HourlySalesSection data={hourly} compact /> : null}

      {/* รายชื่อพนักงาน */}
      <Card className="!p-3">
        <Segmented<Tab>
          value={tab}
          onChange={(k) => {
            setTab(k);
            setOpen(null);
          }}
          options={[
            { key: "month", label: "เดือนนี้" },
            { key: "today", label: "วันนี้", badge: alertCount },
          ]}
        />

        {tab === "month" ? (
          <ul className="mt-1 divide-y divide-white/10">
            {staffRows.map((r) => (
              <StaffMonthRow
                key={r.officer.name}
                row={r}
                combined={combined}
                avatar={avatarOf(r.officer.name, r.officer.staffId)}
                open={open === r.officer.name}
                onToggle={() => setOpen((o) => (o === r.officer.name ? null : r.officer.name))}
                onOpenStaff={() => onOpenStaff(r.officer.name)}
                expectedPct={expectedPct}
              />
            ))}
          </ul>
        ) : null}

        {tab === "today" ? (
          <>
            {dailyTotal ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[12px]">
                <span className="text-amber-200 font-semibold">รวม {fmtDay(daily.latestDate)}</span>
                <span className="text-white font-semibold tabular-nums">
                  ฿{fmtShort(dailyTotal.totalBaht)} · {dailyTotal.totalDevice} เครื่อง · iPhone {dailyTotal.iphoneUnit}
                </span>
              </div>
            ) : null}
            <ul className="mt-1 divide-y divide-white/10">
              {dailyRows.map((r) => {
                const iphoneCls = r.iphoneAttachAlert
                  ? "bg-rose-500 text-white"
                  : r.iphoneAttachWarn
                    ? "bg-amber-300 text-amber-950"
                    : "bg-white/10 text-white/80";
                const billPct = r.billCount ? ((r.qualifiedBills ?? 0) / r.billCount) * 100 : null;
                return (
                  <li key={r.name} className="py-2.5 flex items-center gap-2.5">
                    <Avatar src={avatarOf(r.name)} name={r.name} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold text-white truncate">{r.name}</span>
                        <span className="text-[14px] font-semibold text-white tabular-nums">฿{fmtShort(r.totalBaht)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${iphoneCls}`}>iPhone {r.iphoneUnit}</span>
                        <span>{r.totalDevice} เครื่อง</span>
                        {r.billCount ? (
                          <span className="ml-auto">
                            บิลผ่าน {r.qualifiedBills ?? 0}/{r.billCount}
                            {billPct != null ? ` (${Math.round(billPct)}%)` : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-white/45">
              <span className="px-1 rounded bg-rose-500 text-white font-semibold">แดง</span> ขาย iPhone ครบ 4 เครื่องแต่ไม่มีบิลแนบ ·{" "}
              <span className="px-1 rounded bg-amber-300 text-amber-950 font-semibold">เหลือง</span> ขายไป 3 เครื่องแล้วยังไม่มีบิลแนบ
            </p>
          </>
        ) : null}

      </Card>

      {/* ตารางเต็มแบบบนคอม */}
      <button
        type="button"
        onClick={() => setShowFull((v) => !v)}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-[13px] font-semibold text-white/80"
      >
        <Table2 className="w-4 h-4" />
        {showFull ? "ซ่อนตารางเต็ม" : "ดูตารางเต็ม (แบบบนคอม)"}
        <ChevronDown className={`w-4 h-4 transition-transform ${showFull ? "rotate-180" : ""}`} />
      </button>
      {showFull ? <div className="flex flex-col gap-4">{fullView}</div> : null}
    </div>
  );
}

function StaffMonthRow({
  row,
  combined,
  avatar,
  open,
  onToggle,
  onOpenStaff,
  expectedPct,
}: {
  expectedPct: number;
  row: CombinedOfficerRow;
  combined: CombinedOfficerKpiData;
  avatar?: string;
  open: boolean;
  onToggle: () => void;
  onOpenStaff: () => void;
}) {
  const pct = row.catTotal.target > 0 ? row.catTotal.achPercent : null;
  return (
    <li className="py-2.5">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2.5 text-left">
        <Avatar src={avatar} name={row.officer.name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-white truncate">{row.officer.name}</span>
            <span className="text-[13px] font-semibold text-white tabular-nums">฿{fmtShort(row.catTotal.actual)}</span>
          </div>
          <Bar pct={pct ?? 0} tone={toneOf(pct)} mark={expectedPct} />
        </div>
        <Pill pct={pct ?? undefined} />
        <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-2 ml-[46px] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {combined.categories.map((cat) => {
              const c = row.cats[cat];
              if (!c || (!(c.target > 0) && !(c.actual > 0))) return null;
              const p = c.target > 0 ? c.achPercent : null;
              return (
                <div key={cat} className="min-w-0">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60 truncate">{cat}</span>
                    <span className="font-semibold text-white tabular-nums">{p == null ? fmtShort(c.actual) : fmtPctShort(p)}</span>
                  </div>
                  <Bar pct={p ?? 0} tone={toneOf(p)} mark={p != null ? expectedPct : null} />
                </div>
              );
            })}
          </div>
          {combined.presets.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 border-t border-white/10">
              {combined.presets.map((p) => {
                const w = row.wonders[p.id];
                const v = wonderPct(w);
                const shown = isPctCalc(w?.calcType) ? w?.actual : v;
                return (
                  <div key={p.id} className="min-w-0">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/60 truncate">{p.name}</span>
                      <span className="font-semibold text-white tabular-nums">
                        {shown == null ? "—" : fmtPctShort(shown)}
                      </span>
                    </div>
                    <Bar pct={v ?? 0} tone={toneOf(v)} />
                  </div>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onOpenStaff}
            className="self-start inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-300"
          >
            ดูโปรไฟล์ <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </li>
  );
}
