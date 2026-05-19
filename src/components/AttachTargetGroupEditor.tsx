import { useState, type MouseEvent } from "react";
import { ChevronDown, ChevronRight, Layers, Plus, X } from "lucide-react";
import type { AttachTargetGroup } from "../lib/attachRate";

export default function AttachTargetGroupEditor({
  treeMap,
  groups,
  onGroupsChange,
}: {
  treeMap: Map<string, Set<string>>;
  groups: AttachTargetGroup[];
  onGroupsChange: (groups: AttachTargetGroup[]) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [pendingSubs, setPendingSubs] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");

  const assignedSubs = new Set(groups.flatMap((g) => g.members));
  const groupLabels = new Set(groups.map((g) => g.label));

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

  const togglePendingSub = (sub: string) => {
    setPendingSubs((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const toggleMainGroup = (mainCat: string) => {
    const existing = groups.find((g) => g.label === mainCat);
    if (existing) {
      onGroupsChange(groups.filter((g) => g.id !== existing.id));
      return;
    }
    onGroupsChange([
      ...groups,
      {
        id: `main-${mainCat}`,
        label: mainCat,
        members: [mainCat],
      },
    ]);
  };

  const createGroupFromPending = () => {
    const label = newGroupName.trim();
    if (!label || pendingSubs.length === 0) return;
    if (groupLabels.has(label)) return;
    onGroupsChange([
      ...groups,
      {
        id: `grp-${Date.now()}`,
        label,
        members: [...pendingSubs],
      },
    ]);
    setPendingSubs([]);
    setNewGroupName("");
  };

  const removeGroup = (id: string) => {
    onGroupsChange(groups.filter((g) => g.id !== id));
  };

  const removeMember = (groupId: string, member: string) => {
    onGroupsChange(
      groups
        .map((g) => {
          if (g.id !== groupId) return g;
          const members = g.members.filter((m) => m !== member);
          return { ...g, members };
        })
        .filter((g) => g.members.length > 0),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
        {Array.from(treeMap.entries()).map(([mainCat, subCats]) => {
          const isMainGroup = groups.some((g) => g.label === mainCat);
          const isExpanded = expandedCats.has(mainCat);
          const hasSub = subCats.size > 0;

          return (
            <div
              key={mainCat}
              className={`border rounded-xl transition-all ${
                isMainGroup
                  ? "bg-teal-500/15 border-teal-400/50"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div
                className="px-3 py-2 flex items-center justify-between cursor-pointer"
                onClick={() => toggleMainGroup(mainCat)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={isMainGroup}
                    readOnly
                    className="w-3.5 h-3.5 shrink-0 cursor-pointer accent-teal-400"
                  />
                  <span
                    className={`text-xs font-semibold truncate ${
                      isMainGroup ? "text-teal-100" : "text-white/90"
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
                    const isPending = pendingSubs.includes(sub);
                    const isAssigned = assignedSubs.has(sub);
                    return (
                      <label
                        key={sub}
                        className={`flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-md hover:bg-white/5 ${
                          isAssigned && !isPending ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isPending}
                          disabled={isAssigned && !isPending}
                          onChange={() => togglePendingSub(sub)}
                          className="w-3 h-3 accent-teal-400"
                        />
                        <span
                          className={`text-[11px] font-medium truncate ${
                            isPending ? "text-white" : "text-white/60"
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

      {pendingSubs.length > 0 && (
        <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 p-2.5 space-y-2">
          <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
            Sub ที่เลือก ({pendingSubs.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {pendingSubs.map((sub) => (
              <span
                key={sub}
                className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full border border-white/10"
              >
                {sub}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="ชื่อกลุ่ม Attach เช่น Apple Care รวม"
              className="flex-1 min-w-0 text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white placeholder:text-white/40 outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={createGroupFromPending}
              disabled={!newGroupName.trim()}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              รวมกลุ่ม
            </button>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" />
            กลุ่ม Attach ({groups.length})
          </div>
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-teal-100">{group.label}</span>
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="text-white/40 hover:text-white p-0.5"
                  aria-label="ลบกลุ่ม"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.members.map((member) => (
                  <span
                    key={`${group.id}-${member}`}
                    className="inline-flex items-center gap-0.5 text-[10px] bg-teal-500/15 text-white/80 px-1.5 py-0.5 rounded-full border border-teal-500/20"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => removeMember(group.id, member)}
                      className="hover:text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
