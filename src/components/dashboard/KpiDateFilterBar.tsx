import { useMemo, useState, type DragEvent } from "react";
import type { BillSummary } from "../../lib/presetBills";
import type { Preset } from "../../lib/presetTypes";

export type KpiFilterMode = "cumulative" | "daily";

export interface KpiFilters {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  mode: KpiFilterMode;
  brand: string;
}

interface KpiDateFilterBarProps {
  filters: KpiFilters;
  setFilters: (filters: KpiFilters) => void;
  allBills: BillSummary[];
  filteredCount: number;
  presets: Preset[];
  activePresetIds: string[];
  onTogglePreset: (presetId: string) => void;
  onSelectAllPresets: () => void;
  onDeselectAllPresets: () => void;
  onReorderPresets?: (newPresets: Preset[]) => void;
}

const THAI_MONTHS = [
  "",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const toYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};

const inputClass =
  "text-sm border border-white/10 bg-white/5 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none";

const labelClass = "text-sm text-emerald-400 font-bold";

const colorMap: Record<string, { active: string; inactive: string }> = {
  green: {
    active: "bg-emerald-500 text-white border-emerald-400 shadow-sm",
    inactive: "bg-emerald-500/10 text-emerald-300 border-white/10",
  },
  amber: {
    active: "bg-amber-500 text-white border-amber-400 shadow-sm",
    inactive: "bg-amber-500/10 text-amber-300 border-white/10",
  },
  blue: {
    active: "bg-blue-500 text-white border-blue-400 shadow-sm",
    inactive: "bg-blue-500/10 text-blue-300 border-white/10",
  },
  teal: {
    active: "bg-teal-500 text-white border-teal-400 shadow-sm",
    inactive: "bg-teal-500/10 text-teal-300 border-white/10",
  },
  purple: {
    active: "bg-purple-500 text-white border-purple-400 shadow-sm",
    inactive: "bg-purple-500/10 text-purple-300 border-white/10",
  },
  coral: {
    active: "bg-orange-500 text-white border-orange-400 shadow-sm",
    inactive: "bg-orange-500/10 text-orange-300 border-white/10",
  },
};

export default function KpiDateFilterBar({
  filters,
  setFilters,
  allBills,
  filteredCount,
  presets,
  activePresetIds,
  onTogglePreset,
  onSelectAllPresets,
  onDeselectAllPresets,
  onReorderPresets,
}: KpiDateFilterBarProps) {
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedPresetId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedPresetId || draggedPresetId === id || !onReorderPresets) return;
    const newPresets = [...presets];
    const draggedIdx = newPresets.findIndex((p) => p.id === draggedPresetId);
    const targetIdx = newPresets.findIndex((p) => p.id === id);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const [draggedItem] = newPresets.splice(draggedIdx, 1);
    newPresets.splice(targetIdx, 0, draggedItem);
    onReorderPresets(newPresets);
  };

  const brands = useMemo(() => {
    const set = new Set<string>();
    allBills.forEach((bill) => {
      bill.lineItems.forEach((li) => {
        const brand = String((li as any).Brand ?? (li as any).brand ?? "").trim();
        if (brand) set.add(brand);
      });
    });
    return ["ทั้งหมด", ...Array.from(set).sort()];
  }, [allBills]);

  const months = useMemo(() => {
    const set = new Set<string>();
    allBills.forEach((bill) => {
      const d = bill.docDate;
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return ["ทั้งหมด", ...Array.from(set).sort()];
  }, [allBills]);

  const quarters = useMemo(() => {
    const set = new Set<string>();
    allBills.forEach((bill) => {
      const year = bill.docDate.getFullYear();
      const month = bill.docDate.getMonth() + 1;
      set.add(`${year}-Q${Math.ceil(month / 3)}`);
    });
    return ["ทั้งหมด", ...Array.from(set).sort()];
  }, [allBills]);

  const formatMonthLabel = (monthKey: string) => {
    if (monthKey === "ทั้งหมด") return "ทั้งหมด";
    const [y, m] = monthKey.split("-");
    const thaiYear = Number(y) + 543;
    return `${THAI_MONTHS[Number(m)]} ${thaiYear}`;
  };

  const formatQuarterLabel = (quarterKey: string) => {
    if (quarterKey === "ทั้งหมด") return "ทั้งหมด";
    const [y, q] = quarterKey.split("-Q");
    const thaiYear = Number(y) + 543;
    return `${q} ${thaiYear}`;
  };

  const handleMonthChange = (monthKey: string) => {
    if (monthKey === "ทั้งหมด") {
      const minDate = allBills.reduce(
        (min, b) => (b.docDate < min ? b.docDate : min),
        allBills[0]?.docDate ?? new Date(),
      );
      const maxDate = allBills.reduce(
        (max, b) => (b.docDate > max ? b.docDate : max),
        allBills[0]?.docDate ?? new Date(),
      );
      setFilters({
        ...filters,
        startDate: toYYYYMMDD(minDate),
        endDate: toYYYYMMDD(maxDate),
      });
    } else {
      const [year, month] = monthKey.split("-");
      const firstDay = new Date(Number(year), Number(month) - 1, 1);
      const lastDay = new Date(Number(year), Number(month), 0);
      setFilters({
        ...filters,
        startDate: toYYYYMMDD(firstDay),
        endDate: toYYYYMMDD(lastDay),
      });
    }
  };

  const handleQuarterChange = (quarterKey: string) => {
    if (quarterKey === "ทั้งหมด") {
      const minDate = allBills.reduce(
        (min, b) => (b.docDate < min ? b.docDate : min),
        allBills[0]?.docDate ?? new Date(),
      );
      const maxDate = allBills.reduce(
        (max, b) => (b.docDate > max ? b.docDate : max),
        allBills[0]?.docDate ?? new Date(),
      );
      setFilters({
        ...filters,
        startDate: toYYYYMMDD(minDate),
        endDate: toYYYYMMDD(maxDate),
      });
    } else {
      const [year, q] = quarterKey.split("-Q");
      const firstMonth = (Number(q) - 1) * 3;
      const firstDay = new Date(Number(year), firstMonth, 1);
      const lastDay = new Date(Number(year), firstMonth + 3, 0);
      setFilters({
        ...filters,
        startDate: toYYYYMMDD(firstDay),
        endDate: toYYYYMMDD(lastDay),
      });
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className={labelClass}>ตั้งแต่</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className={labelClass}>ถึง</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="h-8 border-r border-white/10" />

        <select
          onChange={(e) => handleMonthChange(e.target.value)}
          className={inputClass}
        >
          {months.map((m) => (
            <option key={m} value={m} className="bg-[#1b3a2c]">
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>

        <select
          onChange={(e) => handleQuarterChange(e.target.value)}
          className={inputClass}
        >
          {quarters.map((q) => (
            <option key={q} value={q} className="bg-[#1b3a2c]">
              {formatQuarterLabel(q)}
            </option>
          ))}
        </select>

        <div className="h-8 border-r border-white/10" />

        <select
          value={filters.brand || "ทั้งหมด"}
          onChange={(e) =>
            setFilters({ ...filters, brand: e.target.value === "ทั้งหมด" ? "" : e.target.value })
          }
          className={inputClass}
        >
          {brands.map((b) => (
            <option key={b} value={b} className="bg-[#1b3a2c]">
              {b}
            </option>
          ))}
        </select>

        <div className="h-8 border-r border-white/10" />

        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setFilters({ ...filters, mode: "cumulative" })}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              filters.mode === "cumulative"
                ? "bg-white/15 text-white shadow"
                : "text-emerald-300/80 hover:text-white"
            }`}
          >
            สะสม
          </button>
          <button
            onClick={() => setFilters({ ...filters, mode: "daily" })}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              filters.mode === "daily"
                ? "bg-white/15 text-white shadow"
                : "text-emerald-300/80 hover:text-white"
            }`}
          >
            รายวัน
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-emerald-300 font-bold">
        แสดงข้อมูล{" "}
        <span className="font-semibold text-white">
          {formatDisplayDate(filters.startDate)}
        </span>{" "}
        –{" "}
        <span className="font-semibold text-white">
          {formatDisplayDate(filters.endDate)}
        </span>{" "}
        ·{" "}
        <span className="font-semibold text-amber-300">{filteredCount}</span> บิล ·{" "}
        <span className="font-semibold text-white">
          {filters.mode === "cumulative" ? "สะสม" : "รายวัน"}
        </span>
        {filters.brand && (
          <>
            {" "}
            · Brand:{" "}
            <span className="font-semibold text-purple-300">{filters.brand}</span>
          </>
        )}
      </div>

      {/* Preset Toggle Pills */}
      {presets.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-1 pr-3 border-r border-white/10">
              <button
                onClick={onSelectAllPresets}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                title="เลือก KPI ทั้งหมด"
              >
                ✅ เลือกทั้งหมด
              </button>
              <button
                onClick={onDeselectAllPresets}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 transition-colors"
                title="ยกเลิก KPI ทั้งหมด"
              >
                ❌ ยกเลิกทั้งหมด
              </button>
            </div>
            {presets.map((preset) => {
              const isActive = activePresetIds.includes(preset.id);
              const colors = colorMap[preset.color] || colorMap.blue;
              return (
                <button
                  key={preset.id}
                  draggable={onReorderPresets !== undefined}
                  onDragStart={(e) => handleDragStart(e, preset.id)}
                  onDragOver={(e) => handleDragOver(e, preset.id)}
                  onDragEnd={() => setDraggedPresetId(null)}
                  onClick={() => onTogglePreset(preset.id)}
                  className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                    isActive ? colors.active : colors.inactive
                  } hover:shadow-sm ${
                    draggedPresetId === preset.id ? "opacity-40 scale-95" : ""
                  }`}
                >
                  {isActive ? "✓ " : ""}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
