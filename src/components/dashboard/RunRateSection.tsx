import React from "react";
import {
  Gauge,
  Package,
  Zap,
  Snail,
  Info,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  buildReorderList,
  buildDeadStock,
  type RunRateResult,
  type RunRateRow,
} from "../../lib/runRate";
import { parseStockExcelFile } from "../../lib/stockUpload";
import { saveStock, type StockStatus } from "../../lib/stockApi";

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toFixed(1);
const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

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

/** Stock upload panel — parse an Excel/CSV of stock-on-hand and save it
 *  so the Run Rate cover columns light up. */
function StockUploadPanel({
  branch,
  stockStatus,
  updatedBy,
  onSaved,
}: {
  branch: string;
  stockStatus?: StockStatus;
  updatedBy?: string;
  onSaved?: () => void;
}) {
  const [state, setState] = React.useState<"idle" | "parsing" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState("parsing");
    setMsg("");
    const parsed = await parseStockExcelFile(file);
    if (!parsed.ok) {
      setState("error");
      setMsg(parsed.error ?? "อ่านไฟล์ไม่สำเร็จ");
      return;
    }
    setState("saving");
    setMsg(`พบ ${parsed.itemCount} รายการ${parsed.hasCost ? " (มีต้นทุน)" : ""} — กำลังบันทึก…`);
    const res = await saveStock(branch, parsed.stockMap, parsed.costMap, updatedBy);
    if (res.ok) {
      setState("done");
      setMsg(`บันทึกสต็อก ${parsed.itemCount} รายการแล้ว${parsed.hasCost ? " · มีต้นทุน (เปิดมูลค่าเงินจม)" : ""}`);
      onSaved?.();
    } else {
      setState("error");
      setMsg(res.error ?? "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-white">อัปโหลดสต็อกคงเหลือ</h2>
            <p className="text-[11px] text-white/50">
              ไฟล์ Excel/CSV ที่มีคอลัมน์ ชื่อ/รหัสสินค้า + จำนวนคงเหลือ — เพื่อคำนวณ "ขายหมดในกี่วัน"
            </p>
          </div>
        </div>
        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 font-semibold hover:bg-sky-500/30 transition-colors cursor-pointer shrink-0">
          {state === "parsing" || state === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {state === "parsing" ? "กำลังอ่าน…" : state === "saving" ? "กำลังบันทึก…" : "เลือกไฟล์สต็อก"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-3 text-[12px]">
        {stockStatus && stockStatus.itemCount > 0 ? (
          <span className="text-emerald-300">
            สต็อกปัจจุบัน: {stockStatus.itemCount} รายการ
            {stockStatus.updatedAt ? ` · อัปเดต ${stockStatus.updatedAt}` : ""}
          </span>
        ) : (
          <span className="text-white/45">ยังไม่มีข้อมูลสต็อก</span>
        )}
      </div>

      {msg ? (
        <p
          className={`mt-2 flex items-center gap-1.5 text-[12px] ${
            state === "error" ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {state === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : state === "done" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export function RunRateSection({
  data,
  branch,
  stockStatus,
  updatedBy,
  onStockSaved,
  windowDays = 0,
  onWindowChange,
}: {
  data?: RunRateResult;
  branch?: string;
  stockStatus?: StockStatus;
  updatedBy?: string;
  onStockSaved?: () => void;
  windowDays?: number;
  onWindowChange?: (d: number) => void;
}) {
  const [showAllProducts, setShowAllProducts] = React.useState(false);
  const [leadDays, setLeadDays] = React.useState(14);
  const [targetCover, setTargetCover] = React.useState(30);
  const [deadCover, setDeadCover] = React.useState(90);
  const [catFilter, setCatFilter] = React.useState<string>("all");
  const productCats = React.useMemo(
    () =>
      Array.from(
        new Set((data?.products ?? []).map((p) => p.sub).filter(Boolean)),
      ) as string[],
    [data],
  );

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
  const reorderList = hasStock
    ? buildReorderList(data.products, leadDays, targetCover)
    : [];
  const deadStock = hasStock ? buildDeadStock(data.products, deadCover) : [];
  const hasValue = data.products.some((p) => p.stockValue != null);
  const totalStockValue = data.products.reduce(
    (s, p) => s + (p.stockValue ?? 0),
    0,
  );
  const deadValue = deadStock.reduce((s, d) => s + (d.stockValue ?? 0), 0);
  const valueByCat = (() => {
    const m = new Map<string, number>();
    for (const p of data.products) {
      if (p.stockValue == null) continue;
      const k = p.sub || "อื่นๆ";
      m.set(k, (m.get(k) ?? 0) + p.stockValue);
    }
    return Array.from(m.entries())
      .map(([cat, value]) => ({ cat, value }))
      .sort((a, b) => b.value - a.value);
  })();

  const filteredProducts =
    catFilter === "all"
      ? data.products
      : data.products.filter((p) => p.sub === catFilter);

  const fast = filteredProducts.slice(0, 12);
  const slow = [...filteredProducts]
    .filter((p) => p.units > 0)
    .sort((a, b) => a.unitsPerDay - b.unitsPerDay)
    .slice(0, 10);
  const products = showAllProducts ? filteredProducts : fast;

  const CatFilter = (
    <select
      value={catFilter}
      onChange={(e) => setCatFilter(e.target.value)}
      className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-amber-400"
    >
      <option value="all">ทุกหมวด</option>
      {productCats.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
              <Gauge className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Run Rate — อัตราการขาย</h2>
              <p className="text-[11px] text-white/50">
                คิดจาก {data.windowLabel} · คาดการณ์สิ้นเดือนเทียบ {data.totalDays} วัน
              </p>
            </div>
          </div>
          {/* Velocity window toggle */}
          <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[12px] shrink-0">
            <button
              onClick={() => onWindowChange?.(0)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${windowDays === 0 ? "bg-emerald-500/25 text-emerald-200" : "text-white/60 hover:text-white"}`}
            >
              ทั้งเดือน
            </button>
            <button
              onClick={() => onWindowChange?.(7)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${windowDays === 7 ? "bg-emerald-500/25 text-emerald-200" : "text-white/60 hover:text-white"}`}
            >
              7 วันล่าสุด
            </button>
          </div>
        </div>
        {!hasStock ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100/90">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-300" />
            <span>
              อัปโหลดไฟล์สต็อกด้านล่างเพื่อเปิดคอลัมน์ "ขายหมดในกี่วัน" และแจ้งเตือนเติมของ (reorder เมื่อเหลือ ≤14 วัน)
            </span>
          </div>
        ) : null}
      </div>

      {branch ? (
        <StockUploadPanel
          branch={branch}
          stockStatus={stockStatus}
          updatedBy={updatedBy}
          onSaved={onStockSaved}
        />
      ) : null}

      {/* Stock value / cash tied up */}
      {hasValue ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">มูลค่าเงินจมในสต็อก</h2>
              <p className="text-[11px] text-white/50">
                รวม {fmtBaht(totalStockValue)} · ของค้าง (dead) {fmtBaht(deadValue)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {valueByCat.map((v) => (
              <div key={v.cat} className="bg-black/20 rounded-xl border border-white/5 px-3 py-2">
                <div className="text-[10px] text-white/50 truncate">{v.cat}</div>
                <div className="text-sm font-bold text-white tabular-nums">{fmtBaht(v.value)}</div>
                <div className="text-[9px] text-white/40">
                  {((v.value / (totalStockValue || 1)) * 100).toFixed(0)}% ของสต็อก
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reorder worklist */}
      {hasStock ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-rose-400/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/20">
                <ShoppingCart className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  รายการต้องสั่งซื้อ ({reorderList.length})
                </h2>
                <p className="text-[11px] text-white/50">
                  สินค้าที่ของจะหมดภายใน lead time — สั่งให้พอขายถึงเป้า cover
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <label className="flex items-center gap-1">
                Lead time
                <input
                  type="number"
                  value={leadDays}
                  onChange={(e) => setLeadDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 bg-[#051710] border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] text-right"
                />
                วัน
              </label>
              <label className="flex items-center gap-1">
                สั่งให้พอ
                <input
                  type="number"
                  value={targetCover}
                  onChange={(e) => setTargetCover(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 bg-[#051710] border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] text-right"
                />
                วัน
              </label>
            </div>
          </div>
          {reorderList.length === 0 ? (
            <p className="text-[12px] text-emerald-300/90">
              ✅ ไม่มีสินค้าที่ต้องสั่งด่วน (ทุกตัว cover &gt; {leadDays} วัน)
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/80">
                    <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[180px]">สินค้า</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">คงเหลือ</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">ขาย/วัน</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">พอขายอีก</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">ควรสั่งเพิ่ม</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderList.map((r, i) => (
                    <tr key={`${r.label}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="font-medium text-white truncate max-w-[280px]">{r.label}</div>
                        {r.sub ? <div className="text-[9px] text-white/40">{r.sub}</div> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(r.stock)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-300 tabular-nums">{fmt1(r.unitsPerDay)}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-mono font-bold tabular-nums ${r.coverDays <= leadDays / 2 ? "text-rose-400" : "text-amber-400"}`}>
                          {Math.round(r.coverDays)} วัน
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white tabular-nums">
                        +{fmt(r.suggestQty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Dead stock */}
      {hasStock ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                <Snail className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  ของค้าง / เงินจม ({deadStock.length})
                </h2>
                <p className="text-[11px] text-white/50">
                  มีสต็อกแต่แทบไม่ขาย (cover ≥ {deadCover} วัน) — พิจารณาจัดโปรระบาย
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-white/60">
              เกณฑ์ค้าง ≥
              <input
                type="number"
                value={deadCover}
                onChange={(e) => setDeadCover(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 bg-[#051710] border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] text-right"
              />
              วัน
            </label>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-[12px] text-emerald-300/90">✅ ไม่มีของค้างเกินเกณฑ์</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/80">
                    <th className="py-2 px-3 font-bold uppercase tracking-wide min-w-[180px]">สินค้า</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">คงเหลือ</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">ขาย/วัน</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">cover</th>
                    {hasValue ? (
                      <th className="py-2 px-3 font-bold uppercase tracking-wide text-right">เงินจม</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {deadStock.slice(0, 20).map((d, i) => (
                    <tr key={`${d.label}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="font-medium text-white truncate max-w-[280px]">{d.label}</div>
                        {d.sub ? <div className="text-[9px] text-white/40">{d.sub}</div> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(d.stock)}</td>
                      <td className="py-2 px-3 text-right font-mono text-white/50 tabular-nums">{fmt1(d.unitsPerDay)}</td>
                      <td className="py-2 px-3 text-right font-mono text-white/60 tabular-nums">
                        {d.coverDays == null ? "ไม่ขายเลย" : `${Math.round(d.coverDays)} วัน`}
                      </td>
                      {hasValue ? (
                        <td className="py-2 px-3 text-right font-mono font-semibold text-amber-300 tabular-nums">
                          {d.stockValue != null ? fmtBaht(d.stockValue) : "—"}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

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
          <div className="flex items-center gap-3">
            {CatFilter}
            {filteredProducts.length > 12 ? (
              <button
                onClick={() => setShowAllProducts((v) => !v)}
                className="text-[11px] text-amber-300 hover:text-amber-200 font-medium"
              >
                {showAllProducts ? "แสดงเฉพาะ Top 12" : `ดูทั้งหมด (${filteredProducts.length})`}
              </button>
            ) : null}
          </div>
        </div>
        <RunRateTable rows={products} hasStock={hasStock} showSub />
      </div>

      {/* Slow movers */}
      {slow.length > 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                <Snail className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  สินค้าขายช้า{catFilter !== "all" ? ` · ${catFilter}` : ""}
                </h2>
                <p className="text-[11px] text-white/50">ขายได้น้อยที่สุดต่อวัน — เสี่ยงเงินจม/ค้างสต็อก</p>
              </div>
            </div>
            {CatFilter}
          </div>
          <RunRateTable rows={slow} hasStock={hasStock} showSub />
        </div>
      ) : null}
    </div>
  );
}
