import { useMemo, useState } from "react";
import { Sparkles, Sliders } from "lucide-react";
import { parseBills } from "../../lib/presetBills";
import { calcAllPresets } from "../../lib/presetEngine";
import { buildCatDailyLookup, enrichSalesRowsWithCatDaily } from "../../lib/presetCatDaily";
import type { Preset, PresetResult } from "../../lib/presetTypes";
import type { RawRow } from "../../lib/salesAggregations";
import KpiPresetManager from "./KpiPresetManager";
import KpiPresetRow from "./KpiPresetRow";
import KpiPresetTogglePills from "./KpiPresetTogglePills";

interface KpiPresetSectionProps {
  salesRows: RawRow[];
  categoryMasterRows: RawRow[];
  selectedBranch: string;
  presets: Preset[];
  onPresetsChange: (presets: Preset[]) => void;
}

export default function KpiPresetSection({
  salesRows,
  categoryMasterRows,
  selectedBranch,
  presets,
  onPresetsChange,
}: KpiPresetSectionProps) {
  const [activePresetIds, setActivePresetIds] = useState<string[]>([]);

  const catDailyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of categoryMasterRows) {
      const v = String(r["CAT Daily"] ?? "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort();
  }, [categoryMasterRows]);

  const enrichedRows = useMemo(() => {
    if (salesRows.length === 0) return [] as RawRow[];
    const lookup = buildCatDailyLookup(categoryMasterRows);
    return enrichSalesRowsWithCatDaily(salesRows, lookup);
  }, [salesRows, categoryMasterRows]);

  const bills = useMemo(() => {
    if (enrichedRows.length === 0) return [];
    let rows = enrichedRows;
    if (selectedBranch && selectedBranch !== "All Branches") {
      const target = String(selectedBranch).toLowerCase().trim();
      rows = rows.filter((r) => {
        const branch = String(
          r["Branch (Name)"] ?? r["BRANCH NAME"] ?? r["branch_name"] ?? "",
        )
          .toLowerCase()
          .trim();
        return !branch || branch.includes(target) || target.includes(branch);
      });
    }
    return parseBills(rows);
  }, [enrichedRows, selectedBranch]);

  const results: PresetResult[] = useMemo(() => {
    if (activePresetIds.length === 0 || bills.length === 0) return [];
    const active = presets.filter((p) => activePresetIds.includes(p.id));
    return calcAllPresets(bills, active);
  }, [bills, presets, activePresetIds]);

  const handleToggle = (id: string) => {
    setActivePresetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const salesEmpty = salesRows.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
            KPI Preset
          </h2>
          <p className="text-xs text-white/60 mt-1">
            สร้าง/จัดการ Preset เพื่อคำนวณ Attach Rate, ยอดบาท, จำนวน และ CatMaster แบบกำหนดเอง
          </p>
        </div>
      </div>

      {salesEmpty && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/60 text-sm">
          กรุณาอัปโหลดไฟล์ Current Sales ก่อน เพื่อให้ Preset สามารถคำนวณผลได้
        </div>
      )}

      <KpiPresetManager
        allLines={enrichedRows}
        presets={presets}
        onPresetsChange={onPresetsChange}
        catDailyOptions={catDailyOptions}
      />

      {!salesEmpty && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">ผลลัพธ์ Preset ที่เลือก</h3>
          </div>
          <KpiPresetTogglePills
            presets={presets}
            activePresetIds={activePresetIds}
            onToggle={handleToggle}
          />
          {results.length > 0 ? (
            <KpiPresetRow results={results} />
          ) : (
            <div className="text-center text-white/50 text-sm py-6">
              เลือก Preset ด้านบนเพื่อดูผลลัพธ์
            </div>
          )}
        </div>
      )}
    </div>
  );
}
