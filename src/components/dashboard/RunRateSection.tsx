import React from "react";
import { Gauge, Package, Zap, Snail, Info } from "lucide-react";
import type { RunRateResult, RunRateRow } from "../../lib/runRate";

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toFixed(1);

function RunRateTable({
  rows,
  hasStock,
  showSub,
}: {
  rows: RunRateRow[];
  hasStock: boolean;
  showSub?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/80">
            <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[160px]">รายการ</th>
            <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">ขายแล้ว</th>
            <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">เฉลี่ย/วัน</th>
            <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">คาดสิ้นเดือน</th>
            <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">สัดส่วน</th>
            {hasStock ? (
              <>
                <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">สต็อก</th>
                <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">ขายหมดใน</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.key}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-2 px-3">
                <div className="font-medium text-white truncate max-w-[280px]">{r.label}</div>
                {showSub && r.sub ? (
                  <div className="text-[9px] text-white/40">{r.sub}</div>
                ) : null}
              </td>
              <td className="py-2 px-3 text-right font-mono text-white tabular-nums">{fmt(r.units)}</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-300 tabular-nums">
                {fmt1(r.unitsPerDay)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(r.projectedUnits)}</td>
              <td className="py-2 px-3 text-right text-white/60 tabular-nums">{r.sharePct.toFixed(1)}%</td>
              {hasStock ? (
                <>
                  <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">
                    {r.stock != null ? fmt(r.stock) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {r.coverDays == null ? (
                      <span className="text-white/30">—</span>
                    ) : (
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          r.reorderFlag ? "text-rose-400" : r.coverDays <= 30 ? "text-amber-400" : "text-emerald-300"
                        }`}
                      >
                        {Math.round(r.coverDays)} วัน{r.reorderFlag ? " ⚠️" : ""}
                      </span>
                    )}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RunRateSection({ data }: { data?: RunRateResult }) {
  const [showAllProducts, setShowAllProducts] = React.useState(false);

  if (!data || data.categories.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-10 text-center">
        <Gauge className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">
          ยังไม่มีข้อมูลพอสำหรับ Run Rate — กรุณาอัปโหลดไฟล์ Current ที่หน้ารายงาน
        </p>
      </div>
    );
  }

  const hasStock = data.products.some((p) => p.stock != null);
  const fast = data.products.slice(0, 12);
  const slow = [...data.products]
    .filter((p) => p.units > 0)
    .sort((a, b) => a.unitsPerDay - b.unitsPerDay)
    .slice(0, 10);
  const products = showAllProducts ? data.products : fast;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
            <Gauge className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Run Rate — อัตราการขาย</h2>
            <p className="text-[11px] text-white/50">
              ขายเฉลี่ยต่อวัน + คาดการณ์สิ้นเดือน · อ้างอิง {data.daysElapsed}/{data.totalDays} วันของเดือน
            </p>
          </div>
        </div>
        {!hasStock ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100/90">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-300" />
            <span>
              อยากดู "ขายหมดในกี่วัน" และแจ้งเตือนเติมของ (reorder)? ต้องมีข้อมูลสต็อกคงเหลือต่อสินค้า —
              บอกได้ว่าจะ export ไฟล์สต็อก หรือมี API สต็อก เดี๋ยวเปิดคอลัมน์ Stock Cover ให้
            </span>
          </div>
        ) : null}
      </div>

      {/* Category run rate */}
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-white">อัตราการขายรายหมวด</h2>
        </div>
        <RunRateTable rows={data.categories} hasStock={hasStock} />
      </div>

      {/* Fast movers */}
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-white">
              สินค้าขายเร็ว (Top {products.length})
            </h2>
          </div>
          {data.products.length > 12 ? (
            <button
              onClick={() => setShowAllProducts((v) => !v)}
              className="text-[11px] text-amber-300 hover:text-amber-200 font-medium"
            >
              {showAllProducts ? "แสดงเฉพาะ Top 12" : `ดูทั้งหมด (${data.products.length})`}
            </button>
          ) : null}
        </div>
        <RunRateTable rows={products} hasStock={hasStock} showSub />
      </div>

      {/* Slow movers */}
      {slow.length > 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-xl border border-white/10">
              <Snail className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">สินค้าขายช้า</h2>
              <p className="text-[11px] text-white/50">ขายได้น้อยที่สุดต่อวัน — เสี่ยงเงินจม/ค้างสต็อก</p>
            </div>
          </div>
          <RunRateTable rows={slow} hasStock={hasStock} showSub />
        </div>
      ) : null}
    </div>
  );
}
