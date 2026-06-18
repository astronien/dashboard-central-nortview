import type { Preset, PresetColor } from "../../lib/presetTypes";

interface KpiPresetTogglePillsProps {
  presets: Preset[];
  activePresetIds: string[];
  onToggle: (presetId: string) => void;
}

const colorMap: Record<PresetColor, { bg: string; activeBg: string; text: string }> = {
  green: { bg: "bg-emerald-500/20", activeBg: "bg-emerald-500", text: "text-emerald-300" },
  amber: { bg: "bg-amber-500/20", activeBg: "bg-amber-500", text: "text-amber-300" },
  blue: { bg: "bg-blue-500/20", activeBg: "bg-blue-500", text: "text-blue-300" },
  teal: { bg: "bg-teal-500/20", activeBg: "bg-teal-500", text: "text-teal-300" },
  purple: { bg: "bg-purple-500/20", activeBg: "bg-purple-500", text: "text-purple-300" },
  coral: { bg: "bg-orange-500/20", activeBg: "bg-orange-500", text: "text-orange-300" },
};

export default function KpiPresetTogglePills({
  presets,
  activePresetIds,
  onToggle,
}: KpiPresetTogglePillsProps) {
  if (presets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-emerald-400 font-bold">แสดง KPI:</span>
      {presets.map((preset) => {
        const isActive = activePresetIds.includes(preset.id);
        const colors = colorMap[preset.color] || colorMap.blue;
        return (
          <button
            key={preset.id}
            onClick={() => onToggle(preset.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              isActive
                ? `${colors.activeBg} text-white shadow-sm border-transparent`
                : `${colors.bg} ${colors.text} hover:opacity-80 border-white/10`
            }`}
          >
            {preset.name}
            {isActive && <span className="ml-1.5 text-xs">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
