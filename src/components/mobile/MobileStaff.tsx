import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Table2, Target } from "lucide-react";
import type { CategoryPerformanceRow } from "../../lib/categoryPerformance";
import { Avatar, Bar, Card, Pill, Segmented, fmtPctShort, fmtShort, toneOf } from "./mobileUi";

const isPctCalc = (c?: string) => c === "attach" || c === "bahtRate" || c === "catAttach" || c === "tradeIn";
const wonderScaled = (r: CategoryPerformanceRow): number | null => {
  if (!(r.target > 0)) return null;
  return isPctCalc(r.calcType) ? (r.actual / r.target) * 100 : r.achPercent;
};
const fmtSigned = (n: number | string) =>
  typeof n === "number" ? `${n > 0 ? "+" : ""}${fmtPctShort(n)}` : String(n);

type Tab = "cat" | "wonder" | "today";

export function MobileStaff({
  officers,
  activeIndex,
  onSelect,
  canSwitch,
  avatarOf,
  name,
  staffId,
  branch,
  rank,
  categoryRows,
  wonderRows,
  sevenWondersScore,
  focusDevice,
  focusWonder,
  todayDateLabel,
  fullView,
}: {
  /** รายชื่อที่เลื่อนไปมาได้ (index = ตำแหน่งใน parsedReport.officers) */
  officers: Array<{ name: string; staffId?: string; index: number }>;
  activeIndex: number;
  onSelect: (index: number) => void;
  canSwitch: boolean;
  avatarOf: (name: string, staffId?: string) => string | undefined;
  name: string;
  staffId?: string;
  branch?: string;
  rank?: { pos: number; of: number };
  categoryRows: CategoryPerformanceRow[];
  wonderRows: CategoryPerformanceRow[];
  sevenWondersScore: number;
  focusDevice: { label: string; rate: number } | null;
  focusWonder: { label: string; rate: number } | null;
  todayDateLabel?: string;
  fullView: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<Tab>("cat");
  const [open, setOpen] = React.useState<string | null>(null);
  const [showFull, setShowFull] = React.useState(false);

  const pos = officers.findIndex((o) => o.index === activeIndex);
  const go = (d: number) => {
    if (!canSwitch || officers.length < 2) return;
    const next = officers[(pos + d + officers.length) % officers.length];
    if (next) {
      setOpen(null);
      onSelect(next.index);
    }
  };

  // ปัดซ้าย/ขวาที่หัวการ์ดเพื่อเปลี่ยนคน
  const touch = React.useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const total = categoryRows.find((r) => r.category === "Total");
  const cats = categoryRows.filter((r) => r.category !== "Total" && r.category !== "Average");
  const wonders = wonderRows.filter((r) => r.category !== "Total" && r.category !== "Average");
  const monthPct = total && total.target > 0 ? total.achPercent : null;
  const todayPct = total && total.targetDay > 0 ? total.achDayPercent : null;

  return (
    <div className="flex flex-col gap-3">
      {/* หัว: รูป ชื่อ เปลี่ยนคน */}
      <div
        className="rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center gap-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {canSwitch ? (
          <button type="button" aria-label="คนก่อนหน้า" onClick={() => go(-1)} className="p-1.5 -ml-1 text-white/60">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : null}
        <Avatar src={avatarOf(name, staffId)} name={name} size={52} />
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-semibold text-white truncate">{name}</div>
          <div className="text-[11px] text-white/55 truncate">
            {rank ? `อันดับ ${rank.pos} จาก ${rank.of}` : ""}
            {staffId ? `${rank ? " · " : ""}ID ${staffId}` : ""}
          </div>
          {branch ? <div className="text-[11px] text-white/40 truncate">{branch}</div> : null}
        </div>
        {canSwitch ? (
          <button type="button" aria-label="คนถัดไป" onClick={() => go(1)} className="p-1.5 -mr-1 text-white/60">
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : null}
      </div>
      {canSwitch && officers.length > 1 ? (
        <div className="-mt-1 flex justify-center gap-1">
          {officers.map((o) => (
            <button
              key={o.index}
              type="button"
              aria-label={o.name}
              onClick={() => onSelect(o.index)}
              className={`h-1.5 rounded-full transition-colors ${o.index === activeIndex ? "w-4 bg-emerald-300" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>
      ) : null}

      {/* 3 ตัวเลขหลัก */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setTab("cat")} className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-left">
          <div className="text-[11px] text-white/55">เดือนนี้</div>
          <div className="text-[18px] font-semibold text-white tabular-nums">{monthPct == null ? "—" : fmtPctShort(monthPct)}</div>
          <div className="text-[11px] text-white/50 tabular-nums truncate">
            ฿{fmtShort(total?.actual ?? 0)} / {fmtShort(total?.target ?? 0)}
          </div>
        </button>
        <button type="button" onClick={() => setTab("today")} className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-left">
          <div className="text-[11px] text-white/55">วันนี้</div>
          <div className="text-[18px] font-semibold text-white tabular-nums">฿{fmtShort(total?.actualDay ?? 0)}</div>
          <div className="text-[11px] text-white/50 tabular-nums truncate">
            เป้า {fmtShort(total?.targetDay ?? 0)}
            {todayPct != null ? ` · ${fmtPctShort(todayPct)}` : ""}
          </div>
        </button>
        <button type="button" onClick={() => setTab("wonder")} className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-left">
          <div className="text-[11px] text-white/55">7 Wonders</div>
          <div className="text-[18px] font-semibold text-white tabular-nums">{Math.round(sevenWondersScore)}%</div>
          <div className="text-[11px] text-white/50">คะแนนเฉลี่ย</div>
        </button>
      </div>

      {focusDevice || focusWonder ? (
        <div className="flex items-start gap-2 rounded-xl bg-sky-500/10 border border-sky-400/30 px-3 py-2 text-[12px] text-sky-100">
          <Target className="w-4 h-4 shrink-0 mt-0.5 text-sky-300" />
          <span>
            ควรโฟกัส:{" "}
            {focusDevice ? (
              <b>
                {focusDevice.label} ({fmtPctShort(focusDevice.rate)})
              </b>
            ) : null}
            {focusDevice && focusWonder ? " · " : ""}
            {focusWonder ? (
              <b>
                {focusWonder.label} ({fmtPctShort(focusWonder.rate)})
              </b>
            ) : null}
          </span>
        </div>
      ) : null}

      <Card className="!p-3">
        <Segmented<Tab>
          value={tab}
          onChange={(k) => {
            setTab(k);
            setOpen(null);
          }}
          options={[
            { key: "cat", label: "รายหมวด" },
            { key: "wonder", label: "7 Wonders" },
            { key: "today", label: "วันนี้" },
          ]}
        />

        {tab === "cat" ? (
          <ul className="mt-1 divide-y divide-white/10">
            {cats.map((r) => {
              const p = r.target > 0 ? r.achPercent : null;
              const isOpen = open === r.category;
              return (
                <li key={r.category} className="py-2.5">
                  <button type="button" className="w-full text-left flex items-center gap-2.5" onClick={() => setOpen(isOpen ? null : r.category)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-white">{r.category}</span>
                        <span className="text-white/70 tabular-nums">
                          <b className="text-white">{fmtShort(r.actual)}</b> / {fmtShort(r.target)}
                        </span>
                      </div>
                      <Bar
                        pct={p ?? 0}
                        tone={toneOf(p)}
                        mark={p != null && r.forecastPercent > 0 && p > 0 ? (p / r.forecastPercent) * 100 : null}
                      />
                    </div>
                    <Pill pct={p ?? undefined} />
                    <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen ? (
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                      <Mini label="จำนวน" value={`${r.units ?? 0} เครื่อง`} />
                      <Mini label="คาดจบเดือน" value={r.target > 0 ? fmtPctShort(r.forecastPercent) : fmtShort(r.forecast)} />
                      <Mini label="ต้องทำ/วัน" value={fmtShort(r.targetDay)} />
                      <Mini label="เดือนก่อน" value={fmtSigned(r.momPercent)} />
                      <Mini label="ปีก่อน" value={fmtSigned(r.yoyPercent)} />
                      <Mini label="วันนี้" value={fmtShort(r.actualDay)} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === "wonder" ? (
          <ul className="mt-1 divide-y divide-white/10">
            {wonders.map((r) => {
              const v = wonderScaled(r);
              const pct = isPctCalc(r.calcType);
              return (
                <li key={r.category} className="py-2.5 flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-white truncate">{r.category}</span>
                      <span className="text-white/70 tabular-nums text-[12px]">
                        {r.actualA != null && r.actualB != null ? `${Math.round(r.actualA)}/${Math.round(r.actualB)} · ` : ""}
                        {pct ? `${fmtPctShort(r.actual)} จากเป้า ${fmtPctShort(r.target)}` : `${fmtShort(r.actual)} / ${fmtShort(r.target)}`}
                      </span>
                    </div>
                    <Bar pct={v ?? 0} tone={toneOf(v)} />
                  </div>
                  <Pill pct={v ?? undefined} />
                </li>
              );
            })}
            {!wonders.length ? <li className="py-6 text-center text-[13px] text-white/50">ยังไม่มี KPI 7 Wonders</li> : null}
          </ul>
        ) : null}

        {tab === "today" ? (
          <>
            {todayDateLabel ? <div className="mt-2 text-[11px] text-white/50">ยอดของ {todayDateLabel}</div> : null}
            <ul className="mt-1 divide-y divide-white/10">
              {cats.map((r) => {
                const p = r.targetDay > 0 ? r.achDayPercent : null;
                return (
                  <li key={r.category} className="py-2.5 flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-white">{r.category}</span>
                        <span className="text-white/70 tabular-nums">
                          <b className="text-white">{fmtShort(r.actualDay)}</b>
                          {r.targetDay > 0 ? ` / ${fmtShort(r.targetDay)}` : ""}
                          {r.unitsDay ? ` · ${r.unitsDay} เครื่อง` : ""}
                        </span>
                      </div>
                      <Bar pct={p ?? 0} tone={toneOf(p)} />
                    </div>
                    <Pill pct={p ?? undefined} />
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </Card>

      <button
        type="button"
        onClick={() => setShowFull((v) => !v)}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-[13px] font-semibold text-white/80"
      >
        <Table2 className="w-4 h-4" />
        {showFull ? "ซ่อนหน้าเต็ม" : "ดูหน้าเต็ม (แบบบนคอม)"}
        <ChevronDown className={`w-4 h-4 transition-transform ${showFull ? "rotate-180" : ""}`} />
      </button>
      {showFull ? fullView : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5 min-w-0">
      <div className="text-white/45 truncate">{label}</div>
      <div className="font-semibold text-white tabular-nums truncate">{value}</div>
    </div>
  );
}
