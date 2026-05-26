import { Activity, PieChart, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import type { UploadKind } from "../../lib/dashboardHelpers";
import type { RawRow } from "../../lib/dashboardUtils";

export type ReportStats = { branches: number; categories: number; officers: number };
export type TursoStats = { target?: { rowCount: number }; current?: { rowCount: number }; lastMonth?: { rowCount: number }; lastYear?: { rowCount: number }; categoryMaster?: { rowCount: number } };

export type ParsedReport = {
  branches: { label: string; target: number; actual: number; lastMonth: number; lastYear: number }[];
  categories: { category: string; actual: number; target: number; share: number }[];
  officers: { name: string; branch: string; actual: number; target: number; rate: number; achPercent?: number; forecast?: number }[];
};

export function ReportsSection({
  uploadedFiles,
  onFileUpload,
  onSyncSheets,
  onSyncKind,
  isSyncingSheets,
  isParsing,
  isSavingTurso,
  uploadStats,
  tursoDatabase,
  tursoStats,
  uploadError,
  onExportCsv,
  onClearAll,
  onRemoveFile,
  parsedReport,
}: {
  uploadedFiles: Record<UploadKind, RawRow[]>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, kind: UploadKind) => void;
  onSyncSheets: () => void;
  onSyncKind: (kind: UploadKind) => void;
  isSyncingSheets: boolean;
  isParsing: boolean;
  isSavingTurso: boolean;
  uploadStats: ReportStats;
  tursoDatabase: string | null;
  tursoStats: TursoStats | null;
  uploadError: string | null;
  onExportCsv: () => void;
  onClearAll: () => void;
  onRemoveFile: (kind: UploadKind) => void;
  parsedReport: ParsedReport;
}) {
  return (
    <>
      <div className="text-xs font-semibold tracking-wider text-white/45 uppercase mb-1">Option A: Manual Excel Upload (.xlsx) • ระบบสำรองแมนนวล</div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {(["target", "current", "lastMonth", "lastYear", "categoryMaster"] as UploadKind[]).map((kind) => {
          const fileCount = uploadedFiles[kind].length;
          const kindLabel = kind.replace(/([A-Z])/g, " $1");
          return (
            <label key={kind} className={`group flex min-h-[120px] cursor-pointer flex-col justify-between rounded-2xl border border-dashed p-4 transition-colors ${fileCount > 0 ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/15" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
              <input type="file" multiple={kind === "current"} accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFileUpload(e, kind)} />
              <div>
                <div className="text-sm font-semibold text-white capitalize">{kindLabel}</div>
                <div className="mt-1 text-xs text-white/50">Drop or click to upload</div>
              </div>
              <div className="text-xs text-emerald-300">
                {fileCount} file(s)
                {fileCount > 0 && <div className="mt-1 text-[11px] text-white/60 truncate max-w-full">{fileCount === 1 ? "Ready" : "Multiple files loaded"}</div>}
              </div>
            </label>
          );
        })}
      </div>

      <div className="text-xs font-semibold tracking-wider text-teal-400/80 uppercase mt-2 mb-1">Option B: Google Sheets Live Sync • ระบบดึงสดแบบพรีเมียม</div>
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/20 rounded-xl text-teal-400 shrink-0 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
              <Activity className={`w-6 h-6 ${isSyncingSheets ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Live Data Synchronization</h3>
              <p className="text-xs text-white/60 mt-0.5">ดึงข้อมูลและยอดขายล่าสุดแบบเรียลไทม์จาก Google Sheets ของ ASM MASTER บันทึกลงฐานข้อมูล Turso DB</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncingSheets}
            onClick={onSyncSheets}
            className={`rounded-xl px-5 py-3 font-semibold text-xs transition-all duration-300 shadow-lg flex items-center gap-2 shrink-0 ${
              isSyncingSheets
                ? "bg-teal-600/30 border border-teal-500/20 text-teal-300 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-teal-500/25 hover:shadow-teal-400/30 hover:scale-[1.02] active:scale-98 cursor-pointer"
            }`}
          >
            {isSyncingSheets ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div><span>กำลังดึงข้อมูล...</span></>
            ) : (
              <><Rocket className="w-3.5 h-3.5" /><span>ซิงก์ข้อมูลทั้งหมด (Live Sync)</span></>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          {(["target", "current", "lastMonth", "lastYear", "categoryMaster"] as UploadKind[]).map((kind) => {
            const label = kind.replace(/([A-Z])/g, " $1");
            const rowCount = uploadedFiles[kind].length;
            const isLoaded = rowCount > 0;
            return (
              <div key={kind} className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[90px] transition-all bg-white/5 ${isLoaded ? "border-teal-500/25 bg-teal-500/[0.02]" : "border-white/5"}`}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</span>
                  <span className={`w-2 h-2 rounded-full ${isLoaded ? "bg-teal-400 animate-pulse shadow-[0_0_8px_#2dd4bf]" : "bg-white/10"}`}></span>
                </div>
                <div className="mt-2.5 flex items-end justify-between">
                  <div className="text-[11px] font-extrabold text-white">{isLoaded ? `${rowCount.toLocaleString()} rows` : "No data"}</div>
                  <button onClick={() => onSyncKind(kind)} disabled={isSyncingSheets} className="text-[9px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-400/30 active:bg-white/15 rounded px-2.5 py-1.5 text-white font-medium transition-all cursor-pointer">Sync</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">Upload จุดเดียวอยู่ที่หน้า Reports แล้ว ส่วนไอคอนแว่นขยายด้านบนเป็นทางลัดไปหน้า Reports เท่านั้น</div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <div className="font-semibold text-white mb-2">Upload status</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
          {(["target", "current", "lastMonth", "lastYear", "categoryMaster"] as UploadKind[]).map((kind) => (
            <div key={kind} className={`rounded-xl px-3 py-2 border ${uploadedFiles[kind].length ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/50"}`}>
              {kind.replace(/([A-Z])/g, " $1")}: {uploadedFiles[kind].length ? `${uploadedFiles[kind].length} loaded` : "missing"}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><PieChart className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Backend Report Logic Preview</h2>
            <p className="text-sm text-white/60 mt-1">Summary of branch, category, and officer calculations from the backend logic doc.</p>
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2">
          <motion.div className="flex flex-wrap items-center gap-2 justify-end">
            <button onClick={onExportCsv} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">Export CSV</button>
            <button type="button" onClick={() => void onClearAll()} className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/20 transition-colors">ลบข้อมูลทั้งหมด</button>
          </motion.div>
          <div className="text-xs text-white/50 text-right max-w-md">
            {isParsing ? "กำลังอ่านไฟล์ Excel..." : isSavingTurso ? "กำลังบันทึกลง Turso..." : `Loaded ${uploadStats.branches} branches • ${uploadStats.categories} categories • ${uploadStats.officers} officers`}
            <div className="mt-1 text-[11px] text-white/40">Files: Target {uploadedFiles.target.length} • Current {uploadedFiles.current.length} • Last Month {uploadedFiles.lastMonth.length} • Last Year {uploadedFiles.lastYear.length} • Category Master {uploadedFiles.categoryMaster.length}</div>
            {tursoDatabase ? (
              <motion.div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-left text-emerald-100">
                <div className="font-medium text-emerald-200">Turso DB: {tursoDatabase}</div>
                <div className="text-white/70">ดูใน Turso Dashboard: <span className="font-mono">data_sales</span>, <span className="font-mono">data_targets</span>, <span className="font-mono">data_categories</span> (ไม่ใช่ upload_*_chunks)</div>
                {tursoStats ? (
                  <div className="font-mono text-[10px] text-white/60 mt-1">
                    rows — target {tursoStats.target?.rowCount ?? 0} • current {tursoStats.current?.rowCount ?? 0} • lastMonth {tursoStats.lastMonth?.rowCount ?? 0} • lastYear {tursoStats.lastYear?.rowCount ?? 0} • category {tursoStats.categoryMaster?.rowCount ?? 0}
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {Object.entries(uploadedFiles).map(([kind, rows]) => (
              <button key={kind} onClick={() => onRemoveFile(kind as UploadKind)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10">Clear {kind} ({(rows as RawRow[]).length})</button>
            ))}
          </div>
        </div>
      </div>

      {uploadError && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{uploadError}</div>}

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
                {parsedReport.branches.map((row) => {
                  const achPercent = row.target ? (row.actual / row.target) * 100 : 0;
                  const momPercent = row.lastMonth ? ((row.actual - row.lastMonth) / row.lastMonth) * 100 : 0;
                  const yoyPercent = row.lastYear ? ((row.actual - row.lastYear) / row.lastYear) * 100 : 0;
                  return (
                    <tr key={row.label} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 font-medium text-white/90">{row.label}</td>
                      <td className="py-3 px-3 text-white/80">฿{Math.round(row.target).toLocaleString()}</td>
                      <td className="py-3 px-3 text-white/80">฿{Math.round(row.actual).toLocaleString()}</td>
                      <td className={`py-3 px-3 font-semibold ${achPercent >= 100 ? "text-emerald-400" : "text-yellow-400"}`}>{Math.round(achPercent)}%</td>
                      <td className={`py-3 px-3 font-semibold ${momPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(momPercent)}%</td>
                      <td className={`py-3 px-3 font-semibold ${yoyPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(yoyPercent)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <h3 className="text-lg font-semibold tracking-tight mb-5">Report Logic Rules</h3>
          <div className="space-y-4 text-sm text-white/80">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">File flow</div>
              <p>Upload 4–5 files → detect type → map headers → compute target/current/last month/last year.</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">Category rule</div>
              <p>SIM uses Number; other categories use total price, with category master fallback mapping.</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
              <div className="font-semibold text-white mb-1">Matching rule</div>
              <p>Officer names are cleaned, normalized, alias-matched, and compared bidirectionally.</p>
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
            {parsedReport.categories.map((item) => (
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
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min((item.actual / item.target) * 100, 140)}%` }} />
                </div>
              </div>
            ))}
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
                {parsedReport.officers.map((item) => (
                  <tr key={item.name} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white/90 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-white/70">{item.branch}</td>
                    <td className="py-3 px-4 text-white/70">฿{Math.round(item.actual).toLocaleString()}</td>
                    <td className="py-3 px-4 text-white/70">฿{Math.round(item.target).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">{Math.round(item.rate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
