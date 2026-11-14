import React from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { ACCENT_PRESETS, secondaryPreview } from "../../lib/accent";

/** ปุ่มเลือกสีหลักของธีม — สีรองระบบเลือกให้อัตโนมัติ */
export function AccentPicker({ value, onChange }: { value: string | null; onChange: (hex: string | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const current = value ?? "#10b981";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="เลือกสีหลักของธีม"
        className="p-2 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
      >
        <Palette className="w-5 h-5" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-[#0c3123] p-4 flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-white">สีหลัก</div>
            <div className="grid grid-cols-8 gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange(c)}
                  aria-label={c}
                  className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center"
                  style={{ background: c }}
                >
                  {value?.toLowerCase() === c ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="color"
                value={current}
                onChange={(e) => onChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-white/15 bg-transparent cursor-pointer"
              />
              เลือกสีเอง
              <span className="ml-auto font-mono text-white/50">{current}</span>
            </label>
            <div className="flex items-center gap-2 text-[12px] text-white/60">
              <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: current }} />
              สีหลัก
              <span className="w-4 h-4 rounded-full border border-white/20 ml-3" style={{ background: secondaryPreview(current) }} />
              สีรอง (อัตโนมัติ)
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 self-start text-[12px] text-white/60 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ใช้สีเริ่มต้น
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
