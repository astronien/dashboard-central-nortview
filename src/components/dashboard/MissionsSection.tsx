import React from "react";
import { CheckCircle2, ListChecks } from "lucide-react";
import type { Mission } from "../../lib/missions";

const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

/** การ์ดภารกิจของพนักงาน 1 คน (ใช้ทั้งหน้า Home และหน้าพนักงานบนมือถือ) */
export function MissionCard({ m, avatar, onOpen }: { m: Mission; avatar?: string; onOpen?: () => void }) {
  const behind = m.paceGap != null && m.paceGap < 0;
  const todayHit = m.needPerDay > 0 && m.todayBaht >= m.needPerDay;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 min-w-0">
      <button type="button" onClick={onOpen} className="flex items-center gap-3 text-left min-w-0" disabled={!onOpen}>
        <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-[12px] font-semibold text-white/70">
          {avatar ? <img src={avatar} alt={m.name} className="w-full h-full object-cover object-top" /> : m.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-white truncate">{m.name}</div>
          <div className={`text-[12px] ${behind ? "text-rose-300" : "text-white/50"}`}>
            เดือนนี้ {m.monthPct == null ? "—" : `${Math.round(m.monthPct)}%`}
            {m.paceGap != null ? ` · ${behind ? "ช้ากว่าเป้า" : "นำเป้า"} ${Math.abs(Math.round(m.paceGap))}%` : ""}
          </div>
        </div>
      </button>

      {m.done ? (
        <div className="flex items-center gap-2 text-[13px] text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> ถึงเป้าครบแล้ว
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-black/20 px-3 py-2">
            <div className="text-[12px] text-white/50">
              ต้องได้วันนี้{m.tierPct ? ` (ไล่ ${m.tierPct}%)` : ""}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold text-white tabular-nums">
                {m.needPerDay > 0 ? fmtBaht(m.needPerDay) : "—"}
              </span>
              <span className={`text-[12px] tabular-nums ${todayHit ? "text-emerald-300" : "text-white/55"}`}>
                ได้แล้ว {fmtBaht(m.todayBaht)}
              </span>
            </div>
          </div>
          {m.tasks.length ? (
            <ul className="flex flex-col gap-1.5">
              {m.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-white/85">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                  <span className="min-w-0">{t.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

/** หน้า Home: ภารกิจวันนี้ของทุกคน — เรียงคนที่ช้ากว่าเป้ามากที่สุดก่อน */
export function MissionsSection({
  missions,
  avatarOf,
  onOpenStaff,
  dateLabel,
}: {
  missions: Mission[];
  avatarOf: (name: string, staffId?: string) => string | undefined;
  onOpenStaff?: (name: string) => void;
  dateLabel?: string;
}) {
  if (!missions.length) return null;
  const sorted = [...missions].sort((a, b) => (a.paceGap ?? 0) - (b.paceGap ?? 0));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold text-white">
          <ListChecks className="w-4 h-4 text-white/50" />
          ภารกิจวันนี้
        </h3>
        <p className="text-[12px] text-white/50">
          ยอดที่ต้องได้ต่อวันเพื่อไล่ให้ถึงเป้า 90% แล้วต่อ 105% · งานแนบที่ยังขาดของเดือนนี้
          {dateLabel ? ` · ข้อมูลถึง ${dateLabel}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map((m) => (
          <MissionCard
            key={m.name}
            m={m}
            avatar={avatarOf(m.name, m.staffId)}
            onOpen={onOpenStaff ? () => onOpenStaff(m.name) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
