import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Smartphone } from "lucide-react";
import {
  iphoneGenerationOf,
  shortIphoneModel,
  type IphoneModelOption,
} from "../../lib/iphoneModels";

/**
 * ปุ่มหัวหน้าจอ: ติ๊กเลือกรุ่น iPhone ที่ "ไม่นับยอด" (ตัดเฉพาะตัวเครื่อง
 * ออกจากการคำนวณทุกตาราง — สินค้าแนบยังนับอยู่)
 */
export function IphoneModelExcludePicker({
  options,
  selected,
  onChange,
}: {
  options: IphoneModelOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // รุ่นที่ติ๊กไว้แต่ไม่มีในไฟล์ตอนนี้ก็ยังโชว์ ให้เอาติ๊กออกได้
  const groups = useMemo(() => {
    const all: IphoneModelOption[] = [...options];
    const known = new Set(options.map((o) => o.model));
    selected.forEach((m) => {
      if (!known.has(m)) all.push({ model: m, generation: iphoneGenerationOf(m), units: 0 });
    });
    const byGen = new Map<string, IphoneModelOption[]>();
    all.forEach((o) => byGen.set(o.generation, [...(byGen.get(o.generation) ?? []), o]));
    const rank = (g: string) => (/^\d+$/.test(g) ? Number(g) : -1);
    return [...byGen.entries()].sort((a, b) => rank(b[0]) - rank(a[0]) || a[0].localeCompare(b[0]));
  }, [options, selected]);

  const toggle = (models: string[], on: boolean) => {
    const next = new Set<string>(selectedSet);
    models.forEach((m) => (on ? next.add(m) : next.delete(m)));
    onChange([...next]);
  };

  const active = selected.length > 0;
  const label = !active
    ? "ตัด iPhone"
    : selected.length <= 2
      ? `ตัด iPhone ${selected.map(shortIphoneModel).join(", ")}`
      : `ตัด iPhone ${selected.length} รุ่น`;

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="เลือกรุ่น iPhone ที่ไม่นับยอด (ตัดตัวเครื่องออกจากการคำนวณทั้งหมด)"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold backdrop-blur-md shadow-xl transition-colors ${
          active
            ? "bg-amber-500/25 border-amber-400/50 text-amber-100 hover:bg-amber-500/35"
            : "bg-white/10 border-white/10 text-white/60 hover:text-white hover:bg-white/15"
        }`}
      >
        <Smartphone className="w-4 h-4" />
        <span className="max-w-[180px] truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl bg-[#0c3123] border border-white/15 shadow-2xl p-3 text-white z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold">ไม่นับยอด iPhone รุ่น…</div>
            {active ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-emerald-200 hover:text-white underline"
              >
                นับทุกรุ่น
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-white/50 mb-2 leading-snug">
            ตัดเฉพาะตัวเครื่องออกจากทุกตาราง · สินค้าแนบ (เคส ฟิล์ม COVER+) ยังนับ
            แต่แยกโชว์เป็น “+N (ตัด)” ในตาราง Attach
          </p>
          {groups.length === 0 ? (
            <div className="text-[11px] text-white/50 py-2">ยังไม่มีข้อมูลยอดขาย iPhone</div>
          ) : (
            groups.map(([gen, models]) => {
              const all = models.every((m) => selectedSet.has(m.model));
              const some = !all && models.some((m) => selectedSet.has(m.model));
              return (
                <div key={gen} className="border-t border-white/10 first:border-t-0 py-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={all}
                      ref={(el) => {
                        if (el) el.indeterminate = some;
                      }}
                      onChange={(e) => toggle(models.map((m) => m.model), e.target.checked)}
                      className="accent-amber-400"
                    />
                    {/^\d+$/.test(gen) ? `iPhone ${gen} ทั้งตระกูล` : `iPhone ${shortIphoneModel(`IPHONE ${gen}`)}`}
                  </label>
                  {models.length > 1 || /^\d+$/.test(gen)
                    ? models.map((m) => (
                        <label
                          key={m.model}
                          className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer pl-5 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(m.model)}
                            onChange={(e) => toggle([m.model], e.target.checked)}
                            className="accent-amber-400"
                          />
                          <span className="flex-1">iPhone {shortIphoneModel(m.model)}</span>
                          <span className="text-white/40 tabular-nums">{m.units ? `${m.units} เครื่อง` : "—"}</span>
                        </label>
                      ))
                    : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
