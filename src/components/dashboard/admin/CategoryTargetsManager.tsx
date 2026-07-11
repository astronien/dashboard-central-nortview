import React from "react";
import { Target, Save, Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../../lib/auth/authContext";

/**
 * Manage per-branch custom targets for quantity categories
 * (AC+, COVER+, SIM) that don't have dedicated columns in the
 * target Excel. Settings page, admin only.
 */
const QUANTITY_CATEGORIES = [
  { key: "AC+", label: "AC+", desc: "Apple Care+ — จำนวนเครื่องที่ขาย Apple Care+" },
  { key: "COVER+", label: "COVER+", desc: "COVER+ — จำนวนเครื่องที่ขายประกัน COVER+" },
  { key: "SIM", label: "SIM", desc: "SIM — จำนวน SIM ที่ขาย" },
  { key: "Trade In", label: "Trade In", desc: "Trade In — จำนวนเครื่องที่ลูกค้าตกลงเทรด" },
];

export function CategoryTargetsManager({ selectedBranch, onChanged }: { selectedBranch: string; onChanged?: () => void }) {
  const { user } = useAuth();
  const [overrides, setOverrides] = React.useState<Record<string, { target: number; updated_at: string; updated_by: string | null }>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/category-target-overrides?branch=${encodeURIComponent(selectedBranch)}`);
      const data = await res.json();
      if (res.ok) {
        setOverrides(data.overrides ?? {});
      } else {
        setError(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  React.useEffect(() => {
    load();
    setDraft({});
    setSuccess(null);
  }, [load]);

  const handleSave = async (category: string) => {
    const raw = draft[category];
    if (raw === undefined) return;
    const value = Number(String(raw).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(value) || value < 0) {
      setError(`Target ของ ${category} ต้องเป็นตัวเลข ≥ 0`);
      return;
    }
    setSaving(category);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/category-target-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranch,
          category,
          target: value,
          updatedBy: user?.name ?? user?.username ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`บันทึก target ${category} = ${value.toLocaleString()} แล้ว`);
        setDraft((d) => ({ ...d, [category]: "" }));
        await load();
        onChanged?.();
      } else {
        setError(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (category: string) => {
    if (!confirm(`ลบ override ของ ${category}? จะกลับไปใช้ค่าจาก target Excel`)) return;
    setDeleting(category);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/category-target-overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedBranch, category }),
      });
      if (res.ok) {
        setSuccess(`ลบ override ของ ${category} แล้ว`);
        await load();
        onChanged?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">ตั้งเป้าหมาย Category (ต่อชิ้น)</h2>
            <p className="text-sm text-white/60 mt-1">
              กำหนด target เองสำหรับหมวด AC+ / COVER+ / SIM / Trade In ที่ target Excel ไม่มี column เฉพาะ —
              ค่าที่ตั้งจะ override ค่า default ในหน้า Category KPI Snapshot
              {selectedBranch ? <span className="text-emerald-300"> · สาขา: {selectedBranch}</span> : null}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-40"
          title="รีเฟรช"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {QUANTITY_CATEGORIES.map(({ key, label, desc }) => {
          const ov = overrides[key];
          const currentValue = draft[key] !== undefined ? draft[key] : (ov ? String(ov.target) : "");
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-white">{label}</span>
                {ov ? (
                  <span className="text-[10px] text-emerald-300/80">
                    override · {new Date(ov.updated_at).toLocaleDateString("th-TH")}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/40">ใช้ค่าจาก Excel</span>
                )}
              </div>
              <p className="text-[11px] text-white/50 leading-snug">{desc}</p>
              {ov ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/60">ปัจจุบัน:</span>
                  <span className="font-bold text-emerald-300 tabular-nums">{ov.target.toLocaleString()}</span>
                  <span className="text-white/40 text-xs">ชิ้น</span>
                </div>
              ) : null}
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={currentValue}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  placeholder={ov ? "แก้ไข" : "ตั้งค่าใหม่"}
                  className="flex-1 min-w-0 bg-[#051710] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                />
                <button
                  type="button"
                  onClick={() => handleSave(key)}
                  disabled={saving !== null || currentValue === ""}
                  className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/20 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  {saving === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  บันทึก
                </button>
                {ov ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(key)}
                    disabled={deleting !== null}
                    className="px-2 py-2 rounded-lg bg-white/5 hover:bg-red-500/15 text-white/50 hover:text-red-300 text-sm transition-colors disabled:opacity-40"
                    title="ลบ override"
                  >
                    {deleting === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
        หมายเหตุ: Target ที่ตั้งที่นี่จะ override ค่า default จาก target Excel เฉพาะสาขาที่เลือก
        ถ้าลบ override ออก ระบบจะกลับไปใช้ค่า default (ปัจจุบันคือ Total ของ target Excel)
        ระบบจะรีเฟรชหน้า Category KPI Snapshot อัตโนมัติเมื่อบันทึกเสร็จ
      </p>
    </div>
  );
}
