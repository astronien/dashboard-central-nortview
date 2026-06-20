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
import type {
  WonderItemConfig,
  WonderFilter,
  WonderCalcType,
} from "../lib/wonderConfig";
import { DEFAULT_WONDER_CONFIGS } from "../lib/wonderConfig";
import CategoryTreePicker from "./CategoryTreePicker";

type Props = {
  configs: WonderItemConfig[];
  onChange: (configs: WonderItemConfig[]) => void;
  uniqueCombos: { cat: string; sub: string; label: string }[];
  staffCategoryTree?: Map<string, Set<string>>;
  salesHeaders?: string[];
};

const FILTER_FIELDS: { key: keyof WonderFilter; label: string; chipColor: string }[] = [
  { key: "categories", label: "Categories", chipColor: "emerald" },
  { key: "subCategories", label: "Sub Categories", chipColor: "teal" },
  { key: "models", label: "Models", chipColor: "cyan" },
  { key: "brands", label: "Brands", chipColor: "indigo" },
  { key: "customerCodes", label: "Customer Codes", chipColor: "amber" },
  { key: "productNames", label: "Product Names", chipColor: "rose" },
  { key: "docTypes", label: "Doc Types", chipColor: "slate" },
];

const emptyFilter = (): WonderFilter => ({
  categories: [],
  subCategories: [],
  models: [],
  brands: [],
  customerCodes: [],
  productNames: [],
  docTypes: [],
  includeNonInventory: false,
});

const newId = () => `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export default function WonderConfigEditor({
  configs,
  onChange,
  uniqueCombos,
  staffCategoryTree,
  salesHeaders,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editName, setEditName] = useState("");
  const [editTargetPercent, setEditTargetPercent] = useState(0);
  const [editCalcType, setEditCalcType] = useState<WonderCalcType>("attach");
  const [editFiltersA, setEditFiltersA] = useState<WonderFilter[]>([emptyFilter()]);
  const [editFiltersB, setEditFiltersB] = useState<WonderFilter[]>([emptyFilter()]);
  const [editColor, setEditColor] = useState("green");

  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(20);
  const [newCalcType, setNewCalcType] = useState<WonderCalcType>("attach");
  const [newFiltersA, setNewFiltersA] = useState<WonderFilter[]>([emptyFilter()]);
  const [newFiltersB, setNewFiltersB] = useState<WonderFilter[]>([emptyFilter()]);
  const [newColor, setNewColor] = useState("green");

  const categoryTree = useMemo(() => {
    if (staffCategoryTree && staffCategoryTree.size > 0) {
      return staffCategoryTree;
    }
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

  const startEdit = (item: WonderItemConfig) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditTargetPercent(item.targetPercent);
    setEditCalcType(item.calcType);
    setEditFiltersA(
      item.filtersA.length > 0 ? item.filtersA.map((f) => ({ ...f })) : [emptyFilter()],
    );
    setEditFiltersB(
      item.filtersB.length > 0 ? item.filtersB.map((f) => ({ ...f })) : [emptyFilter()],
    );
    setEditColor(item.color ?? "green");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onChange(
      configs.map((c) =>
        c.id === id
          ? {
              ...c,
              name: editName.trim(),
              targetPercent: editTargetPercent,
              calcType: editCalcType,
              labelA: deriveLabel(editFiltersA, editCalcType),
              labelB: deriveLabel(editFiltersB, editCalcType),
              filtersA: editFiltersA,
              filtersB: editFiltersB,
              color: editColor,
            }
          : c,
      ),
    );
    setEditingId(null);
  };

  const handleReset = () => {
    if (
      confirm(
        "คุณต้องการรีเซ็ต Wonders เป็นค่าเริ่มต้นหรือไม่? ข้อมูลที่แก้ไขจะถูกแทนที่ด้วยค่าโรงงาน",
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
    onChange([
      ...configs,
      {
        id: newId(),
        name: newName.trim(),
        targetPercent: newTarget,
        calcType: newCalcType,
        labelA: deriveLabel(newFiltersA, newCalcType),
        labelB: deriveLabel(newFiltersB, newCalcType),
        filtersA: newFiltersA,
        filtersB: newFiltersB,
        color: newColor,
      },
    ]);
    setShowAddForm(false);
    setNewName("");
    setNewTarget(20);
    setNewCalcType("attach");
    setNewFiltersA([emptyFilter()]);
    setNewFiltersB([emptyFilter()]);
    setNewColor("green");
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] text-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            <span className="text-lg">⚙️</span> Wonder Config Editor (Turso DB)
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            กำหนด filter แบบ multi-field (categories, subCategories, models, brands, customerCodes, productNames, docTypes) สำหรับ numerator และ denominator
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="text-[10px] text-white/50 block mb-1">Calc Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCalcType("attach")}
                      className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                        newCalcType === "attach"
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      Attach (Unit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCalcType("bahtRate")}
                      className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                        newCalcType === "bahtRate"
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      BahtRate (Revenue)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FilterSidePanel
                  title="🎯 A. NUMERATOR (ตัวเศษ)"
                  color="emerald"
                  filters={newFiltersA}
                  onChange={setNewFiltersA}
                  categoryTree={categoryTree}
                />
                <FilterSidePanel
                  title="📊 B. DENOMINATOR (ตัวหาร)"
                  color="teal"
                  filters={newFiltersB}
                  onChange={setNewFiltersB}
                  categoryTree={categoryTree}
                />
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

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0b291d] border-b border-emerald-500/20 text-white/70">
              <th className="py-3.5 px-4 font-bold text-center w-10">#</th>
              <th className="py-3.5 px-4 font-bold">ชื่อ Wonder</th>
              <th className="py-3.5 px-4 font-bold text-center w-28">Calc</th>
              <th className="py-3.5 px-4 font-bold text-center w-36">Target</th>
              <th className="py-3.5 px-4 font-bold">A: Numerator</th>
              <th className="py-3.5 px-4 font-bold">B: Denominator</th>
              <th className="py-3.5 px-4 font-bold text-center w-24">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/40">
            {configs.map((item, idx) => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-center text-white/40 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <GripVertical className="w-3.5 h-3.5 text-white/10 cursor-grab" />
                      {idx + 1}
                    </div>
                  </td>
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
                  <td className="py-4 px-4 text-center">
                    {isEditing ? (
                      <select
                        value={editCalcType}
                        onChange={(e) => setEditCalcType(e.target.value as WonderCalcType)}
                        className="text-[10px] bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="attach" className="text-gray-900">
                          Attach
                        </option>
                        <option value="bahtRate" className="text-gray-900">
                          BahtRate
                        </option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold text-white/85 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                        {item.calcType}
                      </span>
                    )}
                  </td>
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
                  <td className="py-4 px-4">
                    {isEditing ? (
                      <span className="text-[10px] text-white/40">
                        แก้ไขข้อมูลด้านล่าง
                      </span>
                    ) : (
                      <FilterBadges filter={item.filtersA[0]} />
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {isEditing ? (
                      <span className="text-[10px] text-white/40">
                        แก้ไขข้อมูลด้านล่าง
                      </span>
                    ) : (
                      <FilterBadges filter={item.filtersB[0]} />
                    )}
                  </td>
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
                      <Settings className="w-3.5 h-3.5 animate-spin-slow" /> แก้ไข: {editName}
                    </p>
                    <span className="text-[10px] text-white/40">ID: {editingId}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FilterSidePanel
                      title="🎯 A. NUMERATOR (ตัวเศษ)"
                      color="emerald"
                      filters={editFiltersA}
                      onChange={setEditFiltersA}
                      categoryTree={categoryTree}
                    />
                    <FilterSidePanel
                      title="📊 B. DENOMINATOR (ตัวหาร)"
                      color="teal"
                      filters={editFiltersB}
                      onChange={setEditFiltersB}
                      categoryTree={categoryTree}
                    />
                  </div>

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

function FilterBadges({ filter }: { filter?: WonderFilter }) {
  if (!filter) return <span className="text-[10px] text-white/40 italic">ไม่มี filter</span>;
  const chips: { label: string; count: number; color: string }[] = [];
  FILTER_FIELDS.forEach((f) => {
    const list = filter[f.key] as string[] | undefined;
    if (list && list.length > 0) {
      chips.push({ label: f.label, count: list.length, color: f.chipColor });
    }
  });
  if (filter.includeNonInventory === false) {
    chips.push({ label: "Inventory only", count: 1, color: "rose" });
  } else if (filter.includeNonInventory === true) {
    chips.push({ label: "+Non-inventory", count: 1, color: "rose" });
  }
  if (chips.length === 0) {
    return <span className="text-[10px] text-white/40 italic">ไม่จำกัด (all rows)</span>;
  }
  return (
    <div className="flex flex-wrap gap-1 max-w-[260px]">
      {chips.map((c) => (
        <span
          key={c.label}
          className="text-[9px] font-medium bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 rounded-md"
        >
          {c.label}: {c.count}
        </span>
      ))}
    </div>
  );
}

function FilterSidePanel({
  title,
  color,
  filters,
  onChange,
  categoryTree,
}: {
  title: string;
  color: "emerald" | "teal";
  filters: WonderFilter[];
  onChange: (next: WonderFilter[]) => void;
  categoryTree: Map<string, Set<string>>;
}) {
  const accent =
    color === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-teal-500/30 bg-teal-500/5";
  const labelClass = color === "emerald" ? "text-emerald-400" : "text-teal-400";

  const updateFilter = (idx: number, patch: Partial<WonderFilter>) => {
    onChange(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeFilter = (idx: number) => {
    if (filters.length <= 1) {
      onChange([emptyFilter()]);
      return;
    }
    onChange(filters.filter((_, i) => i !== idx));
  };

  const addFilter = () => {
    onChange([...filters, emptyFilter()]);
  };

  return (
    <div className={`rounded-2xl border ${accent} p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <label className={`text-[10px] ${labelClass} font-bold block`}>{title}</label>
        <button
          type="button"
          onClick={addFilter}
          className="text-[10px] text-white/60 hover:text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
        >
          + OR group
        </button>
      </div>

      {filters.map((filter, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-semibold">
              Group {idx + 1} {idx > 0 ? "(OR)" : ""}
            </span>
            <button
              type="button"
              onClick={() => removeFilter(idx)}
              className="text-rose-400/70 hover:text-rose-300 p-0.5 cursor-pointer"
              title="ลบ group"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          <FilterFieldEditor
            field="categories"
            label="Categories"
            values={filter.categories ?? []}
            onChange={(v) => updateFilter(idx, { categories: v })}
            categoryTree={categoryTree}
          />
          <FilterFieldEditor
            field="subCategories"
            label="Sub Categories"
            values={filter.subCategories ?? []}
            onChange={(v) => updateFilter(idx, { subCategories: v })}
            categoryTree={categoryTree}
          />
          <FilterFieldEditor
            field="brands"
            label="Brands"
            values={filter.brands ?? []}
            onChange={(v) => updateFilter(idx, { brands: v })}
            categoryTree={categoryTree}
          />
          <FilterFieldEditor
            field="customerCodes"
            label="Customer Codes"
            values={filter.customerCodes ?? []}
            onChange={(v) => updateFilter(idx, { customerCodes: v })}
            categoryTree={categoryTree}
          />
          <FilterFieldEditor
            field="productNames"
            label="Product Names"
            values={filter.productNames ?? []}
            onChange={(v) => updateFilter(idx, { productNames: v })}
            categoryTree={categoryTree}
            isLong
          />
          <FilterFieldEditor
            field="models"
            label="Models"
            values={filter.models ?? []}
            onChange={(v) => updateFilter(idx, { models: v })}
            categoryTree={categoryTree}
          />
          <FilterFieldEditor
            field="docTypes"
            label="Doc Types"
            values={filter.docTypes ?? []}
            onChange={(v) => updateFilter(idx, { docTypes: v })}
            categoryTree={categoryTree}
          />

          <div className="flex items-center gap-2 pt-1">
            <label className="text-[10px] text-white/50">Product Type:</label>
            <select
              value={
                filter.includeNonInventory === true
                  ? "all"
                  : filter.includeNonInventory === false
                    ? "inventory"
                    : "all"
              }
              onChange={(e) => {
                const val = e.target.value;
                updateFilter(idx, {
                  includeNonInventory: val === "all" ? undefined : val === "inventory",
                });
              }}
              className="text-[10px] bg-white/5 border border-white/10 text-white rounded-md px-2 py-1 outline-none"
            >
              <option value="all" className="text-gray-900">
                All
              </option>
              <option value="inventory" className="text-gray-900">
                Inventory only
              </option>
            </select>
          </div>
        </div>
      ))}

      {filters.length === 0 && (
        <div className="text-[10px] text-white/40 italic">ยังไม่มี filter (จะนับทุก row)</div>
      )}
    </div>
  );
}

function FilterFieldEditor({
  field,
  label,
  values,
  onChange,
  categoryTree,
  isLong,
}: {
  field: keyof WonderFilter;
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  categoryTree: Map<string, Set<string>>;
  isLong?: boolean;
}) {
  const [input, setInput] = useState("");

  const addValue = () => {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) {
      setInput("");
      return;
    }
    onChange([...values, v]);
    setInput("");
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  return (
    <div>
      <div className="text-[10px] text-white/50 mb-0.5">{label}</div>
      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1 mb-1">
        {values.length === 0 ? (
          <span className="text-[10px] text-white/30 italic">—</span>
        ) : (
          values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-[10px] bg-white/10 text-white/85 px-2 py-0.5 rounded-md border border-white/10"
            >
              <span className={isLong ? "max-w-[200px] truncate" : ""}>{v}</span>
              <button
                type="button"
                onClick={() => removeValue(v)}
                className="hover:text-rose-300 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={`+ เพิ่ม ${label} (กด Enter)`}
          className="flex-1 text-[10px] bg-white/5 border border-white/10 text-white rounded-md px-2 py-1 outline-none focus:border-white/30 placeholder:text-white/25"
        />
        <button
          type="button"
          onClick={addValue}
          className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-2 py-1 rounded-md cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

function deriveLabel(filters: WonderFilter[], _calcType: WonderCalcType): string {
  const first = filters[0];
  if (!first) return "";
  const parts: string[] = [];
  FILTER_FIELDS.forEach((f) => {
    const list = first[f.key] as string[] | undefined;
    if (list && list.length > 0) {
      parts.push(`${f.label}: ${list.slice(0, 3).join(", ")}${list.length > 3 ? "…" : ""}`);
    }
  });
  return parts.join(" / ") || "ทุก row";
}
