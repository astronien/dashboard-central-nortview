import { useState, useMemo, type FormEvent } from "react";
import { User, Home as HomeIcon } from "lucide-react";
import {
  emptyItemFilter,
  PRESET_COLORS,
  type ItemFilter,
  type Preset,
  type PresetCalcType,
  type PresetColor,
} from "../../lib/presetTypes";
import type { RawRow } from "../../lib/salesAggregations";
import CategoryPicker from "./CategoryPicker";

interface KpiPresetBuilderProps {
  allLines: RawRow[];
  catDailyOptions?: string[];
  onSave: (preset: Omit<Preset, "id">) => void;
  onCancel: () => void;
  initialPreset?: Preset;
}

const readStr = (row: RawRow, ...keys: string[]): string => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
};

function describeFilters(filters: ItemFilter[]): string {
  if (filters.length === 0) return "ยังไม่ได้เลือก";
  return filters
    .map((f) => {
      const parts: string[] = [];
      if (f.categories.length) parts.push(f.categories.join("/"));
      if (f.subCategories.length) parts.push(f.subCategories.join("/"));
      if (f.models.length) parts.push(f.models.join("/"));
      if (f.brands.length) parts.push("Brand: " + f.brands.join("/"));
      if (f.customerCodes.length) parts.push("Customer: " + f.customerCodes.join("/"));
      if (f.productNames.length)
        parts.push(
          "Product: " + f.productNames.slice(0, 2).join("/") + (f.productNames.length > 2 ? "..." : ""),
        );
      if (f.docTypes.length) parts.push("DocType: " + f.docTypes.join("/"));
      return parts.join(" > ") || "ทุกสินค้า";
    })
    .join("  หรือ  ");
}

const colorBgClass: Record<PresetColor, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  purple: "bg-purple-500",
  coral: "bg-orange-500",
};

export default function KpiPresetBuilder({
  allLines,
  catDailyOptions: catDailyOptionsProp,
  onSave,
  onCancel,
  initialPreset,
}: KpiPresetBuilderProps) {
  const [name, setName] = useState(initialPreset?.name || "");
  const [calcType, setCalcType] = useState<PresetCalcType>(
    initialPreset?.calcType || "attach",
  );
  const [catDailyFilter, setCatDailyFilter] = useState(initialPreset?.catDailyFilter || "");
  const [catDailyFilterB, setCatDailyFilterB] = useState(
    initialPreset?.catDailyFilterB || "",
  );
  const [labelA, setLabelA] = useState(initialPreset?.labelA || "");
  const [labelB, setLabelB] = useState(initialPreset?.labelB || "");

  const catDailyOptions = useMemo(() => {
    if (catDailyOptionsProp && catDailyOptionsProp.length > 0) return catDailyOptionsProp;
    const seen = new Set<string>();
    allLines.forEach((li) => {
      const v = readStr(li, "catDaily", "CAT Daily");
      if (v) seen.add(v);
    });
    return Array.from(seen).sort();
  }, [allLines, catDailyOptionsProp]);

  const [filtersA, setFiltersA] = useState<ItemFilter[]>(
    initialPreset?.filtersA || (initialPreset?.filterA ? [initialPreset.filterA] : [emptyItemFilter()]),
  );
  const [filtersB, setFiltersB] = useState<ItemFilter[]>(
    initialPreset?.filtersB || (initialPreset?.filterB ? [initialPreset.filterB] : [emptyItemFilter()]),
  );
  const [color, setColor] = useState<PresetColor>(initialPreset?.color || "green");
  const [targetPercent, setTargetPercent] = useState<number>(initialPreset?.targetPercent ?? 0);
  const [showInStaffProfile, setShowInStaffProfile] = useState<boolean>(initialPreset?.showInStaffProfile ?? false);
  const [showInBranchOverview, setShowInBranchOverview] = useState<boolean>(initialPreset?.showInBranchOverview ?? false);

  const addFilterA = () => setFiltersA([...filtersA, emptyItemFilter()]);
  const removeFilterA = (idx: number) => setFiltersA(filtersA.filter((_, i) => i !== idx));
  const updateFilterA = (idx: number, f: ItemFilter) =>
    setFiltersA(filtersA.map((x, i) => (i === idx ? f : x)));

  const addFilterB = () => setFiltersB([...filtersB, emptyItemFilter()]);
  const removeFilterB = (idx: number) => setFiltersB(filtersB.filter((_, i) => i !== idx));
  const updateFilterB = (idx: number, f: ItemFilter) =>
    setFiltersB(filtersB.map((x, i) => (i === idx ? f : x)));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("กรุณาใส่ชื่อ Preset");
      return;
    }
    if (
      (calcType === "attach" || calcType === "bahtRate") &&
      (filtersB.length === 0 || filtersB.every((f) => f.categories.length === 0))
    ) {
      alert("กรุณาเลือกอย่างน้อย 1 เงื่อนไขสำหรับ Unit B (ตัวหาร)");
      return;
    }
    const isCatMode = calcType === "catBaht" || calcType === "catQty" || calcType === "catAttach";
    const isTradeIn = calcType === "tradeIn";
    // tradeIn needs no line-item filters — the value comes from the branch
    // trade-in count and iPhone units.
    if (isTradeIn) {
      onSave({
        name: name.trim(),
        calcType,
        labelA: "จำนวนที่ตก (Trade In)",
        labelB: "iPhone ที่ขายได้",
        filtersA: [],
        filtersB: [],
        color,
        targetPercent: targetPercent > 0 ? targetPercent : undefined,
        showInStaffProfile,
        showInBranchOverview,
      });
      return;
    }
    onSave({
      name: name.trim(),
      calcType,
      labelA: isCatMode ? catDailyFilter || "ทุกหมวด" : labelA.trim() || describeFilters(filtersA),
      labelB:
        calcType === "unit" || calcType === "baht" || calcType === "catBaht" || calcType === "catQty"
          ? ""
          : isCatMode
            ? catDailyFilterB || "ทุกหมวด"
            : labelB.trim() || describeFilters(filtersB),
      filtersA: isCatMode ? [] : filtersA,
      filtersB: isCatMode ? [] : filtersB,
      color,
      targetPercent: targetPercent > 0 ? targetPercent : undefined,
      showInStaffProfile,
      showInBranchOverview,
      ...(isCatMode
        ? { catDailyFilter, ...(calcType === "catAttach" ? { catDailyFilterB } : {}) }
        : {}),
    });
  };

  const descA = describeFilters(filtersA);
  const descB = describeFilters(filtersB);

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 rounded-2xl p-4 space-y-4 border border-white/10"
    >
      <div>
        <label className="text-sm font-medium text-white/80 block mb-1">ชื่อ Preset</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น Attach Mac to iPhone"
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">
          ประเภทการแสดงผล
        </label>
        <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {(
            [
              ["attach", "Attach Rate (%)"],
              ["bahtRate", "Attach Rate (฿) บาทหารบาท"],
              ["unit", "แสดงผลทางจำนวน (Unit)"],
              ["baht", "ยอดขายเป็นบาท (Baht)"],
              ["catBaht", "ยอดบาท (CatMaster)"],
              ["catQty", "ยอดจำนวน (CatMaster)"],
              ["catAttach", "ATT CatMaster (จำนวน A ÷ จำนวน B)"],
              ["tradeIn", "Trade In / iPhone (%)"],
            ] as [PresetCalcType, string][]
          ).map(([key, label], idx) => {
            const isCat = key.startsWith("cat");
            const span = key === "catAttach" || key === "tradeIn" ? "col-span-2" : "";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCalcType(key)}
                className={`${span} py-1.5 text-sm font-medium rounded-md transition-colors ${
                  calcType === key
                    ? isCat
                      ? "bg-white/10 shadow-sm text-amber-300"
                      : "bg-white/10 shadow-sm text-emerald-300"
                    : isCat
                      ? "text-amber-200/70 hover:text-amber-200"
                      : "text-emerald-200/70 hover:text-emerald-200"
                } ${idx >= 6 ? "col-span-2" : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {(calcType === "catBaht" || calcType === "catQty" || calcType === "catAttach") && (
        <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-amber-200 block mb-1">
              {calcType === "catAttach" ? "หมวด A — ตัวตั้ง (CatMaster)" : "หมวดหมู่ CatMaster (catDaily)"}
            </label>
            <select
              value={catDailyFilter}
              onChange={(e) => setCatDailyFilter(e.target.value)}
              className={inputClass}
            >
              <option value="" className="bg-[#1b3a2c]">— ทุกหมวด (ไม่กรอง) —</option>
              {catDailyOptions.map((cat) => (
                <option key={cat} value={cat} className="bg-[#1b3a2c]">
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {calcType === "catAttach" && (
            <div>
              <label className="text-sm font-semibold text-purple-200 block mb-1">
                หมวด B — ตัวหาร (CatMaster)
              </label>
              <select
                value={catDailyFilterB}
                onChange={(e) => setCatDailyFilterB(e.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-[#1b3a2c]">
                  — ทุกหมวด (ไม่กรอง) —
                </option>
                {catDailyOptions.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1b3a2c]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
          {calcType !== "catAttach" && (
            <p className="text-xs text-amber-200/70">
              เลือกหมวด catDaily จาก CatMaster เพื่อดึงยอด
              {calcType === "catBaht" ? "บาท" : "จำนวน"}รวมของหมวดนั้น
            </p>
          )}
        </div>
      )}

      {(calcType === "attach" || calcType === "bahtRate") && (
        <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-500/5">
          <h4 className="text-sm font-semibold text-purple-200 mb-2">
            Unit B — ตัวหาร (สินค้าหลักที่ใช้วัด)
          </h4>
          <div className="space-y-3">
            {filtersB.map((filter, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg p-3 bg-white/5 relative">
                <span className="text-xs text-emerald-400 font-bold absolute top-2 right-2">
                  เงื่อนไข B{idx + 1}
                </span>
                <CategoryPicker
                  allLines={allLines}
                  value={filter}
                  onChange={(f) => updateFilterB(idx, f)}
                />
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeFilterB(idx)}
                    className="text-xs text-rose-400 mt-2 hover:underline"
                  >
                    ลบเงื่อนไขนี้
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addFilterB}
              className="text-sm text-purple-300 hover:underline"
            >
              + เพิ่มเงื่อนไข B (OR)
            </button>
          </div>
          <input
            type="text"
            value={labelB}
            onChange={(e) => setLabelB(e.target.value)}
            placeholder="ชื่อแสดง เช่น iPhone ทุกรุ่น"
            className={inputClass + " mt-3"}
          />
        </div>
      )}

      {calcType === "tradeIn" && (
        <div className="border border-sky-500/30 rounded-lg p-3 bg-sky-500/5 space-y-1">
          <h4 className="text-sm font-semibold text-sky-200">Trade In / iPhone</h4>
          <p className="text-xs text-sky-200/80">
            คำนวณ = จำนวนที่ตก (สิ้นสุดประมูล) ÷ iPhone ที่ขายได้ (ชิ้น) × 100
            <br />
            ดึงจำนวนเทรดจาก Trade API ของสาขาโดยอัตโนมัติ — ไม่ต้องตั้งเงื่อนไขสินค้า
            ตั้งเป้าหมาย (%) ด้านล่างเพื่อวัด Ach%
          </p>
        </div>
      )}

      {!(calcType === "catBaht" || calcType === "catQty" || calcType === "catAttach" || calcType === "tradeIn") && (
        <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/5">
          <h4 className="text-sm font-semibold text-emerald-200 mb-2">
            {calcType === "attach"
              ? "Unit A — ตัวตั้ง (สินค้าที่ต้องการวัด Attach)"
              : "เงื่อนไขสินค้า (วัดเฉพาะจำนวน)"}
          </h4>
          <div className="space-y-3">
            {filtersA.map((filter, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg p-3 bg-white/5 relative">
                <span className="text-xs text-emerald-400 font-bold absolute top-2 right-2">
                  เงื่อนไข A{idx + 1}
                </span>
                <CategoryPicker
                  allLines={allLines}
                  value={filter}
                  onChange={(f) => updateFilterA(idx, f)}
                />
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removeFilterA(idx)}
                    className="text-xs text-rose-400 mt-2 hover:underline"
                  >
                    ลบเงื่อนไขนี้
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addFilterA}
              className="text-sm text-emerald-300 hover:underline"
            >
              + เพิ่มเงื่อนไข A (OR)
            </button>
          </div>
          <input
            type="text"
            value={labelA}
            onChange={(e) => setLabelA(e.target.value)}
            placeholder="ชื่อแสดง เช่น Mac"
            className={inputClass + " mt-3"}
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">สี</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${colorBgClass[c]} ${
                color === c ? "border-white scale-110" : "border-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-3 bg-white/5 space-y-3">
        <p className="text-xs font-semibold text-white/80">การแสดงผล</p>

        <div>
          <label className="text-xs text-white/60 block mb-1">เป้าหมาย (%) — ใช้คำนวณ Ach% ใน Staff Profile</label>
          <input
            type="number"
            min={0}
            step={1}
            value={targetPercent || ""}
            onChange={(e) => setTargetPercent(e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="เช่น 60"
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowInStaffProfile(!showInStaffProfile)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors ${
            showInStaffProfile
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="text-sm">แสดงใน Staff Profile (7 Wonders)</span>
          </div>
          <div
            className={`w-9 h-5 rounded-full relative transition-colors ${
              showInStaffProfile ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showInStaffProfile ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowInBranchOverview(!showInBranchOverview)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors ${
            showInBranchOverview
              ? "bg-amber-500/20 border-amber-500/40 text-amber-100"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <HomeIcon className="w-4 h-4" />
            <span className="text-sm">แสดงในหน้ารวมสาขา (Branch Overview)</span>
          </div>
          <div
            className={`w-9 h-5 rounded-full relative transition-colors ${
              showInBranchOverview ? "bg-amber-500" : "bg-white/20"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showInBranchOverview ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>
      </div>

      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <p className="text-xs text-emerald-400 font-bold mb-1">Preview:</p>
        {calcType === "attach" ? (
          <>
            <p className="text-sm text-white/80">
              Attach Rate = จำนวนชิ้น <strong className="text-emerald-300">{labelA || descA}</strong> ทั้งหมด
              <br />
              <span className="ml-16">÷ จำนวนชิ้น <strong className="text-purple-300">{labelB || descB}</strong> ทั้งหมด</span>
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-2">
              ตัวอย่าง: Mac 3 ชิ้น ÷ iPhone 10 ชิ้น = 30%
            </p>
          </>
        ) : calcType === "bahtRate" ? (
          <>
            <p className="text-sm text-white/80">
              Attach Rate (฿) = ยอดขาย <strong className="text-emerald-300">{labelA || descA}</strong> (บาท)
              <br />
              <span className="ml-24">÷ ยอดขาย <strong className="text-purple-300">{labelB || descB}</strong> (บาท)</span>
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-2">
              ตัวอย่าง: 3rd Party 2M ÷ iPhone 10M = 20%
            </p>
          </>
        ) : calcType === "unit" ? (
          <>
            <p className="text-sm text-white/80">
              แสดงยอดจำนวนที่ขายได้ของ <strong className="text-emerald-300">{labelA || descA}</strong>
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-2">
              ตัวอย่าง: แสดงจำนวน Mac ที่ขายได้ทั้งหมด โดยไม่เอาไปหารกับสินค้าอื่น
            </p>
          </>
        ) : calcType === "catBaht" ? (
          <>
            <p className="text-sm text-white/80">
              ยอดขายรวม (฿) ของ catDaily = <strong className="text-amber-300">{catDailyFilter || "ทุกหมวด"}</strong>
            </p>
            <p className="text-xs text-amber-200/80 font-bold mt-2">
              ดึงยอดจาก totalPrice ทุก line item ที่ catDaily ตรงกัน (Inventory Item)
            </p>
          </>
        ) : calcType === "catQty" ? (
          <>
            <p className="text-sm text-white/80">
              ยอดจำนวน (ชิ้น) ของ catDaily = <strong className="text-amber-300">{catDailyFilter || "ทุกหมวด"}</strong>
            </p>
            <p className="text-xs text-amber-200/80 font-bold mt-2">
              นับจำนวนชิ้นทุก line item ที่ catDaily ตรงกัน (Inventory Item)
            </p>
          </>
        ) : calcType === "catAttach" ? (
          <>
            <p className="text-sm text-white/80">
              ATT = จำนวน <strong className="text-amber-300">{catDailyFilter || "ทุกหมวด"}</strong>
              {" ÷ "}
              จำนวน <strong className="text-purple-300">{catDailyFilterB || "ทุกหมวด"}</strong> × 100%
            </p>
            <p className="text-xs text-amber-200/80 font-bold mt-2">
              คำนวณ Attach Rate โดยใช้ catDaily จาก CatMaster แทนการเลือก filter แบบปกติ
            </p>
          </>
        ) : calcType === "tradeIn" ? (
          <>
            <p className="text-sm text-white/80">
              Trade In = <strong className="text-sky-300">จำนวนที่ตก</strong>
              {" ÷ "}
              <strong className="text-purple-300">iPhone ที่ขายได้</strong> × 100%
            </p>
            <p className="text-xs text-sky-200/80 font-bold mt-2">
              ตัวอย่าง: เทรดที่ตก 21 ÷ iPhone 100 ชิ้น = 21% (เป้า {targetPercent || 20}%)
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-white/80">
              แสดงยอดขายรวมเป็นบาท (฿) ของ <strong className="text-emerald-300">{labelA || descA}</strong>
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-2">
              ตัวอย่าง: แสดงยอดขายรวม (Total Price) ของสินค้า Mac จากบิลที่เลือกทั้งหมด
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#0a1f17] font-medium px-4 py-2 rounded-lg transition"
        >
          บันทึก Preset
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white/10 text-white/80 rounded-lg font-medium hover:bg-white/20 transition"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
