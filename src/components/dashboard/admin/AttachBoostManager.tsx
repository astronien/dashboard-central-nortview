import React from "react";
import { Flame, Save, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ATTACH_BOOST_TYPES,
  BOOST_FACTOR_OPTIONS,
  EMPTY_ATTACH_BOOST,
  anyBoostOn,
  boostDescription,
  boostInRange,
  fetchAttachBoost,
  saveAttachBoost,
  type AttachBoost,
  type AttachBoostType,
} from "../../../lib/attachBoost";

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Admin: โหมดโฟกัส Attach — เลือก attach ที่ต้องการโฟกัสช่วงนี้ + ตัวคูณ (x1.5 / x2 …)
 */
export function AttachBoostManager({
  updatedBy,
  onChange,
}: {
  updatedBy?: string;
  onChange?: (b: AttachBoost) => void;
}) {
  const [boost, setBoost] = React.useState<AttachBoost>({ ...EMPTY_ATTACH_BOOST });
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    void fetchAttachBoost().then((b) => {
      setBoost(b);
      setLoaded(true);
    });
  }, []);

  /** ตั้งตัวคูณของแต่ละตัว (0.5 / 1 / 1.5 / 2 หรือกำหนดเอง) */
  const setFactor = (key: AttachBoostType, f: number) => {
    setBoost((prev) => {
      const v = Math.max(0, Math.min(5, Number.isFinite(f) ? f : 1));
      const next: AttachBoost = { ...prev, perType: { ...prev.perType, [key]: v }, [key]: v !== 1 };
      // เริ่มใช้ครั้งแรก → ตั้งวันเริ่มเป็นวันนี้ให้อัตโนมัติ
      if (!anyBoostOn(prev) && anyBoostOn(next) && !next.from) next.from = todayYmd();
      return next;
    });
    setMsg(null);
  };

  const setDate = (field: "from" | "to", v: string) => {
    setBoost((prev) => ({ ...prev, [field]: v }));
    setMsg(null);
  };

  const turnOffAll = () => {
    setBoost({ ...EMPTY_ATTACH_BOOST });
    setMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveAttachBoost(boost, updatedBy);
    setSaving(false);
    setMsg({
      ok: result.ok,
      text: result.ok
        ? "บันทึกแล้ว — ตาราง Attach รายวัน / โควตาสะสม / LINE bot คิดใหม่ทันที"
        : `บันทึกไม่สำเร็จ${result.error ? `: ${result.error}` : ""}`,
    });
    if (result.ok) onChange?.(boost);
  };

  const activeToday = boostInRange(boost, todayYmd());

  return (
    <div className="bg-white/10 rounded-2xl p-6 border border-white/10 ">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-orange-500/20 rounded-xl text-orange-300">
          <Flame className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            โหมดโฟกัส Attach (ตัวคูณรายตัว)
            {anyBoostOn(boost) ? (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  activeToday ? "bg-orange-500 text-white" : "bg-white/10 text-white/50"
                }`}
              >
                {activeToday ? "เปิดอยู่วันนี้" : "นอกช่วงวันที่"}
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-white/60 mt-1">
            {boostDescription(boost)} — มีผลเฉพาะบิลในช่วงวันที่ที่ตั้งไว้
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !loaded}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/20 border border-orange-400/40 text-orange-300 font-semibold hover:bg-orange-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {ATTACH_BOOST_TYPES.map((t) => {
          const f = boost.perType?.[t.key] ?? 1;
          const tone =
            f > 1
              ? "border-orange-400/60 bg-orange-500/15"
              : f < 1
                ? "border-sky-400/50 bg-sky-500/10"
                : "border-white/10 bg-black/20";
          return (
            <div key={t.key} className={`rounded-xl border px-3 py-3 transition-colors ${tone}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{t.label}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    f > 1 ? "bg-orange-500 text-white" : f < 1 ? "bg-sky-500 text-white" : "bg-white/10 text-white/50"
                  }`}
                >
                  x{f}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {BOOST_FACTOR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFactor(t.key, opt)}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-colors ${
                      f === opt ? "bg-white text-slate-900" : "bg-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  value={f}
                  onChange={(e) => setFactor(t.key, Number(e.target.value))}
                  title="กำหนดเอง"
                  className="w-14 bg-[#051710] border border-white/15 rounded-lg px-1.5 py-1 text-white text-xs text-center focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="mt-1.5 text-[11px] text-white/45">
                = {f} เครดิต · ครอบคลุม iPhone {Math.round(f * 4 * 10) / 10} เครื่อง
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">ตั้งแต่วันที่</span>
          <input
            type="date"
            value={boost.from}
            onChange={(e) => setDate("from", e.target.value)}
            className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">ถึงวันที่ (ว่าง = จนกว่าจะปิด)</span>
          <input
            type="date"
            value={boost.to}
            onChange={(e) => setDate("to", e.target.value)}
            className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-400"
          />
        </label>
        <button
          type="button"
          onClick={turnOffAll}
          className="text-xs text-white/40 underline hover:text-white/70 pb-2"
        >
          รีเซ็ตทุกตัวเป็น x1
        </button>
      </div>

      {msg ? (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </p>
      ) : null}
    </div>
  );
}
