import type React from "react";
import type { UploadKind } from "../../lib/dashboardHelpers";
import type { RawRow } from "../../lib/dashboardUtils";
import { Upload, FileSpreadsheet, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ReportStats = { branches: number; categories: number; officers: number };

export type ParsedReport = {
  branches: { label: string; target: number; actual: number; lastMonth: number; lastYear: number }[];
  categories: { category: string; actual: number; target: number; share: number }[];
  officers: { name: string; branch: string; actual: number; target: number; rate: number; achPercent?: number; forecast?: number }[];
};

export type UploadStatus = {
  ok: boolean;
  message: string;
  summary?: Record<string, number>;
  errors?: Array<{ kind: string; error: string }>;
};

const getRowDate = (row: RawRow): Date | null => {
  const raw = String(row["Doc Date"] ?? row["doc_date"] ?? row["doc date"] ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/^\S+\.\s*/, "").trim();
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543;
    return new Date(year, month, day);
  }
  const parsed = Date.parse(cleaned);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    let year = d.getFullYear();
    if (year > 2400) d.setFullYear(year - 543);
    return d;
  }
  return null;
};

const getDateRangeString = (rows: RawRow[]): string | null => {
  if (!rows || rows.length === 0) return null;
  let minMs = Infinity;
  let maxMs = -Infinity;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  rows.forEach((row) => {
    const d = getRowDate(row);
    if (d) {
      const ms = d.getTime();
      if (ms < minMs) { minMs = ms; minDate = d; }
      if (ms > maxMs) { maxMs = ms; maxDate = d; }
    }
  });
  if (!minDate || !maxDate) return null;
  const formatDate = (d: Date) =>
    d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  if (minDate.getTime() === maxDate.getTime()) return formatDate(minDate);
  return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
};

const KIND_LABELS: Record<UploadKind, string> = {
  target: "Target",
  current: "Current",
  today: "Today",
  lastMonth: "Last Month",
  lastYear: "Last Year",
  categoryMaster: "Category Master",
};

const UPLOADABLE_KINDS: UploadKind[] = [
  "current",
  "lastMonth",
  "lastYear",
  "target",
  "categoryMaster",
];

const KIND_DESCRIPTIONS: Record<UploadKind, string> = {
  target: "BRANCH NAME / STAFF ID / NAME / SURNAME / DAY / POSISION / Total / Mac / iPad …",
  current: "Product / Number / ราคาขายตามบิล / Category / Sub Category / Brand …",
  today: "ยังไม่ได้อัปโหลด (ใช้ Current เป็น Today อัตโนมัติ)",
  lastMonth: "Product / Number / ราคาขายตามบิล / Category / Sub Category / Brand …",
  lastYear: "Product / Number / ราคาขายตามบิล / Category / Sub Category / Brand …",
  categoryMaster: "Cat & Sub Cat / CAT Daily",
};

type Props = {
  uploadedFiles: Record<UploadKind, RawRow[]>;
  uploadedFileNames: Record<UploadKind, string>;
  isUploadingFile: Record<UploadKind, boolean>;
  isSaving: boolean;
  uploadError: string | null;
  uploadStatus: UploadStatus | null;
  onExportCsv: () => void;
  onClearAll: () => void;
  onRemoveFile: (kind: UploadKind) => void;
  onUploadFile: (kind: UploadKind, file: File) => Promise<void>;
  parsedReport: ParsedReport;
};

type FileUploadCardProps = {
  kind: UploadKind;
  fileName: string;
  rowCount: number;
  dateRange: string | null;
  isLoading: boolean;
  isAvailable: boolean;
  onFileSelected: (file: File) => void;
};

const FileUploadCard: React.FC<FileUploadCardProps> = (props) => {
  const {
    kind,
    fileName,
    rowCount,
    dateRange,
    isLoading,
    isAvailable,
    onFileSelected,
  } = props;
  const isLoaded = rowCount > 0;
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-2 min-h-[150px] transition-all ${
        isLoaded
          ? "border-teal-500/30 bg-teal-500/[0.04] shadow-[inset_0_1px_0_rgba(45,212,191,0.1)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-white/50" />
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
            {KIND_LABELS[kind]}
          </span>
        </div>
        {isLoaded ? (
          <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded">
            ✓ {rowCount.toLocaleString()}
          </span>
        ) : (
          <span className="text-[9px] text-white/30 bg-white/5 px-2 py-0.5 rounded">empty</span>
        )}
      </div>

      <div className="text-[10px] text-white/40 leading-tight min-h-[2.4em]">
        {KIND_DESCRIPTIONS[kind]}
      </div>

      {isLoaded && fileName && (
        <div
          className="text-[10px] text-teal-300/80 font-medium truncate"
          title={fileName}
        >
          📎 {fileName}
        </div>
      )}

      {isLoaded && dateRange && (
        <div className="text-[9px] text-white/50 font-medium tracking-wide">
          📅 {dateRange}
        </div>
      )}

      {isAvailable ? (
        <label
          className={`mt-auto flex items-center justify-center gap-2 cursor-pointer text-[10px] rounded-lg px-3 py-2 border transition-colors ${
            isLoading
              ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
              : isLoaded
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                : "border-teal-500/20 bg-teal-500/15 text-teal-100 hover:bg-teal-500/25"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              กำลังประมวลผล...
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" />
              {isLoaded ? "อัปโหลดไฟล์ใหม่ทับ" : "เลือกไฟล์ Excel"}
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={isLoading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelected(f);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="mt-auto text-[10px] text-white/30 italic text-center px-3 py-2 bg-white/5 rounded-lg border border-white/5 border-dashed">
          ไม่ต้องอัปโหลด (ใช้ Current แทน)
        </div>
      )}
    </div>
  );
};

export function ReportsSection({
  uploadedFiles,
  uploadedFileNames,
  isUploadingFile,
  isSaving,
  uploadError,
  uploadStatus,
  onExportCsv,
  onClearAll,
  onRemoveFile,
  onUploadFile,
  parsedReport,
}: Props) {
  const stats = {
    target: uploadedFiles.target.length,
    current: uploadedFiles.current.length,
    today: uploadedFiles.today?.length ?? 0,
    lastMonth: uploadedFiles.lastMonth.length,
    lastYear: uploadedFiles.lastYear.length,
    categoryMaster: uploadedFiles.categoryMaster.length,
  };
  const hasAny = Object.values(stats).some((v) => v > 0);
  const totalRows = Object.values(stats).reduce((s, v) => s + v, 0);

  return (
    <>
      {/* Section: File upload */}
      <div className="text-xs font-semibold tracking-wider text-teal-400/80 uppercase mb-1">
        File Upload
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/20 rounded-xl text-teal-400 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                อัปโหลดข้อมูลจากไฟล์ Excel
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                อัปโหลด 4 ไฟล์ (Current / Last Month / Last Year / Target) + 1 ไฟล์ Category Master
                — บันทึกลง Browser (IndexedDB)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {UPLOADABLE_KINDS.map((kind) => {
            const rows = uploadedFiles[kind] ?? [];
            const dateRange =
              kind === "current" || kind === "lastMonth" || kind === "lastYear"
                ? getDateRangeString(rows)
                : null;
            return (
              <FileUploadCard
                key={`upload-${kind}`}
                kind={kind}
                fileName={uploadedFileNames[kind]}
                rowCount={rows.length}
                dateRange={dateRange}
                isLoading={isUploadingFile[kind] ?? false}
                isAvailable={true}
                onFileSelected={(file) => void onUploadFile(kind, file)}
              />
            );
          })}
          {/* "Today" placeholder card — explains it falls back to current */}
          <FileUploadCard
            key="upload-today"
            fileName=""
            rowCount={stats.today}
            dateRange={null}
            isLoading={false}
            isAvailable={false}
            onFileSelected={() => {}}
          />
        </div>
      </div>

      {/* Status banners */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border p-4 text-sm flex items-start gap-3 ${
              uploadStatus.ok
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-amber-400/30 bg-amber-400/10 text-amber-100"
            }`}
          >
            {uploadStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-white">{uploadStatus.message}</div>
              {uploadStatus.summary && (
                <div className="text-xs font-mono text-white/70 mt-1 space-y-0.5">
                  {Object.entries(uploadStatus.summary).map(([kind, count]) => (
                    <div key={kind}>
                      {KIND_LABELS[kind as UploadKind] ?? kind}: {Number(count).toLocaleString()} rows
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {uploadError}
        </div>
      )}

      {/* Status grid (mirror of card row counts) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <div className="font-semibold text-white mb-3 flex items-center justify-between">
          <span>สถานะข้อมูล</span>
          {hasAny && (
            <span className="text-[10px] font-mono text-emerald-300">
              รวม {totalRows.toLocaleString()} แถว
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
          {(Object.keys(stats) as UploadKind[]).map((kind) => (
            <div
              key={kind}
              className={`rounded-xl px-3 py-2 border ${
                stats[kind]
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-white/50"
              }`}
            >
              {KIND_LABELS[kind]}: {stats[kind] ? `${stats[kind].toLocaleString()} แถว` : "ยังไม่ได้อัปโหลด"}
            </div>
          ))}
        </div>
      </div>

      {/* Report preview header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">สรุปผลรายงาน</h2>
            <p className="text-sm text-white/60 mt-1">
              Branch / Category / Officer summary คำนวณจากข้อมูลที่อัปโหลด
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2">
          <motion.div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={onExportCsv}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("ลบข้อมูลทั้งหมดใน Browser? (จะลบทั้ง Current / Last Month / Last Year / Target / Category Master)")) {
                  onClearAll();
                }
              }}
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบข้อมูลทั้งหมด
            </button>
          </motion.div>
          <div className="text-xs text-white/50 text-right max-w-md">
            {isSaving
              ? "กำลังบันทึก..."
              : `Loaded ${parsedReport.branches.length} branches • ${parsedReport.categories.length} categories • ${parsedReport.officers.length} officers`}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {UPLOADABLE_KINDS.map((kind) =>
              stats[kind] > 0 ? (
                <button
                  key={kind}
                  onClick={() => onRemoveFile(kind)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10 flex items-center gap-1"
                >
                  Clear {KIND_LABELS[kind]} ({stats[kind].toLocaleString()})
                  <X className="w-2.5 h-2.5" />
                </button>
              ) : null,
            )}
          </div>
        </div>
      </div>

      {/* Branch summary table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold tracking-tight">Branch Summary</h3>
            <span className="text-xs text-white/50">Target, actual, achievement, MoM, YoY</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-3 pr-4 font-medium">Branch</th>
                  <th className="py-3 px-3 font-medium">Target</th>
                  <th className="py-3 px-3 font-medium">Actual</th>
                  <th className="py-3 px-3 font-medium">Ach %</th>
                  <th className="py-3 px-3 font-medium">MoM %</th>
                  <th className="py-3 px-3 font-medium">YoY %</th>
                </tr>
              </thead>
              <tbody>
                {parsedReport.branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-white/40">
                        <Upload className="w-8 h-8 opacity-50" />
                        <p className="text-sm">ยังไม่มีข้อมูล — อัปโหลดไฟล์ด้านบน</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  parsedReport.branches.map((row) => {
                    const achPercent = row.target ? (row.actual / row.target) * 100 : 0;
                    const momPercent = row.lastMonth ? ((row.actual - row.lastMonth) / row.lastMonth) * 100 : 0;
                    const yoyPercent = row.lastYear ? ((row.actual - row.lastYear) / row.lastYear) * 100 : 0;
                    return (
                      <tr key={row.label} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-medium text-white/90">{row.label}</td>
                        <td className="py-3 px-3 text-white/80">฿{Math.round(row.target).toLocaleString()}</td>
                        <td className="py-3 px-3 text-white/80">฿{Math.round(row.actual).toLocaleString()}</td>
                        <td className={`py-3 px-3 font-semibold ${achPercent >= 100 ? "text-emerald-400" : "text-yellow-400"}`}>
                          {Math.round(achPercent)}%
                        </td>
                        <td className={`py-3 px-3 font-semibold ${momPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {Math.round(momPercent)}%
                        </td>
                        <td className={`py-3 px-3 font-semibold ${yoyPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {Math.round(yoyPercent)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold tracking-tight mb-5">Report Logic Rules</h3>
          <div className="space-y-4 text-sm text-white/80">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">Data flow</div>
              <p>
                อัปโหลด Excel → แมป header → คำนวณ target / current / last month / last year
                (วันนี้ใช้ current เป็นตัวแทน)
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">Category rule</div>
              <p>
                SIM นับจาก Number; หมวดอื่นใช้ total price (ราคาขายตามบิล), ใช้ category
                master เป็น fallback
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">Matching rule</div>
              <p>
                ชื่อ officer ถูก clean, normalize, alias-match และเทียบแบบ bidirectional
                (มี alias เช่น แพวนภา → แพรวนภา)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold tracking-tight">Category Summary</h3>
            <span className="text-xs text-white/50">Main category totals</span>
          </div>
          <div className="space-y-3">
            {parsedReport.categories.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-white/40">
                <Upload className="w-8 h-8 opacity-50" />
                <p className="text-sm">ยังไม่มีข้อมูล</p>
              </div>
            ) : (
              parsedReport.categories.map((item) => (
                <div key={item.category} className="rounded-2xl bg-white/5 border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-white/90">{item.category}</div>
                    <div className="text-sm text-white/60">{item.share}% share</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Actual ฿{Math.round(item.actual).toLocaleString()}</span>
                    <span className="text-white/70">Target ฿{Math.round(item.target).toLocaleString()}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min((item.actual / item.target) * 100, 140)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold tracking-tight">Officer Summary</h3>
            <span className="text-xs text-white/50">Name matching + target alignment</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5">
                <tr className="text-white/50">
                  <th className="py-3 px-4 font-medium">Officer</th>
                  <th className="py-3 px-4 font-medium">Branch</th>
                  <th className="py-3 px-4 font-medium">Actual</th>
                  <th className="py-3 px-4 font-medium">Target</th>
                  <th className="py-3 px-4 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {parsedReport.officers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-white/40">
                        <Upload className="w-8 h-8 opacity-50" />
                        <p className="text-sm">ยังไม่มีข้อมูล</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  parsedReport.officers.map((item) => (
                    <tr key={item.name} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white/90 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-white/70">{item.branch}</td>
                      <td className="py-3 px-4 text-white/70">฿{Math.round(item.actual).toLocaleString()}</td>
                      <td className="py-3 px-4 text-white/70">฿{Math.round(item.target).toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">{Math.round(item.rate)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
