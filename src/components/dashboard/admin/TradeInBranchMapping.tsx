import React from "react";
import { MapPin, Save, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  getTradeBranchMapping,
  removeTradeBranchMapping,
  setTradeBranchMapping,
} from "../../../lib/tradeInBranchStorage";

export function TradeInBranchMapping({
  selectedBranch,
  mapping: mappingProp,
  onChange,
}: {
  selectedBranch: string;
  mapping?: Record<string, string>;
  onChange?: (mapping: Record<string, string>) => void;
}) {
  const [internalMapping, setInternalMapping] = React.useState<
    Record<string, string>
  >({});
  const mapping = mappingProp ?? internalMapping;
  const setMapping = onChange ?? setInternalMapping;

  const [draft, setDraft] = React.useState("");
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mappingProp) {
      setInternalMapping(getTradeBranchMapping());
    }
    setDraft("");
    setSuccess(null);
    setError(null);
  }, [selectedBranch, mappingProp]);

  const currentId = mapping[selectedBranch] ?? "";

  const handleSave = () => {
    const value = draft.trim();
    if (!/^\d+$/.test(value)) {
      setError("รหัสสาขาต้องเป็นตัวเลขเท่านั้น");
      setSuccess(null);
      return;
    }
    const next = setTradeBranchMapping(selectedBranch, value);
    setMapping(next);
    setDraft("");
    setSuccess(`บันทึกรหัสสาขา Trade In ${value} สำหรับ ${selectedBranch} แล้ว`);
    setError(null);
  };

  const handleDelete = () => {
    const next = removeTradeBranchMapping(selectedBranch);
    setMapping(next);
    setSuccess(`ลบ mapping ของ ${selectedBranch} แล้ว`);
    setError(null);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              รหัสสาขา Trade In
            </h2>
            <p className="text-sm text-white/60 mt-1">
              ถ้ารหัสสาขาใน target Excel ไม่ตรงกับ Trade API ให้ใส่{" "}
              <code className="text-emerald-300">real_branch_id</code> ของสาขานี้
              เช่น 3015 — ระบบจะใช้ค่านี้แทนการดึงอัตโนมัติ
              {selectedBranch ? (
                <span className="text-emerald-300"> · สาขา: {selectedBranch}</span>
              ) : null}
            </p>
          </div>
        </div>
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

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          {currentId ? (
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-white/60">รหัสสาขาที่ใช้งาน:</span>
              <span className="font-bold text-emerald-300 tabular-nums">
                {currentId}
              </span>
            </div>
          ) : null}
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            placeholder={currentId ? "แก้ไขรหัสสาขา" : "เช่น 3015"}
            className="w-full bg-[#051710] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft}
            className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/20 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            บันทึก
          </button>
          {currentId ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/15 text-white/50 hover:text-red-300 text-sm transition-colors inline-flex items-center gap-1"
              title="ลบ mapping"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
        หมายเหตุ: ถ้าไม่ได้ตั้งค่าที่นี่ ระบบจะพยายามดึงรหัสสาขาอัตโนมัติจาก
        emp_shop_code / branchId / Branch ID / BRANCH CODE ใน target Excel
        หรือใช้ชื่อสาขาถ้าเป็นตัวเลข
      </p>
    </div>
  );
}
