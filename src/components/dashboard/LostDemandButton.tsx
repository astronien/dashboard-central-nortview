import React from "react";
import { CheckCircle2, Loader2, Minus, PackageX, Plus, X } from "lucide-react";
import { addLostDemand } from "../../lib/lostDemand";

/**
 * ปุ่ม "ลูกค้าถามหาแต่ไม่มี" — พนักงานกดบันทึกเร็วๆ ตอนลูกค้าหาสินค้าที่ไม่มีของ
 * suggestions = ชื่อสินค้าจากไฟล์สต็อก/ยอดขาย (ช่วยให้ชื่อตรงกัน รวมยอดได้)
 */
export function LostDemandButton({
  branch,
  staff,
  suggestions,
  onSaved,
}: {
  branch: string;
  staff?: string;
  suggestions: string[];
  onSaved?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [product, setProduct] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const listId = React.useId();

  const close = () => {
    setOpen(false);
    setMsg(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) {
      setMsg({ ok: false, text: "ใส่ชื่อสินค้าก่อน" });
      return;
    }
    setBusy(true);
    const r = await addLostDemand(branch, { product: product.trim(), qty, note: note.trim() || undefined, staff });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: "บันทึกแล้ว" });
      setProduct("");
      setQty(1);
      setNote("");
      onSaved?.();
      window.setTimeout(close, 900);
    } else {
      setMsg({ ok: false, text: r.error ?? "บันทึกไม่สำเร็จ" });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-[13px] font-semibold text-white/85 hover:bg-white/10 transition-colors"
      >
        <PackageX className="w-4 h-4" />
        ลูกค้าถามหาแต่ไม่มีของ
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={close}>
          <form
            onSubmit={(e) => void submit(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c3123] p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">ลูกค้าถามหาแต่ไม่มีของ</h3>
                <p className="text-[12px] text-white/60">ใช้เป็นหลักฐานขอเพิ่มการจัดสรรจากคลัง</p>
              </div>
              <button type="button" onClick={close} aria-label="ปิด" className="p-1 rounded-md text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="flex flex-col gap-1 text-[12px] text-white/70">
              สินค้า (รุ่น / สี / ความจุ)
              <input
                autoFocus
                list={listId}
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="iPhone 17 Pro 256GB Cosmic Orange"
                className="rounded-lg border border-white/15 bg-[#051710] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/40"
              />
              <datalist id={listId}>
                {suggestions.slice(0, 400).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <div className="flex items-center gap-3 text-[12px] text-white/70">
              จำนวน
              <div className="inline-flex items-center rounded-lg border border-white/15">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 text-white/70" aria-label="ลด">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-[14px] font-semibold text-white tabular-nums">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} className="p-2 text-white/70" aria-label="เพิ่ม">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-[12px] text-white/70">
              หมายเหตุ (ไม่บังคับ)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ลูกค้ารอได้ 3 วัน / ซื้อสีอื่นแทน / เดินออกไป"
                className="rounded-lg border border-white/15 bg-[#051710] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/40"
              />
            </label>
            {msg ? (
              <p className={`flex items-center gap-1.5 text-[13px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : null}
                {msg.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-[14px] font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              บันทึก
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
