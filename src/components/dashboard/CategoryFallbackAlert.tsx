import React, { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type {
  CategoryChoice,
  CategoryOverrides,
  UnmappedCategoryPair,
} from "../../lib/categoryFallback";

const CHOICE_LABEL: Record<CategoryChoice, string> = {
  BTB: "BTB",
  "BTB(Apple)": "BTB(Apple)",
  Other: "อื่นๆ",
};
const CHOICES: CategoryChoice[] = ["BTB", "BTB(Apple)", "Other"];

const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

/** ค่าเริ่มต้นในตัวเลือก: ที่เลือกไว้ > ที่ระบบเดาจาก Category > ยี่ห้อ (Apple → BTB(Apple)) */
const initialChoice = (p: UnmappedCategoryPair, overrides: CategoryOverrides): CategoryChoice =>
  overrides[p.key] ?? p.suggestion ?? (p.appleShare >= 0.5 ? "BTB(Apple)" : "BTB");

/**
 * แจ้งเตือนหมวดย่อยใหม่ที่ Category Master ยังไม่มี + ให้เลือกว่าเข้า
 * BTB / BTB(Apple) / อื่นๆ (บันทึกแชร์ทุกเครื่อง)
 */
export function CategoryFallbackAlert({
  pairs,
  overrides,
  onSave,
  showManage = false,
}: {
  pairs: UnmappedCategoryPair[];
  overrides: CategoryOverrides;
  onSave: (changes: CategoryOverrides) => void;
  /** โชว์ปุ่มแก้หมวดที่เลือกไว้ แม้ไม่มีรายการค้าง (ใช้ในหน้า Settings) */
  showManage?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryOverrides>({});
  const [showDecided, setShowDecided] = useState(false);

  const pending = useMemo(() => pairs.filter((p) => !overrides[p.key]), [pairs, overrides]);
  const decided = useMemo(() => pairs.filter((p) => overrides[p.key]), [pairs, overrides]);
  const pendingRevenue = pending.reduce((s, p) => s + p.revenue, 0);

  if (!pairs.length) return null;

  const openModal = () => {
    const d: CategoryOverrides = {};
    pairs.forEach((p) => (d[p.key] = initialChoice(p, overrides)));
    setDraft(d);
    setShowDecided(pending.length === 0);
    setOpen(true);
  };

  const save = () => {
    const changes: CategoryOverrides = {};
    const visible = showDecided ? pairs : pending;
    visible.forEach((p) => {
      if (draft[p.key]) changes[p.key] = draft[p.key];
    });
    onSave(changes);
    setOpen(false);
  };

  const renderRow = (p: UnmappedCategoryPair) => {
    const chosen = overrides[p.key];
    const current = chosen ?? p.suggestion;
    return (
      <tr key={p.key} className="border-t border-slate-200 align-top">
        <td className="py-2 pr-2">
          <div className="font-semibold text-slate-800">{p.subCategory || "(ไม่มี Sub Category)"}</div>
          <div className="text-[11px] text-slate-500">{p.category}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {p.brands
              .slice(0, 3)
              .map((b) => `${/^apple$/i.test(b.brand) ? "🍎 " : ""}${b.brand} ${fmtBaht(b.revenue)}`)
              .join(" · ")}
          </div>
        </td>
        <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">
          <div className="font-semibold text-slate-800">{fmtBaht(p.revenue)}</div>
          <div className="text-[11px] text-slate-500">{p.rows} แถว</div>
        </td>
        <td className="py-2 pr-2 text-[11px] text-slate-600">
          {chosen ? (
            <span className="text-emerald-700 font-semibold">เลือกไว้: {CHOICE_LABEL[chosen]}</span>
          ) : current ? (
            <span>
              ระบบจัดให้ <b>{CHOICE_LABEL[current]}</b>
              <br />
              (ตาม Sub อื่น {p.familySize} รายการใน Category นี้)
            </span>
          ) : (
            <span className="text-amber-700">
              ยังไม่จัด → อยู่ <b>อื่นๆ</b>
            </span>
          )}
        </td>
        <td className="py-2">
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            {CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, [p.key]: c }))}
                className={`px-2.5 py-1 text-[11px] font-semibold border-l border-slate-300 first:border-l-0 ${
                  draft[p.key] === c ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {CHOICE_LABEL[c]}
              </button>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      {pending.length > 0 ? (
        <button
          type="button"
          onClick={openModal}
          className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 max-w-[calc(100vw-2rem)] rounded-full bg-amber-500 text-slate-900 px-4 py-2 text-xs font-semibold shadow-2xl hover:bg-amber-400"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">
            พบหมวดย่อยใหม่ {pending.length} รายการที่ Category Master ยังไม่มี ({fmtBaht(pendingRevenue)}) — กดเพื่อเลือกหมวด
          </span>
        </button>
      ) : showManage && decided.length > 0 ? (
        <button
          type="button"
          onClick={openModal}
          className="fixed bottom-4 left-4 z-[60] rounded-full bg-white/15 border border-white/20 text-white px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md hover:bg-white/25"
        >
          หมวดย่อยที่เลือกเอง {decided.length} รายการ — แก้ไข
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white text-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-200">
              <div>
                <div className="font-bold">หมวดย่อยใหม่ที่ Category Master ยังไม่มี</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  เลือกว่าแต่ละหมวดย่อยควรนับเข้า BTB / BTB(Apple) หรือให้อยู่ในอื่นๆ — บันทึกแล้วใช้กับทุกเครื่อง
                  (ถ้า Category Master เดือนใหม่มีหมวดนี้แล้ว ระบบจะยึดตาม master)
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] text-slate-500">
                    <th className="py-2 pr-2 font-medium">หมวดย่อย / ยี่ห้อ</th>
                    <th className="py-2 pr-2 font-medium text-right">ยอด (Current)</th>
                    <th className="py-2 pr-2 font-medium">ตอนนี้</th>
                    <th className="py-2 font-medium">เข้าหมวด</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(renderRow)}
                  {showDecided ? decided.map(renderRow) : null}
                </tbody>
              </table>
              {decided.length > 0 && !showDecided ? (
                <button
                  type="button"
                  onClick={() => setShowDecided(true)}
                  className="text-[11px] text-emerald-700 underline my-2"
                >
                  แสดงที่เลือกไว้แล้ว {decided.length} รายการ
                </button>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={save}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
