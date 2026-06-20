import { useMemo, useState } from "react";
import { Sparkles, Sliders } from "lucide-react";
import { parseBills, type BillSummary } from "../../lib/presetBills";
import { calcAllPresets, presetDisplayValue } from "../../lib/presetEngine";
import { buildCatDailyLookup, enrichSalesRowsWithCatDaily } from "../../lib/presetCatDaily";
import type { Preset, PresetResult } from "../../lib/presetTypes";
import type { RawRow } from "../../lib/salesAggregations";
import type { WonderItemConfig } from "../../lib/wonderConfig";
import { wonderToPreset } from "../../lib/wonderConfig";
import WonderConfigEditor from "../WonderConfigEditor";
import KpiDateFilterBar, { type KpiFilters } from "./KpiDateFilterBar";
import KpiPresetRow from "./KpiPresetRow";
import KpiResultsTable, { type KpiResultsMode } from "./KpiResultsTable";

interface WonderPresetSectionProps {
  salesRows: RawRow[];
  categoryMasterRows: RawRow[];
  selectedBranch: string;
  wonderConfigs: WonderItemConfig[];
  onWonderConfigsChange: (configs: WonderItemConfig[]) => void;
  uniqueCombos: { cat: string; sub: string; label: string }[];
  staffCategoryTree?: Map<string, Set<string>>;
  salesHeaders?: string[];
}

const toYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function WonderPresetSection({
  salesRows,
  categoryMasterRows,
  selectedBranch,
  wonderConfigs,
  onWonderConfigsChange,
  uniqueCombos,
  staffCategoryTree,
  salesHeaders,
}: WonderPresetSectionProps) {
  const [resultsMode, setResultsMode] = useState<KpiResultsMode>("officer");
  const [filters, setFilters] = useState<KpiFilters>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: toYYYYMMDD(firstDay),
      endDate: toYYYYMMDD(now),
      mode: "cumulative",
      brand: "",
    };
  });

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

  const allBills = useMemo(() => {
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

  const filteredBills = useMemo<BillSummary[]>(() => {
    if (allBills.length === 0) return [];
    const startStr = filters.startDate;
    const endStr = filters.endDate;
    const brand = filters.brand.trim();
    return allBills.filter((bill) => {
      const bd = bill.docDate;
      const billStr = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`;
      if (billStr < startStr || billStr > endStr) return false;
      if (brand) {
        const hasBrand = bill.lineItems.some(
          (li) => String((li as any).Brand ?? (li as any).brand ?? "") === brand,
        );
        if (!hasBrand) return false;
      }
      return true;
    });
  }, [allBills, filters.startDate, filters.endDate, filters.brand]);

  const billsForCalc = useMemo<BillSummary[]>(() => {
    if (filters.mode === "cumulative") return filteredBills;
    if (filteredBills.length === 0) return [];
    let maxDateStr = "";
    filteredBills.forEach((b) => {
      const bd = b.docDate;
      const s = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`;
      if (s > maxDateStr) maxDateStr = s;
    });
    const maxStr = maxDateStr;
    return filteredBills.filter((b) => {
      const bd = b.docDate;
      const s = `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`;
      return s === maxStr;
    });
  }, [filteredBills, filters.mode]);

  const wonderPresets = useMemo(() => {
    return wonderConfigs.map((w) => wonderToPreset(w));
  }, [wonderConfigs]);

  const activePresetIds = useMemo(() => {
    return wonderPresets.map((p) => p.id);
  }, [wonderPresets]);

  const results: PresetResult[] = useMemo(() => {
    if (wonderPresets.length === 0 || billsForCalc.length === 0) return [];
    return calcAllPresets(billsForCalc, wonderPresets);
  }, [billsForCalc, wonderPresets]);

  const salesEmpty = salesRows.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
            7 Wonders KPI
          </h2>
          <p className="text-xs text-white/60 mt-1">
            กำหนด 7 Wonders พร้อม Attach Rate, ยอดบาท, จำนวน พร้อมตัวกรองวันที่
          </p>
        </div>
      </div>

      <WonderConfigEditor
        configs={wonderConfigs}
        onChange={onWonderConfigsChange}
        uniqueCombos={uniqueCombos}
        staffCategoryTree={staffCategoryTree}
        salesHeaders={salesHeaders}
      />

      {salesEmpty && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/60 text-sm">
          กรุณาอัปโหลดไฟล์ Current Sales ก่อน
        </div>
      )}

      {!salesEmpty && (
        <KpiDateFilterBar
          filters={filters}
          setFilters={setFilters}
          allBills={allBills}
          filteredCount={filteredBills.length}
          presets={wonderPresets}
          activePresetIds={activePresetIds}
          onTogglePreset={() => {}}
          onSelectAllPresets={() => {}}
          onDeselectAllPresets={() => {}}
          onReorderPresets={() => {}}
        />
      )}

      {!salesEmpty && results.length > 0 && (
        <KpiPresetRow results={results} />
      )}

      {!salesEmpty && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">ตารางผลลัพธ์</h3>
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setResultsMode("branch")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  resultsMode === "branch"
                    ? "bg-white/15 text-white shadow"
                    : "text-emerald-300/80 hover:text-white"
                }`}
              >
                รายสาขา
              </button>
              <button
                onClick={() => setResultsMode("officer")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  resultsMode === "officer"
                    ? "bg-white/15 text-white shadow"
                    : "text-emerald-300/80 hover:text-white"
                }`}
              >
                รายพนักงาน
              </button>
            </div>
          </div>
          <KpiResultsTable
            mode={resultsMode}
            filteredBills={billsForCalc}
            activePresets={wonderPresets}
          />
        </div>
      )}
    </div>
  );
}
