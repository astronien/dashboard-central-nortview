import React from "react";
import { TrendingUp, Save, CheckCircle2, AlertCircle } from "lucide-react";
import {
  EMPTY_TARGET_UPLIFT,
  UPLIFT_CATEGORIES,
  fetchTargetUplift,
  pctFor,
  saveTargetUplift,
  type TargetUplift,
  type UpliftCategory,
} from "../../../lib/targetUplift";

/**
 * Admin: ปรับเป้าเพิ่มเป็น % จากเป้าจริง (Stretch Target) — เปิด/ปิดได้
 * มีผลกับทุกตาราง/หน้าที่ใช้เป้าจากไฟล์ Target
 */
export function TargetUpliftManager({
  updatedBy,
  onChange,
}: {
  updatedBy?: string;
  onChange?: (cfg: TargetUplift) => void;
}) {
  const [cfg, setCfg] = React.useState<TargetUplift>({ ...EMPTY_TARGET_UPLIFT });
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    void fetchTargetUplift().then((c) => {
      setCfg(c);
      setLoaded(true);
    });
  }, []);

  const update = (patch: Partial<TargetUplift>) => {
    setCfg((prev) => ({ ...prev, ...patch }));
    setMsg(null);
  };
  const setCat = (cat: UpliftCategory, v: string) => {
    setCfg((prev) => {
      const perCat = { ...prev.perCat };
      if (v.trim() === "") delete perCat[cat];
      else perCat[cat] = Number(v);
      return { ...prev, perCat };
    });
    setMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveTargetUplift(cfg, updatedBy);
    setSaving(false);
    setMsg({
      ok: result.ok,
      text: result.ok
        ? cfg.enabled
          ? "บันทึกแล้ว — ทุกหน้าใช้เป้าที่ปรับเพิ่ม"
          : "บันทึกแล้ว — ปิดการปรับเป้า (ใช้เป้าจริง)"
        : `บันทึกไม่สำเร็จ${result.error ? `: ${result.error}` : ""}`,
    });
    if (result.ok) onChange?.(cfg);
  };

  const example = 1_000_000;
  const examplePct = pctFor(cfg, "iPhone");

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-sky-500/20 rounded-xl text-sky-300">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">ปรับเป้าเพิ่ม (Stretch Target)</h2>
          <p className="text-sm text-white/60 mt-1">
            เพิ่มเป้าเป็น % จากเป้าจริงในไฟล์ Target — มีผลทุกหน้า (Home, Staff Profile, Commission ฯลฯ) · ปิดเมื่อไหร่ก็กลับเป็นเป้าจริง
          </p>
        </div>
        {/* สวิตช์เปิด/ปิด */}
        <button
          type="button"
          onClick={() => update({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            cfg.enabled ? "bg-sky-500" : "bg-white/20"
          }`}
          title={cfg.enabled ? "กำลังเปิด — กดเพื่อปิด" : "กำลังปิด — กดเพื่อเปิด"}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              cfg.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !loaded}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-semibold hover:bg-sky-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      <div className={`${cfg.enabled ? "" : "opacity-50 pointer-events-none"} transition-opacity`}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/50">เพิ่มทุกหมวด</span>
            <div className="relative">
              <input
                type="number"
                step={0.5}
                value={cfg.pct}
                onChange={(e) => update({ pct: Number(e.target.value) || 0 })}
                className="w-28 bg-[#051710] border border-white/15 rounded-lg pl-3 pr-7 py-2 text-white text-lg font-bold focus:outline-none focus:border-sky-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">%</span>
            </div>
          </label>
          <p className="text-[11px] text-white/45 pb-2">
            ตัวอย่าง: เป้า iPhone 1,000,000 → {Math.round(example * (1 + examplePct / 100)).toLocaleString()} (
            {examplePct >= 0 ? "+" : ""}
            {examplePct}%)
          </p>
        </div>

        <div className="mt-4">
          <div className="text-[11px] text-white/50 mb-2">ตั้งแยกรายหมวด (เว้นว่าง = ใช้ % ด้านบน)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {UPLIFT_CATEGORIES.map((cat) => {
              const v = cfg.perCat[cat];
              return (
                <label key={cat} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[11px] font-semibold text-white/80 mb-1">{cat}</div>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.5}
                      placeholder={`${cfg.pct}`}
                      value={typeof v === "number" ? v : ""}
                      onChange={(e) => setCat(cat, e.target.value)}
                      className="w-full bg-[#051710] border border-white/15 rounded-lg pl-2 pr-6 py-1 text-white text-sm focus:outline-none focus:border-sky-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">%</span>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-[10px] text-white/40 mt-2">
            เป้ารวม (Total) = เป้าเดิม + ส่วนที่เพิ่มของแต่ละหมวด · SIM เป็นจำนวนชิ้น ไม่บวกเข้าเป้ารวม
          </p>
        </div>
      </div>

      {msg ? (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </p>
      ) : null}
    </div>
  );
}
