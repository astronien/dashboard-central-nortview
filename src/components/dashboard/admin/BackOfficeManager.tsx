import React from "react";
import { Users2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchBackOfficeCounts, saveBackOfficeCounts } from "../../../lib/staffPhotosApi";
import {
  BACK_OFFICE_POSITIONS,
  BACK_OFFICE_RATES,
  EMPTY_BACK_OFFICE_COUNTS,
} from "../../../lib/commissionScheme";

const LABEL: Record<string, string> = {
  BSM: "BSM",
  ABM: "ABM",
  TRAINER: "Trainer",
  PRESENTER: "Presenter",
  PIS: "PIS",
  CASHIER: "Cashier",
};

/**
 * Admin: กรอกจำนวนพนักงานหลังบ้านต่อตำแหน่ง — ใช้หักส่วนแบ่งจากก้อนค่าคอม
 * ก่อนแบ่งที่เหลือให้เซล (หน้า Commission)
 */
export function BackOfficeManager({
  updatedBy,
  onChange,
}: {
  updatedBy?: string;
  onChange?: (counts: Record<string, number>) => void;
}) {
  const [counts, setCounts] = React.useState<Record<string, number>>(EMPTY_BACK_OFFICE_COUNTS);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    void fetchBackOfficeCounts().then((c) =>
      setCounts({ ...EMPTY_BACK_OFFICE_COUNTS, ...c }),
    );
  }, []);

  const setOne = (pos: string, v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    setCounts((prev) => ({ ...prev, [pos]: n }));
    setMsg(null);
  };

  const totalPct = BACK_OFFICE_POSITIONS.reduce(
    (s, p) => s + (BACK_OFFICE_RATES[p] ?? 0) * (counts[p] ?? 0),
    0,
  );

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveBackOfficeCounts(counts, updatedBy);
    setSaving(false);
    setMsg({
      ok,
      text: ok ? "บันทึกแล้ว — หน้า Commission จะคิดส่วนแบ่งใหม่" : "บันทึกไม่สำเร็จ",
    });
    if (ok) onChange?.(counts);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-300">
          <Users2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">พนักงานหลังบ้าน (ส่วนแบ่งค่าคอม)</h2>
          <p className="text-sm text-white/60 mt-1">
            กรอกจำนวนคนแต่ละตำแหน่ง — ระบบจะหักส่วนนี้จากก้อนค่าคอมก่อน แล้วที่เหลือแบ่งให้เซล
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {BACK_OFFICE_POSITIONS.map((pos) => (
          <div key={pos} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold text-white">{LABEL[pos] ?? pos}</div>
            <div className="text-[10px] text-white/40 mb-2">
              {(BACK_OFFICE_RATES[pos] ?? 0).toFixed(2)}% ต่อคน
            </div>
            <input
              type="number"
              min={0}
              step={1}
              value={counts[pos] ?? 0}
              onChange={(e) => setOne(pos, e.target.value)}
              className="w-full bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-white/50">
          รวมหลังบ้าน:{" "}
          <span className={`font-extrabold ${totalPct > 100 ? "text-rose-300" : "text-amber-300"}`}>
            {totalPct.toFixed(2)}%
          </span>
        </span>
        <span className="text-white/50">
          เหลือให้เซล:{" "}
          <span className="font-extrabold text-emerald-300">
            {Math.max(0, 100 - totalPct).toFixed(2)}%
          </span>
        </span>
        {totalPct > 100 ? (
          <span className="text-rose-300 text-xs">
            เกิน 100% — ระบบจะลดตามสัดส่วนไม่ให้ก้อนเซลติดลบ
          </span>
        ) : null}
      </div>

      {msg ? (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </p>
      ) : null}
    </div>
  );
}
