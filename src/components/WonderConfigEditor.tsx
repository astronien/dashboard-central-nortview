import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  GripVertical,
  Settings,
} from "lucide-react";
import type { WonderItemConfig, WonderDivisor } from "../lib/wonderConfig";
import { DEFAULT_WONDER_CONFIGS, WONDER_DIVISOR_OPTIONS } from "../lib/wonderConfig";
import CategoryTreePicker from "./CategoryTreePicker";

type Props = {
  configs: WonderItemConfig[];
  onChange: (configs: WonderItemConfig[]) => void;
  uniqueCombos: { cat: string; sub: string; label: string }[];
  staffCategoryTree?: Map<string, Set<string>>;
  salesHeaders?: string[];
};

export default function WonderConfigEditor({
  configs,
  onChange,
  uniqueCombos,
  staffCategoryTree,
  salesHeaders,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editing state variables
  const [editName, setEditName] = useState("");
  const [editTargetPercent, setEditTargetPercent] = useState(0);
  const [editBaseCategories, setEditBaseCategories] = useState<string[]>([]);
  const [editDivisorCategories, setEditDivisorCategories] = useState<string[]>([]);
  const [editDivisor, setEditDivisor] = useState<WonderDivisor>("iPhone");
  const [editDivisorBase, setEditDivisorBase] = useState<"unit" | "revenue">("unit");
  const [editBaseMode, setEditBaseMode] = useState<"unit" | "revenue">("unit");
  const [editMatchKeywords, setEditMatchKeywords] = useState<string[]>([]);
  
  // Three-way selector mode: "preset" | "tree" | "column"
  const [useDivisorMode, setUseDivisorMode] = useState<"preset" | "tree" | "column">("preset");
  const [editDivisorColumn, setEditDivisorColumn] = useState("");
  const [editDivisorValue, setEditDivisorValue] = useState("");

  // Add Form state variables
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(20);
  const [newBaseCategories, setNewBaseCategories] = useState<string[]>([]);
  const [newDivisorCategories, setNewDivisorCategories] = useState<string[]>([]);
  const [newDivisor, setNewDivisor] = useState<WonderDivisor>("iPhone");
  const [newDivisorBase, setNewDivisorBase] = useState<"unit" | "revenue">("unit");
  const [newKeywords, setNewKeywords] = useState("");
  
  const [newDivisorMode, setNewDivisorMode] = useState<"preset" | "tree" | "column">("preset");
  const [newDivisorColumn, setNewDivisorColumn] = useState("");
  const [newDivisorValue, setNewDivisorValue] = useState("");

  // Reusable Category Tree Map builder with robust fallback
  const categoryTree = useMemo(() => {
    if (staffCategoryTree && staffCategoryTree.size > 0) {
      return staffCategoryTree;
    }
    // Fallback: build Map from uniqueCombos
    const tree = new Map<string, Set<string>>();
    uniqueCombos.forEach((combo) => {
      const cat = combo.cat.trim();
      const sub = combo.sub.trim();
      if (!cat) return;
      if (!tree.has(cat)) tree.set(cat, new Set());
      if (sub) tree.get(cat)!.add(sub);
    });
    return tree;
  }, [staffCategoryTree, uniqueCombos]);

  // Unified available headers list (Dynamic or Mapped Fallback)
  const availableHeaders = useMemo(() => {
    if (salesHeaders && salesHeaders.length > 0) {
      return salesHeaders;
    }
    return [
      "Product (Code)",
      "Product (Name)",
      "Category (Name)",
      "Sub Category",
      "Branch (Name)",
      "Officer (Name)",
      "Doc No",
      "Doc Date",
      "Total Price",
      "ราคาขายตามบิล",
      "Number",
      "Customer (Name)",
    ];
  }, [salesHeaders]);

  // Start editing a row
  const startEdit = (item: WonderItemConfig) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditTargetPercent(item.targetPercent);
    setEditBaseCategories(item.baseCategories || []);
    setEditDivisorCategories(item.divisorCategories || []);
    setEditDivisor(item.divisor || "iPhone");
    setEditDivisorBase(item.divisorBase || "unit");
    setEditMatchKeywords(item.matchKeywords || []);
    
    if (item.divisorColumn && item.divisorValue) {
      setUseDivisorMode("column");
      setEditDivisorColumn(item.divisorColumn);
      setEditDivisorValue(item.divisorValue);
    } else if (item.divisorCategories && item.divisorCategories.length > 0) {
      setUseDivisorMode("tree");
      setEditDivisorColumn("");
      setEditDivisorValue("");
    } else {
      setUseDivisorMode("preset");
      setEditDivisorColumn("");
      setEditDivisorValue("");
    }
  };

  // Toggle base categories in editing mode
  const toggleEditBaseCategory = (key: string) => {
    setEditBaseCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Toggle divisor categories in editing mode
  const toggleEditDivisorCategory = (key: string) => {
    setEditDivisorCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Toggle base categories in add mode
  const toggleNewBaseCategory = (key: string) => {
    setNewBaseCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Toggle divisor categories in add mode
  const toggleNewDivisorCategory = (key: string) => {
    setNewDivisorCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    const resolvedDivCol = editDivisorColumn || availableHeaders[0];

    onChange(
      configs.map((c) =>
        c.id === id
          ? {
              ...c,
              name: editName.trim(),
              targetPercent: editTargetPercent,
              baseCategories: editBaseCategories,
              divisorCategories: useDivisorMode === "tree" ? editDivisorCategories : [],
              divisor: useDivisorMode === "preset" ? editDivisor : undefined,
              divisorBase: useDivisorMode === "preset" ? editDivisorBase : undefined,
              baseMode: editBaseMode,
              divisorColumn: useDivisorMode === "column" ? resolvedDivCol : undefined,
              divisorValue: useDivisorMode === "column" ? editDivisorValue : undefined,
              matchKeywords: editMatchKeywords,
            }
          : c
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleReset = () => {
    if (
      confirm(
        "คุณต้องการรีเซ็ต 7 Wonders เป็นค่าเริ่มต้นหรือไม่? ข้อมูลที่แก้ไขจะถูกแทนที่ด้วยค่าโรงงาน"
      )
    ) {
      onChange([...DEFAULT_WONDER_CONFIGS]);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("ต้องการลบ Wonder นี้ออกใช่หรือไม่?")) {
      onChange(configs.filter((c) => c.id !== id));
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = `w${Date.now()}`;
    const keywords = newKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const resolvedDivCol = newDivisorColumn || availableHeaders[0];

    onChange([
      ...configs,
      {
        id,
        name: newName.trim(),
        targetPercent: newTarget,
        baseCategories: newBaseCategories,
        divisorCategories: newDivisorMode === "tree" ? newDivisorCategories : [],
        divisor: newDivisorMode === "preset" ? newDivisor : undefined,
        divisorBase: newDivisorMode === "preset" ? newDivisorBase : undefined,
        baseMode: newDivisorBase,
        divisorColumn: newDivisorMode === "column" ? resolvedDivCol : undefined,
        divisorValue: newDivisorMode === "column" ? newDivisorValue : undefined,
        matchKeywords:
          keywords.length > 0 ? keywords : [newName.trim().toLowerCase()],
      },
    ]);

    // Reset Form
    setShowAddForm(false);
    setNewName("");
    setNewTarget(20);
    setNewBaseCategories([]);
    setNewDivisorCategories([]);
    setNewDivisor("iPhone");
    setNewKeywords("");
    setNewDivisorMode("preset");
    setNewDivisorColumn("");
    setNewDivisorValue("");
  };

  // Format category badge label intelligently
  const formatBadgeLabel = (key: string) => {
    if (categoryTree.has(key)) {
      return `${key} (ทั้งหมด)`;
    }
    return key;
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            <span className="text-lg">⚙️</span> 7 Wonder Config Editor (Turso DB)
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            ปรับเป้าหมาย % เลือกหมวดหมู่ของตัวตั้ง หรือเลือกกรองหัวตารางในไฟล์ยอดขายเป็นตัวหารได้อย่างอิสระ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่ม Wonder
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset ค่าเริ่มต้น
          </button>
        </div>
      </div>

      {/* Add Wonder Form Panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-5 rounded-[1.5rem] border border-emerald-500/25 bg-emerald-500/5 space-y-4">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ✨ เพิ่ม Wonder ตัวชี้วัดใหม่
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">ชื่อตัวชี้วัด</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น AirPods Pro Attach"
                    className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500 placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Target %</label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) =>
                      setNewTarget(Math.max(0, Math.min(100, Number(e.target.value))))
                    }
                    min={0}
                    max={100}
                    className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">
                    คีย์เวิร์ดสำรอง (สำหรับข้อมูลแบบเก่า)
                  </label>
                  <input
                    type="text"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="เช่น airpods, pro (ใส่จุลภาคคั่น)"
                    className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500 placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Add form Category Selections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Base selection */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                  <label className="text-[10px] text-emerald-400 font-bold block mb-1">
                    🎯 1. BASE TARGET (ตัวตั้ง / ตัวเศษ)
                  </label>

                  <CategoryTreePicker
                    treeMap={categoryTree}
                    selected={newBaseCategories}
                    toggle={toggleNewBaseCategory}
                    variant="base"
                  />

                  <div className="mt-2.5">
                    <div className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                      หมวดที่เลือก ({newBaseCategories.length})
                    </div>
                    {newBaseCategories.length === 0 ? (
                      <div className="text-[10px] text-white/40 italic">
                        ยังไม่ได้เลือก (จะใช้การจับคู่คีย์เวิร์ดสำรองแทน)
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                        {newBaseCategories.map((member) => (
                          <span
                            key={member}
                            className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                          >
                            {formatBadgeLabel(member)}
                            <button
                              type="button"
                              onClick={() => toggleNewBaseCategory(member)}
                              className="hover:text-white text-emerald-400 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divisor selection */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                  <label className="text-[10px] text-teal-400 font-bold block mb-1">
                    📊 2. DIVISOR TARGET (ตัวหาร / Denominator)
                  </label>

                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setNewDivisorMode("preset")}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        newDivisorMode === "preset"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDivisorMode("tree")}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        newDivisorMode === "tree"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      เลือกหมวดหมู่ย่อย
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDivisorMode("column")}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        newDivisorMode === "column"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      หัวตารางยอดขาย (Column Filter)
                    </button>
                  </div>

                  {newDivisorMode === "preset" && (
                    <div className="space-y-3 py-4">
                      <div>
                        <label className="text-[10px] text-white/40 block mb-1">เลือกกลุ่มสินค้าหลักสำเร็จรูป</label>
                        <select
                          value={newDivisor}
                          onChange={(e) => setNewDivisor(e.target.value as WonderDivisor)}
                          className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-teal-400 text-gray-900"
                        >
                          {WONDER_DIVISOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="text-gray-900">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-white/40 block mb-1">ฐานตัวหาร</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setNewDivisorBase("unit")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] border transition-colors ${newDivisorBase === "unit" ? "bg-teal-500/20 border-teal-400/30 text-teal-200" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}
                          >
                            Unit
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewDivisorBase("revenue")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] border transition-colors ${newDivisorBase === "revenue" ? "bg-teal-500/20 border-teal-400/30 text-teal-200" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}
                          >
                            บาท
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {newDivisorMode === "tree" && (
                    <>
                      <CategoryTreePicker
                        treeMap={categoryTree}
                        selected={newDivisorCategories}
                        toggle={toggleNewDivisorCategory}
                        variant="attach"
                      />

                      <div className="mt-2.5">
                        <div className="text-[10px] font-bold text-teal-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                          หมวดที่เลือก ({newDivisorCategories.length})
                        </div>
                        {newDivisorCategories.length === 0 ? (
                          <div className="text-[10px] text-white/40 italic">
                            ยังไม่ได้เลือกตัวหารแบบกำหนดเอง
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                            {newDivisorCategories.map((member) => (
                              <span
                                key={member}
                                className="inline-flex items-center gap-1 text-[10px] bg-teal-500/15 text-teal-100 px-2.5 py-0.5 rounded-full border border-teal-500/20"
                              >
                                {formatBadgeLabel(member)}
                                <button
                                  type="button"
                                  onClick={() => toggleNewDivisorCategory(member)}
                                  className="hover:text-white text-teal-400 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {newDivisorMode === "column" && (
                    <div className="space-y-3 py-2">
                      <div>
                        <label className="text-[10px] text-white/50 block mb-1">เลือกหัวตารางในไฟล์ยอดขาย</label>
                        <select
                          value={newDivisorColumn || availableHeaders[0]}
                          onChange={(e) => setNewDivisorColumn(e.target.value)}
                          className="w-full text-xs bg-[#0b291d] border border-white/10 text-white rounded-xl px-3 py-2.5 outline-none focus:border-teal-400"
                        >
                          {availableHeaders.map((h) => (
                            <option key={h} value={h} className="bg-[#052b20] text-white">
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-white/50 block mb-1">ค่าในตารางแถวนั้นต้องเป็นคำว่า (Matching Value)</label>
                        <input
                          type="text"
                          value={newDivisorValue}
                          onChange={(e) => setNewDivisorValue(e.target.value)}
                          placeholder="เช่น ufund หรือ true sim หรือ dtac"
                          className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-teal-400 placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
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
                  บันทึก Wonder ใหม่
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Configurations Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0b291d] border-b border-emerald-500/20 text-white/70">
              <th className="py-3.5 px-4 font-bold text-center w-10">#</th>
              <th className="py-3.5 px-4 font-bold">ชื่อ Wonder</th>
              <th className="py-3.5 px-4 font-bold text-center w-36">เป้าหมาย Target</th>
              <th className="py-3.5 px-4 font-bold">หมวดหมู่ตัวตั้ง (Base / ตัวเศษ)</th>
              <th className="py-3.5 px-4 font-bold">หมวดหมู่ตัวหาร (Divisor)</th>
              <th className="py-3.5 px-4 font-bold text-center w-24">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/40">
            {configs.map((item, idx) => {
              const isEditing = editingId === item.id;
              const hasCustomBase = item.baseCategories && item.baseCategories.length > 0;
              const hasCustomDiv = item.divisorCategories && item.divisorCategories.length > 0;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-white/5 transition-colors duration-150"
                >
                  {/* Table normal / edit row */}
                  <td className="py-4 px-4 text-center text-white/40 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <GripVertical className="w-3.5 h-3.5 text-white/10 cursor-grab" />
                      {idx + 1}
                    </div>
                  </td>

                  {/* Name column */}
                  <td className="py-4 px-4 font-semibold text-white/95">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs bg-white/10 border border-emerald-500/40 text-white rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 font-semibold"
                      />
                    ) : (
                      item.name
                    )}
                  </td>

                  {/* Target Column */}
                  <td className="py-4 px-4 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={editTargetPercent}
                          onChange={(e) => setEditTargetPercent(Number(e.target.value))}
                          className="w-16 h-1.5 bg-white/15 rounded-lg appearance-none accent-emerald-400 cursor-pointer"
                        />
                        <span className="min-w-[28px] text-right font-bold text-emerald-400 tabular-nums">
                          {editTargetPercent}%
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        {item.targetPercent}%
                      </span>
                    )}
                  </td>

                  {/* Base Categories Badge List */}
                  <td className="py-4 px-4">
                    {isEditing ? (
                      <span className="text-[10px] text-white/40">
                        แก้ไขข้อมูลหมวดหมู่ในพาเนลด้านล่าง
                      </span>
                    ) : hasCustomBase ? (
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {item.baseCategories?.map((cat) => (
                          <span
                            key={cat}
                            className="text-[9px] font-medium bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md"
                          >
                            {formatBadgeLabel(cat)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40 italic">
                        คีย์เวิร์ด: {item.matchKeywords?.join(", ")}
                      </span>
                    )}
                  </td>

                  {/* Divisor Column */}
                  <td className="py-4 px-4">
                    {isEditing ? (
                      <span className="text-[10px] text-white/40">
                        แก้ไขข้อมูลหมวดหมู่ในพาเนลด้านล่าง
                      </span>
                    ) : item.divisorColumn && item.divisorValue ? (
                      <span className="text-[10px] text-teal-300 font-bold bg-teal-500/15 border border-teal-500/20 px-2.5 py-1 rounded-md">
                        หัวตาราง: {item.divisorColumn} = "{item.divisorValue}"
                      </span>
                    ) : hasCustomDiv ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {item.divisorCategories?.map((cat) => (
                          <span
                            key={cat}
                            className="text-[9px] font-medium bg-blue-500/15 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md"
                          >
                            {formatBadgeLabel(cat)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md">
                        Preset: {item.divisor}
                      </span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 px-4 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="p-1.5 hover:bg-emerald-500/25 border border-emerald-500/20 bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="บันทึก"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-1.5 hover:bg-rose-500/25 border border-rose-500/20 bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขรายละเอียด"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="ลบตัวชี้วัด"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Accordion Edit panel for editing categories */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            {configs
              .filter((item) => item.id === editingId)
              .map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-[1.5rem] border border-emerald-500/25 bg-emerald-500/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 animate-spin-slow" />{" "}
                      แก้ไขการจับคู่ประเภทสินค้า: {editName}
                    </p>
                    <span className="text-[10px] text-white/40">ID: {editingId}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Base selection */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                      <label className="text-[10px] text-emerald-400 font-bold block mb-1">
                        🎯 1. BASE TARGET (ตัวตั้ง / ตัวเศษ)
                      </label>

                      <CategoryTreePicker
                        treeMap={categoryTree}
                        selected={editBaseCategories}
                        toggle={toggleEditBaseCategory}
                        variant="base"
                      />

                      <div className="mt-2.5">
                        <div className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                          หมวดที่เลือก ({editBaseCategories.length})
                        </div>
                        {editBaseCategories.length === 0 ? (
                          <div className="text-[10px] text-white/40 italic">
                            ยังไม่ได้เลือก (จะใช้การจับคู่คีย์เวิร์ดสำรองแทน)
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                            {editBaseCategories.map((member) => (
                              <span
                                key={member}
                                className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                              >
                                {formatBadgeLabel(member)}
                                <button
                                  type="button"
                                  onClick={() => toggleEditBaseCategory(member)}
                                  className="hover:text-white text-emerald-400 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divisor selection */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                      <label className="text-[10px] text-teal-400 font-bold block mb-1">
                        📊 2. DIVISOR TARGET (ตัวหาร / Denominator)
                      </label>

                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setUseDivisorMode("preset")}
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            useDivisorMode === "preset"
                              ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseDivisorMode("tree")}
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            useDivisorMode === "tree"
                              ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          เลือกหมวดหมู่ย่อย
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseDivisorMode("column")}
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            useDivisorMode === "column"
                              ? "bg-teal-500/20 text-teal-300 border-teal-500/30 font-semibold shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          หัวตารางยอดขาย (Column Filter)
                        </button>
                      </div>

                      {useDivisorMode === "preset" && (
                        <div className="space-y-3 py-6">
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">เลือกกลุ่มสินค้าหลักสำเร็จรูป</label>
                            <select
                              value={editDivisor}
                              onChange={(e) => setEditDivisor(e.target.value as WonderDivisor)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 text-gray-900"
                            >
                              {WONDER_DIVISOR_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="text-gray-955">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">ฐานตัวหาร</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditDivisorBase("unit")}
                                className={`px-3 py-1.5 rounded-lg text-[10px] border transition-colors ${editDivisorBase === "unit" ? "bg-teal-500/20 border-teal-400/30 text-teal-200" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}
                              >
                                Unit
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditDivisorBase("revenue")}
                                className={`px-3 py-1.5 rounded-lg text-[10px] border transition-colors ${editDivisorBase === "revenue" ? "bg-teal-500/20 border-teal-400/30 text-teal-200" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"}`}
                              >
                                บาท
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] text-white/40 italic mt-1">
                            * Unit = นับจำนวนเครื่อง / บาท = ใช้มูลค่ารวมเป็นฐานคำนวณ
                          </p>
                        </div>
                      )}

                      {useDivisorMode === "tree" && (
                        <>
                          <CategoryTreePicker
                            treeMap={categoryTree}
                            selected={editDivisorCategories}
                            toggle={toggleEditDivisorCategory}
                            variant="attach"
                          />

                          <div className="mt-2.5">
                            <div className="text-[10px] font-bold text-teal-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                              หมวดที่เลือก ({editDivisorCategories.length})
                            </div>
                            {editDivisorCategories.length === 0 ? (
                              <div className="text-[10px] text-white/40 italic">
                                ยังไม่ได้เลือกตัวหารแบบกำหนดเอง
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                                {editDivisorCategories.map((member) => (
                                  <span
                                    key={member}
                                    className="inline-flex items-center gap-1 text-[10px] bg-teal-500/15 text-teal-100 px-2.5 py-0.5 rounded-full border border-teal-500/20"
                                  >
                                    {formatBadgeLabel(member)}
                                    <button
                                      type="button"
                                      onClick={() => toggleEditDivisorCategory(member)}
                                      className="hover:text-white text-teal-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {useDivisorMode === "column" && (
                        <div className="space-y-3 py-2">
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">เลือกหัวตารางในไฟล์ยอดขาย</label>
                            <select
                              value={editDivisorColumn || availableHeaders[0]}
                              onChange={(e) => setEditDivisorColumn(e.target.value)}
                              className="w-full text-xs bg-[#0b291d] border border-white/10 text-white rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 text-white"
                            >
                              {availableHeaders.map((h) => (
                                <option key={h} value={h} className="bg-[#052b20] text-white">
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">ค่าในตารางแถวนั้นต้องเป็นคำว่า (Matching Value)</label>
                            <input
                              type="text"
                              value={editDivisorValue}
                              onChange={(e) => setEditDivisorValue(e.target.value)}
                              placeholder="เช่น ufund หรือ true sim หรือ dtac"
                              className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 outline-none focus:border-teal-400 placeholder:text-white/20"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel footer buttons */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      บันทึกหมวดหมู่ของ {editName}
                    </button>
                  </div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 text-[10px] text-white/30">
        <span>
          {configs.length} Wonder{configs.length !== 1 ? "s" : ""} configured
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          บันทึกข้อมูลแบบเรียลไทม์ลง Turso Cloud Database
        </span>
      </div>
    </div>
  );
}
