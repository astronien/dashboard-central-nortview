import { useState, type MouseEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ThemeVariant = "base" | "attach";

const themeStyles: Record<
  ThemeVariant,
  { selected: string; text: string; accent: string }
> = {
  base: {
    selected: "bg-emerald-500/20 border-emerald-400/60",
    text: "text-emerald-100",
    accent: "accent-emerald-400",
  },
  attach: {
    selected: "bg-teal-500/15 border-teal-400/50",
    text: "text-teal-100",
    accent: "accent-teal-400",
  },
};

export default function CategoryTreePicker({
  treeMap,
  selected,
  toggle,
  variant,
}: {
  treeMap: Map<string, Set<string>>;
  selected: string[];
  toggle: (cat: string) => void;
  variant: ThemeVariant;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const theme = themeStyles[variant];

  const toggleExpand = (cat: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
      {Array.from(treeMap.entries()).map(([mainCat, subCats]) => {
        const isMainSelected = selected.includes(mainCat);
        const isExpanded = expandedCats.has(mainCat);
        const hasSub = subCats.size > 0;

        return (
          <div
            key={mainCat}
            className={`border rounded-xl transition-all ${
              isMainSelected ? theme.selected : "bg-white/5 border-white/10"
            }`}
          >
            <div
              className="px-3 py-2 flex items-center justify-between cursor-pointer"
              onClick={() => toggle(mainCat)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={isMainSelected}
                  readOnly
                  className={`w-3.5 h-3.5 shrink-0 cursor-pointer ${theme.accent}`}
                />
                <span
                  className={`text-xs font-semibold truncate ${
                    isMainSelected ? theme.text : "text-white/90"
                  }`}
                >
                  {mainCat}
                </span>
                {hasSub && (
                  <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full border border-white/10 shrink-0">
                    {subCats.size}
                  </span>
                )}
              </div>
              {hasSub && (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(mainCat, e)}
                  className="p-0.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white/50 shrink-0 ml-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {isExpanded && hasSub && (
              <div className="px-3 pb-2 pt-0 border-t border-white/5 flex flex-col gap-1">
                {Array.from(subCats).map((sub) => {
                  const isSubSelected = selected.includes(sub);
                  return (
                    <label
                      key={sub}
                      className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-md hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={isSubSelected}
                        onChange={() => toggle(sub)}
                        className={`w-3 h-3 ${theme.accent}`}
                      />
                      <span
                        className={`text-[11px] font-medium truncate ${
                          isSubSelected ? "text-white" : "text-white/60"
                        }`}
                      >
                        {sub}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
