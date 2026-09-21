import React from "react";
import { Users, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchHiddenStaffIds, saveHiddenStaffIds } from "../../../lib/staffPhotosApi";

type RosterEntry = { staffId: string; officerKey: string; name: string; branch: string };

/**
 * Admin: choose which staff appear on the Staff Profile page. Useful when the
 * roster includes non-sales roles (BSM, support) that shouldn't be reviewed
 * as sales staff. Hidden STAFF IDs are stored server-side (Turso app_config).
 */
export function StaffVisibilityManager({
  staffRoster,
  updatedBy,
  onChange,
}: {
  staffRoster: RosterEntry[];
  updatedBy?: string;
  onChange?: (hidden: string[]) => void;
}) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    void fetchHiddenStaffIds().then((list) => {
      setHidden(new Set(list.map(String)));
      setLoaded(true);
    });
  }, []);

  const toggle = (staffId: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
    setMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const list = Array.from(hidden);
    const ok = await saveHiddenStaffIds(list, updatedBy);
    setSaving(false);
    setMsg({ ok, text: ok ? "บันทึกแล้ว — หน้า Staff Profile จะแสดงเฉพาะคนที่เลือก" : "บันทึกไม่สำเร็จ" });
    if (ok) onChange?.(list);
  };

  if (!staffRoster.length) return null;

  const shownCount = staffRoster.length - staffRoster.filter((s) => hidden.has(s.staffId)).length;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
          <Users className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">แสดงพนักงานในหน้า Staff Profile</h2>
          <p className="text-sm text-white/60 mt-1">
            ติ๊กออกเพื่อซ่อนคนที่ไม่ใช่ฝ่ายขาย (เช่น ผู้จัดการ/ซัพพอร์ต) — แสดงอยู่ {shownCount}/{staffRoster.length} คน
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !loaded}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {staffRoster.map((entry) => {
          const isHidden = hidden.has(entry.staffId);
          return (
            <button
              key={entry.staffId}
              type="button"
              onClick={() => toggle(entry.staffId)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isHidden
                  ? "border-white/10 bg-black/20 text-white/40"
                  : "border-emerald-400/30 bg-emerald-500/10 text-white"
              }`}
            >
              {isHidden ? (
                <EyeOff className="w-4 h-4 shrink-0 text-white/30" />
              ) : (
                <Eye className="w-4 h-4 shrink-0 text-emerald-300" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{entry.name}</div>
                <div className="text-[10px] text-white/40 truncate">ID {entry.staffId}</div>
              </div>
              <span className={`text-[10px] font-bold ${isHidden ? "text-white/30" : "text-emerald-300"}`}>
                {isHidden ? "ซ่อน" : "แสดง"}
              </span>
            </button>
          );
        })}
      </div>

      {msg ? (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </p>
      ) : null}
    </div>
  );
}
