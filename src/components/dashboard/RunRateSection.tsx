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
  EyeOff,
  Filter,
  BellRing,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_RUNRATE_PREFS,
  buildUpcomingReorder,
  parseStockDate,
  type RunRatePrefs,
} from "../../lib/runRatePrefs";
import {
  buildReorderList,
  buildDeadStock,
  type RunRateResult,
  type RunRateRow,
} from "../../lib/runRate";
import { parseStockExcelFile } from "../../lib/stockUpload";
import { lostDemandDate, summarizeLostDemand, type LostDemandRow } from "../../lib/lostDemand";
import { saveStock, type StockStatus } from "../../lib/stockApi";

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtDM = (d: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(d);
const fmt1 = (n: number) => n.toFixed(1);
const fmtBaht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

/** ป้ายสถานะสต็อกแบบภาษาคน */
function CoverBadge({ coverDays, reorder }: { coverDays?: number | null; reorder?: boolean }) {
  if (coverDays == null) return <span className="text-white/30">—</span>;
  const d = Math.round(coverDays);
  const [cls, label] = reorder
    ? ["bg-rose-500/20 text-rose-300 border-rose-400/40", "ใกล้หมด"]
    : d <= 30
      ? ["bg-amber-500/20 text-amber-300 border-amber-400/40", "ใกล้หมด"]
      : d >= 90
        ? ["bg-white/10 text-white/50 border-white/15", "ค้าง"]
        : ["bg-emerald-500/15 text-emerald-300 border-emerald-400/30", "พอขาย"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label} · {d} วัน
    </span>
  );
}

function HideBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="ไม่นับสินค้านี้ (เอากลับได้ที่ ตัวกรอง)"
      className="shrink-0 p-1 rounded-md text-white/35 hover:text-white hover:bg-white/10 transition-colors"
    >
      <EyeOff className="w-3.5 h-3.5" />
    </button>
  );
}

function RunRateTable({
  rows,
  hasStock,
  showSub,
  onHide,
}: {
  rows: RunRateRow[];
  hasStock: boolean;
  showSub?: boolean;
  /** ปุ่มซ่อน (ไม่นับ) ต่อแถว */
  onHide?: (label: string) => void;
}) {
  const maxShare = Math.max(1, ...rows.map((r) => r.sharePct));
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/70 text-[11px]">
            <th className="py-2.5 px-3 font-semibold min-w-[180px]">สินค้า / หมวด</th>
            <th className="py-2.5 px-3 font-semibold text-right" title="จำนวนที่ขายไปแล้วในช่วงที่เลือก">ขายแล้ว</th>
            <th className="py-2.5 px-3 font-semibold text-right" title="ขายได้เฉลี่ยวันละกี่ชิ้น">วันละ</th>
            <th className="py-2.5 px-3 font-semibold text-right" title="ถ้าขายเท่านี้ต่อไป สิ้นเดือนจะได้ประมาณ">ถึงสิ้นเดือน ≈</th>
            <th className="py-2.5 px-3 font-semibold min-w-[120px]" title="สัดส่วนของยอดขายทั้งหมด">สัดส่วน</th>
            {hasStock ? (
              <>
                <th className="py-2.5 px-3 font-semibold text-right">คงเหลือ</th>
                <th className="py-2.5 px-3 font-semibold" title="ของที่มีอยู่จะขายได้อีกกี่วัน">พอขายอีก</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.key}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <div className="font-medium text-white truncate max-w-[300px]">{r.label}</div>
                  {onHide ? <HideBtn onClick={() => onHide(r.label)} /> : null}
                </div>
                {showSub && r.sub ? <div className="text-[11px] text-white/40">{r.sub}</div> : null}
              </td>
              <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(r.units)}</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-300 tabular-nums">
                {fmt1(r.unitsPerDay)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-white/70 tabular-nums">{fmt(r.projectedUnits)}</td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400/70"
                      style={{ width: `${Math.max(2, (r.sharePct / maxShare) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] text-white/60 tabular-nums">{r.sharePct.toFixed(0)}%</span>
                </div>
              </td>
              {hasStock ? (
                <>
                  <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">
                    {r.stock != null ? fmt(r.stock) : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <CoverBadge coverDays={r.coverDays} reorder={r.reorderFlag} />
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
    const res = await saveStock(branch, parsed.stockMap, parsed.costMap, parsed.items, updatedBy);
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
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-500/20">
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">อัปโหลดสต็อกคงเหลือ</h2>
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
  prefs = DEFAULT_RUNRATE_PREFS,
  onPrefsChange,
  allCategories = [],
  onSendTelegram,
  lostRows = [],
  priceOf,
  onDeleteLost,
  onSendLostTelegram,
  lostLogButton,
}: {
  lostRows?: LostDemandRow[];
  priceOf?: (product: string) => number | null;
  onDeleteLost?: (id: number) => void | Promise<void>;
  onSendLostTelegram?: (days: number) => Promise<{ ok: boolean; skipped?: boolean; error?: string }>;
  lostLogButton?: React.ReactNode;
  /** กดส่งแจ้งเตือนสต็อกเข้า Telegram ตอนนี้ */
  onSendTelegram?: () => Promise<{ ok: boolean; skipped?: boolean; error?: string }>;
  /** ตั้งค่า (หมวด/สินค้าที่ไม่นับ, วันของมาถึง ฯลฯ) — data ที่ส่งมาตัดของที่ไม่นับแล้ว */
  prefs?: RunRatePrefs;
  onPrefsChange?: (p: RunRatePrefs) => void;
  /** หมวดทั้งหมดก่อนตัด (ไว้ทำช่องติ๊ก) */
  allCategories?: string[];
  data?: RunRateResult;
  branch?: string;
  stockStatus?: StockStatus;
  updatedBy?: string;
  onStockSaved?: () => void;
  windowDays?: number;
  onWindowChange?: (d: number) => void;
}) {
  const [showAllProducts, setShowAllProducts] = React.useState(false);
  const { leadDays, targetCover, deadCover, warnDays } = prefs;
  const setPref = (patch: Partial<RunRatePrefs>) => onPrefsChange?.({ ...prefs, ...patch });
  const setLeadDays = (v: number) => setPref({ leadDays: v });
  const setTargetCover = (v: number) => setPref({ targetCover: v });
  const setDeadCover = (v: number) => setPref({ deadCover: v });
  const hideProduct = onPrefsChange
    ? (label: string) => setPref({ excludedProducts: Array.from(new Set([...prefs.excludedProducts, label])) })
    : undefined;
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [tgState, setTgState] = React.useState<{ busy: boolean; msg: string; ok?: boolean }>({ busy: false, msg: "" });
  // วันที่คาดว่าหมด = วันที่ของไฟล์สต็อก + พอขายอีกกี่วัน (ไม่นับของที่คลังจะส่งเพิ่ม)
  const stockBase = parseStockDate(stockStatus?.updatedAt);
  const stockDateLabel = stockBase ? fmtDM(stockBase) : "วันที่อัปโหลดล่าสุด";
  const outDate = (cover: number) => {
    if (!stockBase || !Number.isFinite(cover)) return `อีก ${Math.floor(cover)} วัน`;
    const d = new Date(stockBase.getTime() + Math.floor(cover) * 86_400_000);
    return fmtDM(d);
  };
  const sendTg = async () => {
    if (!onSendTelegram) return;
    setTgState({ busy: true, msg: "" });
    const r = await onSendTelegram();
    setTgState({ busy: false, ok: r.ok, msg: r.ok ? "ส่งเข้า Telegram แล้ว" : r.error ?? "ส่งไม่สำเร็จ" });
  };
  const excludedCount = prefs.excludedCats.length + prefs.excludedProducts.length;
  const [catFilter, setCatFilter] = React.useState<string>("all");
  const [tab, setTab] = React.useState<"overview" | "fast" | "reorder" | "dead" | "lost" | "stock">("overview");
  const [lostDays, setLostDays] = React.useState(7);
  const [lostMsg, setLostMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const productCats = React.useMemo(
    () =>
      Array.from(
        new Set((data?.products ?? []).map((p) => p.sub).filter(Boolean)),
      ) as string[],
    [data],
  );

  if (!data || data.categories.length === 0) {
    return (
      <div className="bg-white/10 rounded-2xl border border-white/10 p-10 text-center">
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
  const upcoming = hasStock ? buildUpcomingReorder(data.products, prefs) : [];
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

  const totalPerDay = data.categories.reduce((sum, c) => sum + c.unitsPerDay, 0);
  const totalProjected = data.categories.reduce((sum, c) => sum + c.projectedUnits, 0);
  const topCat = [...data.categories].sort((x, y) => y.unitsPerDay - x.unitsPerDay)[0];

  const tabs: Array<{ id: typeof tab; label: string; count?: number; tone?: string }> = [
    { id: "overview", label: "ภาพรวมรายหมวด" },
    { id: "fast", label: "ขายดี / ขายช้า" },
    ...(hasStock
      ? [
          { id: "reorder" as const, label: "ใกล้หมด", count: reorderList.length + upcoming.length, tone: "rose" },
          { id: "dead" as const, label: "ของค้าง", count: deadStock.length, tone: "amber" },
        ]
      : []),
    { id: "lost", label: "ลูกค้าถามหา", count: summarizeLostDemand(lostRows, 7, priceOf ?? (() => null)).times, tone: "amber" },
    { id: "stock", label: "อัปโหลดสต็อก" },
  ];

  const Card = ({
    icon,
    label,
    value,
    hint,
    tone,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint?: string;
    tone: "emerald" | "rose" | "amber" | "sky";
    onClick?: () => void;
  }) => {
    const toneCls = {
      // สีเตือนเฉพาะการ์ดที่ต้องลงมือ (สั่งเพิ่ม / ของค้าง) — ที่เหลือเป็นตัวเลขปกติ
      emerald: "border-white/10 text-white",
      rose: "border-white/10 text-rose-300",
      amber: "border-white/10 text-amber-300",
      sky: "border-white/10 text-white",
    }[tone];
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-left rounded-2xl border bg-black/20 px-4 py-3 transition-colors ${toneCls} ${
          onClick ? "hover:bg-black/30 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {hint ? <div className="text-[11px] text-white/45 mt-0.5">{hint}</div> : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header + สรุป */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
              <Gauge className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run Rate — ขายได้วันละเท่าไหร่</h2>
              <p className="text-[11px] text-white/50">
                ดูว่าแต่ละสินค้าขายเร็วแค่ไหน ของพอขายอีกกี่วัน คาดว่าจะหมดเมื่อไร · คิดจาก {data.windowLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {onPrefsChange ? (
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-colors ${
                filterOpen || excludedCount ? "bg-white/15 border-white/20 text-white" : "bg-black/20 border-white/15 text-white/70 hover:text-white"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              ตัวกรอง{excludedCount ? ` · ไม่นับ ${excludedCount}` : ""}
            </button>
          ) : null}
          <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[12px] shrink-0">
            {[
              { d: 0, label: "ทั้งเดือน" },
              { d: 7, label: "7 วันล่าสุด" },
            ].map((o) => (
              <button
                key={o.d}
                onClick={() => onWindowChange?.(o.d)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  windowDays === o.d ? "bg-emerald-500/25 text-emerald-200" : "text-white/60 hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        {filterOpen && onPrefsChange ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col gap-4">
            <div>
              <div className="text-[13px] font-semibold text-white mb-1">หมวดที่นับ</div>
              <p className="text-[12px] text-white/55 mb-2">เอาติ๊กออก = ไม่นับหมวดนั้นในทุกตารางและการแจ้งเตือน</p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((c) => {
                  const on = !prefs.excludedCats.includes(c);
                  return (
                    <label
                      key={c}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] cursor-pointer transition-colors ${
                        on ? "border-white/20 bg-white/10 text-white" : "border-white/10 text-white/45 line-through"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPref({
                            excludedCats: on ? [...prefs.excludedCats, c] : prefs.excludedCats.filter((x) => x !== c),
                          })
                        }
                        className="accent-emerald-500"
                      />
                      {c}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white mb-1">
                สินค้าที่ไม่นับ ({prefs.excludedProducts.length})
              </div>
              {prefs.excludedProducts.length ? (
                <div className="flex flex-wrap gap-2">
                  {prefs.excludedProducts.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg border border-white/10 bg-white/5 text-[12px] text-white/80">
                      <span className="truncate max-w-[260px]">{p}</span>
                      <button
                        type="button"
                        title="นับกลับ"
                        onClick={() => setPref({ excludedProducts: prefs.excludedProducts.filter((x) => x !== p) })}
                        className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-white/55">
                  กดไอคอน <EyeOff className="inline w-3.5 h-3.5 -mt-0.5" /> หลังชื่อสินค้าในตาราง เพื่อไม่นับสินค้านั้น
                </p>
              )}
            </div>
            {excludedCount ? (
              <button
                type="button"
                onClick={() => setPref({ excludedCats: [], excludedProducts: [] })}
                className="self-start inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" /> นับทั้งหมดเหมือนเดิม
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            icon={<Zap className="w-3.5 h-3.5" />}
            label="ขายเฉลี่ยรวม"
            value={`${fmt1(totalPerDay)} ชิ้น/วัน`}
            hint={topCat ? `ขายเร็วสุด: ${topCat.label} (${fmt1(topCat.unitsPerDay)}/วัน)` : undefined}
            tone="emerald"
            onClick={() => setTab("overview")}
          />
          <Card
            icon={<Gauge className="w-3.5 h-3.5" />}
            label="คาดว่าทั้งเดือนจะขายได้"
            value={`${fmt(totalProjected)} ชิ้น`}
            hint={`ผ่านมาแล้ว ${data.daysElapsed}/${data.totalDays} วัน`}
            tone="sky"
          />
          {hasStock ? (
            <>
              <Card
                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                label="ใกล้หมด"
                value={`${reorderList.length} รายการ`}
                hint={`พอขายไม่ถึง ${leadDays} วัน`}
                tone={reorderList.length ? "rose" : "emerald"}
                onClick={() => setTab("reorder")}
              />
              <Card
                icon={<Snail className="w-3.5 h-3.5" />}
                label="ของค้าง (ขายช้ามาก)"
                value={`${deadStock.length} รายการ`}
                hint={hasValue ? `เงินจม ${fmtBaht(deadValue)} จากสต็อก ${fmtBaht(totalStockValue)}` : `พอขายเกิน ${deadCover} วัน`}
                tone="amber"
                onClick={() => setTab("dead")}
              />
            </>
          ) : (
            <div className="col-span-2 flex items-start gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-[12px] text-sky-100/90">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-300" />
              <span>
                ยังไม่มีข้อมูลสต็อก —{" "}
                <button className="underline font-semibold" onClick={() => setTab("stock")}>
                  อัปโหลดสต็อก
                </button>{" "}
                เพื่อดูว่าของพอขายอีกกี่วัน / อะไรใกล้หมด / อะไรค้าง
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
              tab === t.id
                ? "bg-emerald-500/25 border-emerald-400/50 text-white"
                : "bg-white/5 border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {t.label}
            {t.count != null ? (
              <span
                className={`rounded-full px-1.5 text-[11px] font-semibold ${
                  t.count === 0
                    ? "bg-white/10 text-white/50"
                    : t.tone === "rose"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-white"
                }`}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">ขายได้วันละเท่าไหร่ — รายหมวด</h2>
          </div>
          <p className="text-[11px] text-white/45 mb-4">
            "วันละ" = ขายเฉลี่ยต่อวัน · "ถึงสิ้นเดือน ≈" = ถ้าขายเท่านี้ต่อไปจะได้ประมาณเท่าไหร่
          </p>
          <RunRateTable rows={data.categories} hasStock={hasStock} />
          {hasValue && valueByCat.length ? (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2 text-[12px] text-white/70 font-semibold">
                <Wallet className="w-4 h-4 text-emerald-400" /> มูลค่าสต็อกตามหมวด (รวม {fmtBaht(totalStockValue)})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {valueByCat.map((v) => (
                  <div key={v.cat} className="bg-black/20 rounded-xl border border-white/5 px-3 py-2">
                    <div className="text-[11px] text-white/50 truncate">{v.cat}</div>
                    <div className="text-sm font-semibold text-white tabular-nums">{fmtBaht(v.value)}</div>
                    <div className="text-[11px] text-white/40">
                      {((v.value / (totalStockValue || 1)) * 100).toFixed(0)}% ของสต็อก
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "fast" ? (
        <>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-semibold text-white">ขายดี — Top {products.length}</h2>
                  <p className="text-[11px] text-white/45">เรียงจากขายได้ต่อวันมากสุด</p>
                </div>
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
            <RunRateTable rows={products} hasStock={hasStock} showSub onHide={hideProduct} />
          </div>
          {slow.length > 0 ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
              <div className="flex items-center gap-3 mb-4">
                <Snail className="w-5 h-5 text-white/60" />
                <div>
                  <h2 className="text-base font-semibold text-white">
                    ขายช้า{catFilter !== "all" ? ` · ${catFilter}` : ""}
                  </h2>
                  <p className="text-[11px] text-white/45">ขายได้น้อยที่สุดต่อวัน — ระวังของค้าง</p>
                </div>
              </div>
              <RunRateTable rows={slow} hasStock={hasStock} showSub onHide={hideProduct} />
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "reorder" && hasStock ? (
        <div className="bg-white/10 rounded-2xl border border-rose-400/20 p-6 ">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-rose-400" />
              <div>
                <h2 className="text-base font-semibold text-white">ใกล้หมด ({reorderList.length})</h2>
                <p className="text-[11px] text-white/45">
                  พอขายไม่ถึง {leadDays} วัน · "ควรได้เพิ่ม" = จำนวนที่ทำให้มีพอขาย {targetCover} วัน (ใช้ขอคลัง/แจ้งทีมจัดสรร) · สต็อก ณ {stockDateLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/60">
              <label className="flex items-center gap-1">
                เตือนเมื่อพอขายไม่ถึง
                <input
                  type="number"
                  value={leadDays}
                  onChange={(e) => setLeadDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 bg-[#051710] border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] text-right"
                />
                วัน
              </label>
              <label className="flex items-center gap-1">
                ควรมีพอขาย
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
            <p className="text-[13px] text-emerald-300/90">ยังไม่มีสินค้าใกล้หมด — ทุกตัวพอขายเกิน {leadDays} วัน</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/70 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold min-w-[180px]">สินค้า</th>
                    <th className="py-2.5 px-3 font-semibold text-right">คงเหลือ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ขาย/วัน</th>
                    <th className="py-2.5 px-3 font-semibold">พอขายอีก</th>
                    <th className="py-2.5 px-3 font-semibold text-right">คาดว่าหมด</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ควรได้เพิ่ม</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderList.map((r, i) => (
                    <tr key={`${r.label}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="font-medium text-white truncate max-w-[300px]">{r.label}</div>
                          {hideProduct ? <HideBtn onClick={() => hideProduct(r.label)} /> : null}
                        </div>
                        {r.sub ? <div className="text-[11px] text-white/40">{r.sub}</div> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(r.stock)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-300 tabular-nums">{fmt1(r.unitsPerDay)}</td>
                      <td className="py-2 px-3">
                        <CoverBadge coverDays={r.coverDays} reorder />
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-rose-300 tabular-nums whitespace-nowrap">
                        {outDate(r.coverDays)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="inline-block rounded-lg bg-rose-500/20 border border-rose-400/40 px-2.5 py-0.5 font-mono font-semibold text-rose-200 tabular-nums">
                          +{fmt(r.suggestQty)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "reorder" && hasStock ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <BellRing className="w-5 h-5 text-amber-300" />
              <div>
                <h2 className="text-base font-semibold text-white">เฝ้าดู — จะเข้าโซนใกล้หมดใน {warnDays} วัน ({upcoming.length})</h2>
                <p className="text-[11px] text-white/55">
                  ยังพอขายเกิน {leadDays} วัน แต่ถ้าคลังไม่ส่งเพิ่ม อีกไม่เกิน {warnDays} วันจะเข้าโซนใกล้หมด
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-white/60">
              เตือนล่วงหน้า
              <input
                type="number"
                value={warnDays}
                onChange={(e) => setPref({ warnDays: Math.max(1, Number(e.target.value) || 1) })}
                className="w-14 bg-[#051710] border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] text-right"
              />
              วัน
            </label>
          </div>
          {onPrefsChange ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[12px]">
              <label className="inline-flex items-center gap-2 text-white/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.telegramAlert}
                  onChange={(e) => setPref({ telegramAlert: e.target.checked })}
                  className="accent-emerald-500"
                />
                ส่งแจ้งเตือนเข้า Telegram อัตโนมัติ (วันละครั้ง เมื่อมีสินค้าใกล้หมด/เฝ้าดู)
              </label>
              {onSendTelegram ? (
                <button
                  type="button"
                  onClick={() => void sendTg()}
                  disabled={tgState.busy || (!reorderList.length && !upcoming.length)}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-200 font-semibold hover:bg-sky-500/20 disabled:opacity-50"
                >
                  {tgState.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                  ส่งเข้า Telegram ตอนนี้
                </button>
              ) : null}
              {tgState.msg ? (
                <span className={`w-full text-[12px] ${tgState.ok ? "text-emerald-300" : "text-rose-300"}`}>{tgState.msg}</span>
              ) : null}
            </div>
          ) : null}
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-white/60">ไม่มีสินค้าที่จะเข้าโซนใกล้หมดในอีก {warnDays} วัน</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold min-w-[180px]">สินค้า</th>
                    <th className="py-2.5 px-3 font-semibold text-right">คงเหลือ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ขาย/วัน</th>
                    <th className="py-2.5 px-3 font-semibold text-right">พอขายอีก</th>
                    <th className="py-2.5 px-3 font-semibold text-right">คาดว่าหมด</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ควรได้เพิ่ม</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((r, i) => (
                    <tr key={`${r.label}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="font-medium text-white truncate max-w-[300px]">{r.label}</div>
                          {hideProduct ? <HideBtn onClick={() => hideProduct(r.label)} /> : null}
                        </div>
                        {r.sub ? <div className="text-[11px] text-white/45">{r.sub}</div> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(r.stock)}</td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt1(r.unitsPerDay)}</td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{Math.floor(r.coverDays)} วัน</td>
                      <td className="py-2 px-3 text-right font-semibold text-amber-300 tabular-nums whitespace-nowrap">
                        {outDate(r.coverDays)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white tabular-nums">+{fmt(r.suggestQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "dead" && hasStock ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 ">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Snail className="w-5 h-5 text-amber-300" />
              <div>
                <h2 className="text-base font-semibold text-white">ของค้าง ({deadStock.length})</h2>
                <p className="text-[11px] text-white/45">
                  มีของแต่ขายช้ามาก (พอขายเกิน {deadCover} วัน หรือไม่ขายเลย) — พิจารณาจัดโปรระบาย
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-white/60">
              ถือว่าค้างเมื่อพอขายเกิน
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
            <p className="text-[13px] text-emerald-300/90">ไม่มีของค้างเกินเกณฑ์</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/70 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold min-w-[180px]">สินค้า</th>
                    <th className="py-2.5 px-3 font-semibold text-right">คงเหลือ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ขาย/วัน</th>
                    <th className="py-2.5 px-3 font-semibold">พอขายอีก</th>
                    {hasValue ? <th className="py-2.5 px-3 font-semibold text-right">เงินจม</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {deadStock.slice(0, 30).map((d, i) => (
                    <tr key={`${d.label}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="font-medium text-white truncate max-w-[300px]">{d.label}</div>
                          {hideProduct ? <HideBtn onClick={() => hideProduct(d.label)} /> : null}
                        </div>
                        {d.sub ? <div className="text-[11px] text-white/40">{d.sub}</div> : null}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/80 tabular-nums">{fmt(d.stock)}</td>
                      <td className="py-2 px-3 text-right font-mono text-white/50 tabular-nums">{fmt1(d.unitsPerDay)}</td>
                      <td className="py-2 px-3">
                        {d.coverDays == null ? (
                          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/50">
                            ไม่ขายเลย
                          </span>
                        ) : (
                          <CoverBadge coverDays={d.coverDays} />
                        )}
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

      {tab === "lost" ? (
        (() => {
          const sum = summarizeLostDemand(lostRows, lostDays, priceOf ?? (() => null));
          const since = Date.now() - lostDays * 86_400_000;
          const recent = lostRows.filter((r) => lostDemandDate(r.created_at).getTime() >= since).slice(0, 50);
          const fmtWhen = (v: string) =>
            new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(lostDemandDate(v));
          return (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5 md:p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">ลูกค้าถามหาแต่ไม่มีของ</h2>
                  <p className="text-[12px] text-white/60">
                    ยอดที่เสียไปเพราะไม่มีของ — ไม่อยู่ในรันเรทที่คลังใช้จัดสรร ใช้เป็นข้อมูลขอเพิ่ม
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lostLogButton}
                  <div className="inline-flex rounded-xl border border-white/15 bg-black/20 p-0.5 text-[12px]">
                    {[7, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLostDays(d)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${lostDays === d ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
                      >
                        {d} วัน
                      </button>
                    ))}
                  </div>
                  {onSendLostTelegram ? (
                    <button
                      type="button"
                      disabled={!sum.times}
                      onClick={async () => {
                        const r = await onSendLostTelegram(lostDays);
                        setLostMsg({ ok: r.ok, text: r.ok ? "ส่งสรุปเข้า Telegram แล้ว" : r.error ?? "ส่งไม่สำเร็จ" });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-200 text-[12px] font-semibold hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      <BellRing className="w-3.5 h-3.5" /> ส่งสรุปเข้า Telegram
                    </button>
                  ) : null}
                </div>
              </div>
              {lostMsg ? <p className={`text-[12px] ${lostMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{lostMsg.text}</p> : null}

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-black/20 px-3 py-2">
                  <div className="text-[12px] text-white/60">ถามหา</div>
                  <div className="text-xl font-semibold text-white tabular-nums">{sum.times} ครั้ง</div>
                </div>
                <div className="rounded-xl bg-black/20 px-3 py-2">
                  <div className="text-[12px] text-white/60">จำนวน</div>
                  <div className="text-xl font-semibold text-white tabular-nums">{fmt(sum.totalQty)} ชิ้น</div>
                </div>
                <div className="rounded-xl bg-black/20 px-3 py-2">
                  <div className="text-[12px] text-white/60">ยอดที่เสียไป (ประมาณ)</div>
                  <div className="text-xl font-semibold text-amber-300 tabular-nums">{sum.totalValue > 0 ? fmtBaht(sum.totalValue) : "—"}</div>
                </div>
              </div>

              {sum.rows.length ? (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#0c3123] border-b border-white/10 text-white/70 text-[11px]">
                        <th className="py-2.5 px-3 font-semibold min-w-[200px]">สินค้า</th>
                        <th className="py-2.5 px-3 font-semibold text-right">ครั้ง</th>
                        <th className="py-2.5 px-3 font-semibold text-right">ชิ้น</th>
                        <th className="py-2.5 px-3 font-semibold text-right">ยอดที่เสียไป</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.rows.map((r) => (
                        <tr key={r.product} className="border-b border-white/5">
                          <td className="py-2 px-3 font-medium text-white">{r.product}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.times}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.qty}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-white/80">{r.value != null ? fmtBaht(r.value) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[13px] text-white/60">ยังไม่มีบันทึกใน {lostDays} วันล่าสุด</p>
              )}

              {recent.length ? (
                <details className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                  <summary className="cursor-pointer text-[13px] font-semibold text-white/80">รายการที่บันทึก ({recent.length})</summary>
                  <ul className="mt-2 divide-y divide-white/5">
                    {recent.map((r) => (
                      <li key={r.id} className="py-2 flex items-center gap-3 text-[12px]">
                        <span className="text-white/55 tabular-nums w-[92px] shrink-0">{fmtWhen(r.created_at)}</span>
                        <span className="flex-1 min-w-0 text-white/85">
                          {r.product} × {r.qty}
                          {r.note ? <span className="text-white/55"> · {r.note}</span> : null}
                          {r.staff ? <span className="text-white/45"> · {r.staff}</span> : null}
                        </span>
                        {onDeleteLost ? (
                          <button
                            type="button"
                            onClick={() => void onDeleteLost(r.id)}
                            className="text-[11px] text-white/50 hover:text-rose-300"
                          >
                            ลบ
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          );
        })()
      ) : null}

      {tab === "stock" && branch ? (
        <StockUploadPanel branch={branch} stockStatus={stockStatus} updatedBy={updatedBy} onSaved={onStockSaved} />
      ) : null}
    </div>
  );
}
