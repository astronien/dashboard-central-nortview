import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Pencil, Check, X, Plus, Trash2, GripVertical } from "lucide-react";
import type { WonderItemConfig, WonderDivisor } from "../lib/wonderConfig";
import { DEFAULT_WONDER_CONFIGS, WONDER_DIVISOR_OPTIONS } from "../lib/wonderConfig";

type Props = {
  configs: WonderItemConfig[];
  onChange: (configs: WonderItemConfig[]) => void;
};

export default function WonderConfigEditor({ configs, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(20);
  const [newDivisor, setNewDivisor] = useState<WonderDivisor>("iPhone");
  const [newKeywords, setNewKeywords] = useState("");

  const startEdit = (item: WonderItemConfig) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onChange(
      configs.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleTargetChange = (id: string, value: number) => {
    onChange(
      configs.map((c) =>
        c.id === id ? { ...c, targetPercent: Math.max(0, Math.min(100, value)) } : c
      )
    );
  };

  const handleDivisorChange = (id: string, divisor: WonderDivisor) => {
    onChange(configs.map((c) => (c.id === id ? { ...c, divisor } : c)));
  };

  const handleReset = () => {
    onChange([...DEFAULT_WONDER_CONFIGS]);
  };

  const handleDelete = (id: string) => {
    onChange(configs.filter((c) => c.id !== id));
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = `w${Date.now()}`;
    const keywords = newKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    onChange([
      ...configs,
      {
        id,
        name: newName.trim(),
        targetPercent: newTarget,
        divisor: newDivisor,
        matchKeywords: keywords.length > 0 ? keywords : [newName.trim().toLowerCase()],
      },
    ]);
    setShowAddForm(false);
    setNewName("");
    setNewTarget(20);
    setNewDivisor("iPhone");
    setNewKeywords("");
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-lg">⚙️</span> 7 Wonder Config
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            ปรับแกนตัวหาร (Divisor) และ Target % ของแต่ละ Wonder — ค่าจะบันทึกอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่ม
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                เพิ่ม Wonder ใหม่
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">ชื่อ</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. AirPods Attach"
                    className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500 placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">
                    Target %
                  </label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">
                    ตัวหาร
                  </label>
                  <select
                    value={newDivisor}
                    onChange={(e) => setNewDivisor(e.target.value as WonderDivisor)}
                    className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  >
                    {WONDER_DIVISOR_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="text-gray-900"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">
                    Keywords (comma-sep)
                  </label>
                  <input
                    type="text"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="e.g. airpods,air pod"
                    className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500 placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  เพิ่ม Wonder
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/70">
              <th className="py-3 px-3 font-bold text-center w-10">#</th>
              <th className="py-3 px-3 font-bold">ชื่อ Wonder</th>
              <th className="py-3 px-3 font-bold text-center">Target %</th>
              <th className="py-3 px-3 font-bold text-center">ตัวหาร (Divisor)</th>
              <th className="py-3 px-3 font-bold text-center">Keywords</th>
              <th className="py-3 px-3 font-bold text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
            {configs.map((item, idx) => (
              <motion.tr
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: idx * 0.03 }}
                className="hover:bg-white/5 transition-colors duration-150 group"
              >
                {/* # */}
                <td className="py-3 px-3 text-center text-white/40 font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <GripVertical className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {idx + 1}
                  </div>
                </td>

                {/* Name */}
                <td className="py-3 px-3">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(item.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full text-xs bg-white/10 border border-emerald-500/40 text-white rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(item.id)}
                        className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="flex items-center gap-2 text-white/90 font-semibold hover:text-white transition-colors cursor-pointer group/name"
                    >
                      {item.name}
                      <Pencil className="w-3 h-3 text-white/20 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    </button>
                  )}
                </td>

                {/* Target % */}
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={item.targetPercent}
                      onChange={(e) =>
                        handleTargetChange(item.id, Number(e.target.value))
                      }
                      className="w-16 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span
                      className={`min-w-[36px] text-right tabular-nums font-bold ${
                        item.targetPercent >= 50
                          ? "text-amber-400"
                          : item.targetPercent >= 20
                            ? "text-emerald-400"
                            : "text-white/70"
                      }`}
                    >
                      {item.targetPercent}%
                    </span>
                  </div>
                </td>

                {/* Divisor */}
                <td className="py-3 px-3 text-center">
                  <select
                    value={item.divisor}
                    onChange={(e) =>
                      handleDivisorChange(
                        item.id,
                        e.target.value as WonderDivisor
                      )
                    }
                    className="text-xs bg-white/10 border border-white/15 text-white rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {WONDER_DIVISOR_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="text-gray-900"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Keywords */}
                <td className="py-3 px-3 text-center">
                  <span className="text-white/40 text-[10px]">
                    {item.matchKeywords.join(", ")}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="ลบ Wonder"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 text-[10px] text-white/30">
        <span>
          {configs.length} Wonder{configs.length !== 1 ? "s" : ""} configured
        </span>
        <span>Auto-saved to localStorage</span>
      </div>
    </div>
  );
}
