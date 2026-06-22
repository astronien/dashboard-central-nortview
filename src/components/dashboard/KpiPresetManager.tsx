import { useState } from "react";
import { Download, Upload, RotateCcw, ChevronDown, ChevronUp, Plus, User, Home as HomeIcon } from "lucide-react";
import {
  addPreset,
  deletePreset,
  updatePreset,
  getDefaultPresets,
} from "../../lib/presetStorage";
import type { Preset } from "../../lib/presetTypes";
import type { RawRow } from "../../lib/salesAggregations";
import KpiPresetBuilder from "./KpiPresetBuilder";

interface KpiPresetManagerProps {
  allLines: RawRow[];
  presets: Preset[];
  onPresetsChange: (presets: Preset[]) => void;
  catDailyOptions?: string[];
}

const colorDotClass = (color: string) => {
  const map: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    purple: "bg-purple-500",
    coral: "bg-orange-500",
  };
  return map[color] || "bg-white/40";
};

export default function KpiPresetManager({
  allLines,
  presets,
  onPresetsChange,
  catDailyOptions,
}: KpiPresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  const handleSave = async (presetData: Omit<Preset, "id">) => {
    if (editingPreset) {
      await updatePreset(editingPreset.id, presetData);
    } else {
      await addPreset(presetData);
    }
    const { getPresets } = await import("../../lib/presetStorage");
    onPresetsChange(await getPresets());
    setShowBuilder(false);
    setEditingPreset(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("ต้องการลบ Preset นี้?")) {
      await deletePreset(id);
      const { getPresets } = await import("../../lib/presetStorage");
      onPresetsChange(await getPresets());
    }
  };

  const handleEdit = (preset: Preset) => {
    setEditingPreset(preset);
    setShowBuilder(true);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kpi-presets-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (!Array.isArray(imported)) {
            alert("ไฟล์ไม่ถูกต้อง");
            return;
          }
          const merged = [...presets];
          const { migratePreset, savePresets, getPresets } = await import(
            "../../lib/presetStorage"
          );
          imported.forEach((rawImp: any) => {
            const imp = migratePreset(rawImp);
            if (!imp.id)
              imp.id = Date.now().toString() + Math.random().toString(36).substring(7);
            const byId = merged.findIndex((p) => p.id === imp.id);
            const byName = merged.findIndex((p) => p.name === imp.name);
            if (byId !== -1) {
              merged[byId] = { ...imp };
            } else if (byName !== -1) {
              merged[byName] = { ...imp, id: merged[byName].id };
            } else {
              merged.push({ ...imp });
            }
          });
          await savePresets(merged);
          onPresetsChange(await getPresets());
          alert(`นำเข้า ${imported.length} Preset สำเร็จ`);
        } catch (err) {
          alert("ไม่สามารถอ่านไฟล์ได้: " + err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = async () => {
    if (
      confirm(
        "ยืนยันที่จะล้าง Preset ทั้งหมดและเริ่มใหม่ด้วยค่าเริ่มต้นหรือไม่? (Attach Smile / Attach Film / Attach Case)",
      )
    ) {
      const defaults = getDefaultPresets();
      const { savePresets, getPresets } = await import("../../lib/presetStorage");
      const next: Preset[] = [];
      for (const d of defaults) {
        next.push(await addPreset(d));
      }
      onPresetsChange(await getPresets());
      alert(`คืนค่าเดิมสำเร็จ (${next.length} presets)`);
    }
  };

  const handleToggleFlag = async (
    preset: Preset,
    flag: "showInStaffProfile" | "showInBranchOverview",
  ) => {
    await updatePreset(preset.id, { ...preset, [flag]: !preset[flag] });
    const { getPresets } = await import("../../lib/presetStorage");
    onPresetsChange(await getPresets());
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 rounded-t-2xl transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-bold text-white">⚙️ จัดการ KPI Preset ({presets.length})</h2>

        <div
          className="flex gap-2 overflow-x-auto px-2 py-1 max-w-[60%]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleImport}
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-[#0a1f17] px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            นำเข้า
          </button>
          <button
            onClick={handleExport}
            className="flex-shrink-0 bg-purple-500 hover:bg-purple-400 text-white px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            ส่งออก
          </button>
          <button
            onClick={handleReset}
            className="flex-shrink-0 bg-rose-500/80 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            คืนค่าเดิม
          </button>
        </div>

        <button className="text-emerald-400 font-bold ml-2 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          <button
            onClick={() => {
              setEditingPreset(null);
              setShowBuilder(!showBuilder);
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0a1f17] px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Preset
          </button>

          {showBuilder && (
            <KpiPresetBuilder
              allLines={allLines}
              catDailyOptions={catDailyOptions}
              onSave={handleSave}
              onCancel={() => {
                setShowBuilder(false);
                setEditingPreset(null);
              }}
              initialPreset={editingPreset || undefined}
            />
          )}

          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${colorDotClass(preset.color)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{preset.name}</p>
                    <p className="text-xs text-emerald-400 font-bold truncate">
                      {preset.labelA} → {preset.labelB || "(ไม่มี)"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    title={preset.showInStaffProfile ? "ซ่อนจาก Staff Profile" : "แสดงใน Staff Profile (7 Wonders)"}
                    onClick={() => handleToggleFlag(preset, "showInStaffProfile")}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      preset.showInStaffProfile
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title={preset.showInBranchOverview ? "ซ่อนจากหน้ารวมสาขา" : "แสดงในหน้ารวมสาขา"}
                    onClick={() => handleToggleFlag(preset, "showInBranchOverview")}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      preset.showInBranchOverview
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <HomeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(preset)}
                    className="px-3 py-1 text-sm bg-white/10 text-white/80 border border-white/10 rounded hover:bg-white/20 transition"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="px-3 py-1 text-sm bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded hover:bg-rose-500/30 transition"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="text-center text-white/50 text-sm py-8">
                ยังไม่มี Preset — กด "เพิ่ม Preset" หรือ "คืนค่าเดิม"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
