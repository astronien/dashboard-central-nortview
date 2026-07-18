import { motion, AnimatePresence } from "motion/react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ShoppingBag, Award, Star, TrendingUp, Apple, Send, Loader2, CheckCircle2 } from "lucide-react";
import React from "react";
import { toJpeg } from "html-to-image";
import { calcTargetToDate, calcTodayAchievementPct } from "../../lib/targetAggregations";
import type { PresetCalcType } from "../../lib/presetTypes";
import type { CsatUser } from "../../lib/csatApi";

export type StaffLeaderboardItem = {
  id: string;
  name: string;
  baseUnits: number;
  attachMap: Record<string, { rate: number; units: number }>;
};

export type PerformanceRow = {
  category: string;
  target: number;
  actual: number;
  achPercent: number;
  forecast: number;
  forecastPercent: number;
  lastMonth: number;
  momPercent: number | string;
  lastYear: number;
  yoyPercent: number | string;
  targetDay: number;
  actualDay: number;
  diffDay: number;
  achDayPercent: number;
  actualA?: number;
  actualB?: number;
  calcType?: PresetCalcType;
};

export type OfficerData = {
  name: string;
  staffId?: string;
  actual: number;
  target: number;
  achPercent?: number;
  forecast: number;
  branch?: string;
};

export type CurrentStaff = {
  id?: string;
  name: string;
  store: string;
  stats: {
    sales: number | string;
    target: number | string;
  };
};

export type RadarDatum = {
  subject: string;
  value: number;
};

const isCurrencyCalcType = (calcType: PresetCalcType | undefined): boolean => {
  return calcType === "baht" || calcType === "bahtRate" || calcType === "catBaht";
};

/**
 * "ส่งไป Telegram" button — captures 3 views (sales / csat / target)
 * via html-to-image, then POSTs the images to /api/telegram-report which
 * forwards them to the most recently active Telegram chat.
 *
 * Clicking the button shows a small menu: send for this staff only,
 * or send for all staff.
 */
function TelegramSendButton({
  staffId,
  containerRef,
  onSetActiveStat,
  onSetActiveStaffId,
  piaIndices,
  homeCaptureRef,
}: {
  staffId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSetActiveStat: (stat: string) => void;
  onSetActiveStaffId: (id: string) => void;
  piaIndices: string[];
  homeCaptureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [status, setStatus] = React.useState<"idle" | "capturing" | "sending" | "sent" | "error">("idle");
  const [progress, setProgress] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the status back to idle after a delay; cancel any pending reset
  // (and on unmount) so we never setState on an unmounted component.
  const scheduleReset = React.useCallback((delayMs: number) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
      setProgress("");
    }, delayMs);
  }, []);

  React.useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const views: Array<{ stat: string; name: string }> = [
    { stat: "sales", name: "KPI" },
    { stat: "csat", name: "7 Wonders" },
    { stat: "target", name: "Today" },
  ];

  const captureEl = async (el: HTMLDivElement | null, refForSize: React.RefObject<HTMLDivElement | null>): Promise<string | null> => {
    if (!el) return null;
    const sizeEl = refForSize.current || el;
    const w = Math.max(sizeEl.scrollWidth, sizeEl.offsetWidth);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 3500)));
    // Hide scrollbars and backdrop-filter during capture (backdrop-filter
    // renders as a misplaced light patch in html-to-image clones)
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    `;
    document.head.appendChild(styleTag);
    try {
      const pad = 32;
      const h = Math.max(sizeEl.scrollHeight, sizeEl.offsetHeight);
      const dataUrl = await toJpeg(el, {
        quality: 0.92,
        pixelRatio: 1.5,
        cacheBust: false,
        backgroundColor: "#1c2722",
        // Padding is added AROUND the card so the content stays centered
        // with even margins on every side (width AND height must grow,
        // otherwise the bottom padding gets clipped).
        width: w + pad * 2,
        height: h + pad * 2,
        style: {
          padding: `${pad}px`,
          width: `${w + pad * 2}px`,
          height: `${h + pad * 2}px`,
          boxSizing: "border-box",
          overflow: "visible",
        },
        // mix-blend-* layers (e.g. the emerald glow behind the photo)
        // render as solid green blobs in the SVG clone — drop them.
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            String(node.className).includes("mix-blend-")
          ),
        fetchRequestInit: { mode: "cors" },
      });
      return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    } catch (e) {
      console.error("[TelegramSendButton] capture failed:", e);
      return null;
    } finally {
      styleTag.remove();
    }
  };

  const captureView = async (): Promise<string | null> => captureEl(containerRef.current, containerRef);

  const captureOneStaff = async (sid: string, staffIndex: number, totalStaff: number, includeHome = false): Promise<Array<{ name: string; base64: string; caption: string }> | null> => {
    const imgs: Array<{ name: string; base64: string; caption: string }> = [];
    if (includeHome) {
      setProgress(totalStaff > 1 ? `คนที่ ${staffIndex}/${totalStaff}: หน้า Home…` : "หน้า Home…");
      const homeBase64 = await captureEl(homeCaptureRef.current, homeCaptureRef);
      if (homeBase64) {
        imgs.push({ name: `${sid}-home.jpeg`, base64: homeBase64, caption: "Home" });
      }
    }
    for (let v = 0; v < views.length; v++) {
      const view = views[v];
      if (totalStaff > 1) {
        setProgress(`คนที่ ${staffIndex}/${totalStaff}: (${v + 1}/${views.length}) ${view.name}…`);
      } else {
        setProgress(`(${v + 1}/${views.length}) ${view.name}…`);
      }
      onSetActiveStat(view.stat);
      const base64 = await captureView();
      if (!base64) {
        setStatus("error");
        setErrorMsg(`จับภาพ ${view.name} ไม่สำเร็จ`);
        return null;
      }
      imgs.push({ name: `${sid}-${view.stat}.jpeg`, base64, caption: `${view.name}` });
    }
    return imgs;
  };

  const sendImages = async (images: Array<{ name: string; base64: string; caption: string }>, sid: string): Promise<{ sent: number; errs: string[] }> => {
    let sent = 0;
    const errs: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        setProgress(`(${i + 1}/${images.length}) กำลังส่ง…`);
        const res = await fetch("/api/telegram-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId: sid, images: [img] }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          sent++;
        } else {
          errs.push(`${img.caption}: ${data.error ?? res.status}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errs.push(`${img.caption}: ${msg}`);
      }
    }
    return { sent, errs };
  };

  const runCapture = async (mode: "single" | "all") => {
    setMenuOpen(false);
    if (status === "capturing" || status === "sending") return;

    setStatus("capturing");
    setErrorMsg("");

    const totalImages: Array<{ name: string; base64: string; caption: string }> = [];

    if (mode === "single") {
      const imgs = await captureOneStaff(staffId, 1, 1, true);
      if (!imgs) { scheduleReset(6000); return; }
      totalImages.push(...imgs);
    } else {
      for (let idx = 0; idx < piaIndices.length; idx++) {
        const sid = piaIndices[idx];
        setProgress(`คนที่ ${idx + 1}/${piaIndices.length}…`);
        onSetActiveStaffId(sid);
        const imgs = await captureOneStaff(sid, idx + 1, piaIndices.length, idx === 0);
        if (!imgs) { scheduleReset(6000); return; }
        totalImages.push(...imgs);
      }
    }

    // All captures done — send
    setStatus("sending");
    setProgress("กำลังส่งไป Telegram…");

    let totalSent = 0;
    const allErrs: string[] = [];
    for (const img of totalImages) {
      const result = await sendImages([img], staffId);
      totalSent += result.sent;
      allErrs.push(...result.errs);
    }

    if (totalSent === totalImages.length) {
      setStatus("sent");
      setProgress("");
    } else if (totalSent > 0) {
      setStatus("sent");
      setProgress(`ส่ง ${totalSent}/${totalImages.length} รูป`);
    } else {
      setStatus("error");
      setErrorMsg(allErrs[0] ?? "ส่งไม่สำเร็จ");
    }
    scheduleReset(8000);
  };

  const baseClass =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs sm:text-sm font-semibold transition-colors";

  if (status === "capturing" || status === "sending") {
    return (
      <button disabled className={`${baseClass} bg-sky-500/15 border border-sky-400/30 text-sky-200/60`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">{progress}</span>
        <span className="sm:hidden">...</span>
      </button>
    );
  }
  if (status === "sent") {
    return (
      <button disabled className={`${baseClass} bg-emerald-500/15 border border-emerald-400/40 text-emerald-200`}>
        <CheckCircle2 className="w-3 h-3" />
        <span className="hidden sm:inline">ส่งแล้ว! ตรวจสอบ Telegram</span>
        <span className="sm:hidden">ส่งแล้ว</span>
      </button>
    );
  }
  if (status === "error") {
    return (
      <button onClick={() => runCapture("single")} title={errorMsg}
        className={`${baseClass} bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 hover:border-red-400/50`}>
        <Send className="w-3 h-3" />
        <span className="hidden sm:inline">ลองใหม่</span>
        <span className="sm:hidden">ลองใหม่</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setMenuOpen(!menuOpen)}
        title="ส่งรายงาน 3 หน้าไป Telegram"
        className={`${baseClass} bg-sky-500/15 border border-sky-400/30 text-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.2)] hover:bg-sky-500/25 hover:border-sky-400/50`}>
        <Send className="w-3 h-3" />
        <span className="hidden sm:inline">ส่งไป Telegram</span>
        <span className="sm:hidden">Telegram</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-[#0c291d] border border-white/15 rounded-xl p-1 shadow-xl">
          <button onClick={() => runCapture("single")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10 transition-colors">
            ส่งเฉพาะคนนี้
          </button>
          <button onClick={() => runCapture("all")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10 transition-colors">
            ส่งทั้งหมด ({piaIndices.length} คน)
          </button>
        </div>
      )}
    </div>
  );
}

export function StaffSection({
  displayStaffAvatar,
  activeOfficer,
  currentStaff,
  dynamicRadarData,
  renderCustomTick,
  dynamicScore,
  activeStat,
  onSetActiveStat,
  sevenWondersScore,
  dynamicRole,
  dynamicExperience,
  dynamicExpertise,
  dynamicLanguages,
  focusDevice,
  focusWonder,
  csatUser,
  activeOfficer7WondersPerformance,
  activeOfficerCategoryPerformance,
  todaySalesTotal,
  todayDateLabel,
  categoryPerformanceHint,
  onSetActiveStaffId,
  piaIndices,
  homeCaptureRef,
  profileCaptureRef,
}: {
  displayStaffAvatar: string;
  activeOfficer?: OfficerData;
  currentStaff: CurrentStaff;
  dynamicRadarData: RadarDatum[];
  renderCustomTick: (props: {
    payload?: { value?: string };
    x?: number;
    y?: number;
    textAnchor?: string;
  }) => React.ReactElement | null;
  dynamicScore: number;
  activeStat: string;
  onSetActiveStat: (stat: string) => void;
  sevenWondersScore: number;
  dynamicRole: string;
  dynamicExperience: string;
  dynamicExpertise: string;
  dynamicLanguages: string;
  focusDevice: { label: string; rate: number } | null;
  focusWonder: { label: string; rate: number } | null;
  csatUser?: CsatUser;
  activeOfficer7WondersPerformance: PerformanceRow[];
  activeOfficerCategoryPerformance: PerformanceRow[];
  todaySalesTotal: number;
  todayDateLabel?: string;
  categoryPerformanceHint?: string | null;
  onSetActiveStaffId: (id: string) => void;
  piaIndices: string[];
  homeCaptureRef: React.RefObject<HTMLDivElement | null>;
  /** Exposes the profile card element to App for screenshot capture */
  profileCaptureRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const monthlySalesActual = activeOfficer
    ? Math.round(activeOfficer.actual)
    : Number(currentStaff.stats.sales) || 0;
  const monthlySalesTarget = activeOfficer
    ? Math.round(activeOfficer.target)
    : null;
  const monthlySalesPct =
    activeOfficer?.achPercent ??
    (monthlySalesTarget && monthlySalesTarget > 0
      ? (monthlySalesActual / monthlySalesTarget) * 100
      : (() => {
          const targetStr = String(currentStaff.stats.target);
          const pctMatch = targetStr.match(/([\d.]+)\s*%/);
          return pctMatch ? Number(pctMatch[1]) : 0;
        })());

  const fmtSalesNum = (n: number) => n.toLocaleString();
  const fmtSalesPct = (n: number) =>
    `${n >= 100 ? Math.round(n) : n.toFixed(1)}%`;
  const fmtActualAB = (
    a: number | undefined,
    b: number | undefined,
    calcType: PresetCalcType | undefined,
  ): string => {
    if (a === undefined) return "—";
    const isCurrency = isCurrencyCalcType(calcType);
    const aStr = isCurrency
      ? `฿${Math.round(a).toLocaleString()}`
      : Math.round(a).toLocaleString();
    if (b === undefined) return aStr;
    const bStr = isCurrency
      ? `฿${Math.round(b).toLocaleString()}`
      : Math.round(b).toLocaleString();
    return `${aStr}/${bStr}`;
  };
  const isTodayView = activeStat === "target";
  const isCsatView = activeStat === "csat";
  const tableRows = isTodayView
    ? activeOfficerCategoryPerformance
    : activeStat === "csat"
      ? activeOfficer7WondersPerformance
      : activeOfficerCategoryPerformance;

  const staffSectionRef = React.useRef<HTMLDivElement>(null);

  const focusKpiSummary = React.useMemo(() => {
    const rows = activeOfficerCategoryPerformance.filter((row) => row.category !== "Total" && row.category !== "Average");
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.achDayPercent - a.achDayPercent)[0] ?? null;
  }, [activeOfficerCategoryPerformance]);

  const currentMonthTotalDays = new Date().getDate() ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 30;
  const currentDay = Math.min(new Date().getDate(), currentMonthTotalDays);
  const todayTarget = activeOfficer
    ? Math.round(calcTargetToDate(activeOfficer.target, currentDay, currentMonthTotalDays))
    : Number(currentStaff.stats.target) || 0;
  const todayAchPercent = calcTodayAchievementPct(todaySalesTotal, todayTarget);
  const todayGap = todayTarget - todaySalesTotal;
  const todayDateDetails = React.useMemo(() => {
    if (!todayDateLabel) return "";
    return `วันนี้อ้างอิงจาก ${todayDateLabel}`;
  }, [todayDateLabel]);

  return (
              <motion.div
                key="staff"
                ref={(el: HTMLDivElement | null) => {
                  staffSectionRef.current = el;
                  if (profileCaptureRef) profileCaptureRef.current = el;
                }}
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col w-full h-full gap-6 relative"
              >
                {/* TOP HALF: Person | Radar | Stats */}
                <div className="flex-1 bg-gradient-to-br from-[#113a29]/80 via-[#0c291d]/85 to-[#051710]/95 backdrop-blur-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.35)] rounded-[2.5rem] p-6 lg:p-8 lg:pb-6 flex flex-col lg:flex-row min-h-[360px] lg:min-h-[460px] shrink-0 relative overflow-visible gap-6 lg:gap-0">
                  {/* Left Column - Image */}
                  <div className="lg:w-[38%] relative self-stretch flex items-end justify-center z-30 min-h-[320px] sm:min-h-[360px] lg:min-h-0 pointer-events-none -mb-6 lg:-ml-8 lg:-mt-20 xl:-mt-28">
                    <motion.div
                      animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[85%] max-w-[360px] h-[60%] bg-emerald-500/15 blur-[60px] lg:blur-[85px] rounded-full pointer-events-none -z-10 mix-blend-screen"
                    />
                    <AnimatePresence mode="wait">
                      {displayStaffAvatar ? (
                        <motion.img
                          key={displayStaffAvatar}
                          initial={{ opacity: 0, y: 16, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97, filter: "blur(6px)" }}
                          transition={{ duration: 0.45, type: "spring", bounce: 0.3 }}
                          src={displayStaffAvatar}
                          alt={activeOfficer?.name ?? currentStaff.name}
                          className="relative z-20 mx-auto w-auto h-[105%] max-h-[480px] sm:max-h-[520px] lg:h-[125%] lg:max-h-[640px] xl:h-[130%] lg:scale-105 xl:scale-110 object-contain object-bottom drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)] pointer-events-none"
                          style={{
                            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 95%)",
                            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 95%)",
                          }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Center Column - Radar Chart */}
                  <div className="lg:w-[28%] relative flex items-center justify-center py-4 lg:py-0 z-40 overflow-visible">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.65, type: "spring", bounce: 0.25, delay: 0.15 }}
                      className="w-full max-w-[300px] h-[300px] min-h-[300px] relative text-xs overflow-visible [&_.recharts-wrapper]:!overflow-visible [&_svg]:!overflow-visible"
                    >
                      <ResponsiveContainer width="100%" height={300} minWidth={0}>
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="52%"
                          margin={{ top: 28, right: 36, bottom: 28, left: 36 }}
                          data={dynamicRadarData}
                        >
                          <PolarGrid
                            gridType="polygon"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={1}
                          />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={renderCustomTick}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Staff"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="#10b981"
                            fillOpacity={0.15}
                            isAnimationActive={true}
                            animationDuration={800}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      {/* Center Value */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-11 h-11 rounded-full border border-emerald-500/20 flex items-center justify-center bg-emerald-500/5 backdrop-blur-sm">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={dynamicScore}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="text-white/55 text-base font-semibold tracking-tighter"
                            >
                              {dynamicScore}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column - Stats Grid */}
                  <div className="lg:w-[34%] flex flex-col justify-center lg:justify-end pb-4 relative z-40">
                    <motion.div
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, type: "spring", bounce: 0.2, delay: 0.1 }}
                      className="text-center lg:text-right mb-4"
                    >
                      <AnimatePresence mode="wait">
                        <motion.h1
                          key={activeOfficer?.name ?? currentStaff.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight text-white"
                        >
                          {(activeOfficer?.name ?? currentStaff.name).split(" ")[0]}
                          <br className="hidden lg:block" />{" "}
                          {(activeOfficer?.name ?? currentStaff.name).split(" ")[1] || ""}
                        </motion.h1>
                      </AnimatePresence>
                      {/* Staff ID badge (under the name) — only show when
                          a real staff ID is available (don't fall back to
                          the array index, which would just be "1"). */}
                      {activeOfficer?.staffId ? (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`id-${activeOfficer.staffId}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center justify-center lg:justify-end gap-1.5 mb-1.5"
                          >
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm font-mono font-semibold tracking-wide shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                              <span className="text-[9px] uppercase tracking-wider text-emerald-300/70 font-sans">ID</span>
                              {activeOfficer.staffId}
                            </span>
                            <TelegramSendButton staffId={activeOfficer.staffId} containerRef={staffSectionRef} onSetActiveStat={onSetActiveStat} onSetActiveStaffId={onSetActiveStaffId} piaIndices={piaIndices} homeCaptureRef={homeCaptureRef} />
                          </motion.div>
                        </AnimatePresence>
                      ) : null}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeOfficer?.branch ?? currentStaff.store}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center lg:justify-end gap-2 text-white/80 font-medium"
                        >
                          <Apple className="w-4 h-4" /> {activeOfficer?.branch ?? currentStaff.store}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>

                    {/* Top 3 Stats */}
                    <div className="flex justify-center lg:justify-end gap-3 mb-3">
                      <motion.button
                        onClick={() => onSetActiveStat("sales")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-2xl px-2 py-3 w-28 sm:w-32 min-h-[104px] text-center border shadow-lg transition-all duration-200 overflow-visible ${activeStat === "sales" ? "bg-[#0c3123] border-white/30 ring-1 ring-emerald-500/50" : "bg-black/20 border-white/5 hover:bg-black/30"}`}
                      >
                        <ShoppingBag
                          className={`w-5 h-5 mx-auto mb-1.5 shrink-0 ${activeStat === "sales" ? "text-white" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/70 mb-1.5 font-medium leading-tight">
                          Monthly Sales
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${monthlySalesActual}-${monthlySalesTarget}-${monthlySalesPct}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="w-full space-y-1 text-[9px] leading-snug overflow-visible"
                          >
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">ยอดจริง</span>
                              <span className="font-bold text-white tabular-nums truncate">
                                {fmtSalesNum(monthlySalesActual)}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">เป้า</span>
                              <span className="font-semibold text-white/85 tabular-nums truncate">
                                {monthlySalesTarget != null
                                  ? fmtSalesNum(monthlySalesTarget)
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <span className="text-white/55 shrink-0">ถึงเป้า</span>
                              <span className="font-bold text-emerald-300 tabular-nums">
                                {fmtSalesPct(monthlySalesPct)}
                              </span>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        onClick={() => onSetActiveStat("csat")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`backdrop-blur-md rounded-2xl px-2 py-4 w-28 sm:w-32 text-center border shadow-inner transition-all duration-200 ${activeStat === "csat" ? "bg-white/[0.15] border-white/30 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        <Award
                          className={`w-5 h-5 mx-auto mb-2 ${activeStat === "csat" ? "text-emerald-300 fill-emerald-300/20" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/80 mb-1 font-medium">
                          7 Wonder
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={sevenWondersScore}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xl lg:text-2xl font-bold text-white"
                          >
                            {sevenWondersScore}%
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        onClick={() => onSetActiveStat("target")}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
                        whileHover={{ scale: 1.05, y: -4, boxShadow: "0px 10px 25px rgba(16, 185, 129, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`backdrop-blur-xl rounded-2xl px-2 py-4 w-28 sm:w-32 text-center border shadow-xl relative overflow-hidden transition-all duration-200 ${activeStat === "target" ? "bg-white/20 border-white/40 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        {activeStat === "target" && (
                          <div className="absolute inset-0 bg-emerald-400/20 mix-blend-overlay"></div>
                        )}
                        <Star
                          className={`w-5 h-5 mx-auto mb-2 relative z-10 ${activeStat === "target" ? "text-emerald-200 fill-emerald-200" : "text-white/60"}`}
                        />
                        <div className="text-[10px] relative z-10 text-emerald-100 mb-0.5 font-medium">
                          ยอดวันนี้
                        </div>
                        {todayDateLabel ? (
                          <div className="text-[8px] relative z-10 text-white/45 mb-1 leading-tight px-0.5">
                            {todayDateLabel}
                          </div>
                        ) : null}
                        {todayDateDetails ? (
                          <div className="text-[8px] relative z-10 text-emerald-200/70 mb-1 leading-tight px-0.5">
                            {todayDateDetails}
                          </div>
                        ) : null}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={todaySalesTotal}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={`font-bold text-white relative z-10 transition-all tabular-nums leading-none ${
                              (() => {
                                const len = fmtSalesNum(todaySalesTotal).length;
                                if (len > 10) return "text-xs sm:text-sm tracking-tighter";
                                if (len > 8) return "text-sm sm:text-base lg:text-lg tracking-tighter";
                                if (len > 6) return "text-base sm:text-lg lg:text-xl tracking-tighter";
                                return "text-xl lg:text-2xl";
                              })()
                            }`}
                          >
                            {fmtSalesNum(todaySalesTotal)}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>

                    {/* Focus Device + Focus Wonder — 2 prominent pill cards */}
                    <div className="flex flex-wrap justify-center lg:justify-end gap-3 mt-4 max-w-[420px] w-full mx-auto lg:mx-0 lg:ml-auto">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.25 }}
                        className="flex-1 min-w-[140px] max-w-[200px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 lg:px-4 py-3 text-center overflow-hidden flex flex-col items-center justify-center min-h-[88px] transition-all duration-200 hover:bg-white/[0.15] hover:border-white/25 hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 w-full truncate font-medium">
                          Focus Device
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={focusDevice?.label ?? "none"}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm lg:text-base font-bold text-white w-full truncate"
                          >
                            {focusDevice ? focusDevice.label : "—"}
                          </motion.div>
                        </AnimatePresence>
                        {focusDevice ? (
                          <div className="text-[10px] text-amber-300 mt-0.5 tabular-nums">
                            {focusDevice.rate.toFixed(0)}% — needs focus
                          </div>
                        ) : null}
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
                        className="flex-1 min-w-[140px] max-w-[200px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 lg:px-4 py-3 text-center overflow-hidden flex flex-col items-center justify-center min-h-[88px] transition-all duration-200 hover:bg-white/[0.15] hover:border-white/25 hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 w-full truncate font-medium">
                          Focus 7 Wonder
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={focusWonder?.label ?? "none"}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm lg:text-base font-bold text-white w-full truncate"
                          >
                            {focusWonder ? focusWonder.label : "—"}
                          </motion.div>
                        </AnimatePresence>
                        {focusWonder ? (
                          <div className="text-[10px] text-amber-300 mt-0.5 tabular-nums">
                            {focusWonder.rate.toFixed(0)}% — needs focus
                          </div>
                        ) : null}
                      </motion.div>
                      {csatUser && (csatUser.avgScore ?? csatUser.branchScore ?? csatUser.staffScore) !== null ? (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 100, delay: 0.35 }}
                          className="flex-1 min-w-[140px] max-w-[200px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 lg:px-4 py-3 text-center overflow-hidden flex flex-col items-center justify-center min-h-[88px] transition-all duration-200 hover:bg-white/[0.15] hover:border-white/25 hover:shadow-[0_8px_20px_rgba(56,189,248,0.15)]"
                        >
                          <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 w-full truncate font-medium">
                            CSAT
                          </div>
                          {(() => {
                            const score =
                              csatUser.avgScore ?? csatUser.branchScore ?? csatUser.staffScore ?? 0;
                            const cls =
                              score >= 4.5
                                ? "text-green-400"
                                : score >= 4
                                  ? "text-amber-300"
                                  : "text-rose-400";
                            return (
                              <div className={`text-sm lg:text-base font-bold w-full truncate tabular-nums ${cls}`}>
                                {score.toFixed(1)}
                                <span className="text-white/40 font-normal">/{csatUser.maxScore}</span>
                              </div>
                            );
                          })()}
                          <div className="text-[10px] text-sky-300/80 mt-0.5">
                            ความพึงพอใจลูกค้า
                          </div>
                        </motion.div>
                      ) : null}
                    </div>
                  </div>
                </div>


                {/* BOTTOM HALF: Tables */}
                <div className="relative z-40 flex flex-col lg:flex-row gap-6 min-h-[260px]">
                  {/* Category Performance or 7 Wonders Attach Rates Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, type: "spring", bounce: 0.15 }}
                    className="lg:w-full bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {activeStat === "csat" ? (
                          <Award className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-white">
                          {activeStat === "csat"
                            ? "7 Wonders Attach Rates"
                            : isTodayView
                              ? "ยอดขายวันนี้ตามหมวด"
                              : "Category Performance vs. Target"}
                        </h2>
                        <p className="text-[10px] text-white/50">
                          {activeStat === "csat"
                            ? `Attach rate breakdown for ${activeOfficer?.name ?? currentStaff.name} against KPI targets`
                            : isTodayView
                              ? `ยอดขายของวันปัจจุบัน — ${activeOfficer?.name ?? currentStaff.name}${todayDateLabel ? ` • ${todayDateLabel}` : ""}`
                              : `Performance breakdown for ${activeOfficer?.name ?? currentStaff.name} by product category`}
                        </p>
                      </div>
                    </div>

                    {categoryPerformanceHint && activeStat !== "csat" ? (
                      <p
                        className={`mb-3 rounded-lg border px-3 py-2 text-[11px] ${
                          isTodayView
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100/90"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200/90"
                        }`}
                      >
                        {categoryPerformanceHint}
                      </p>
                    ) : null}
                    
                    <div className="flex-1 overflow-x-auto rounded-xl border border-emerald-500/10">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                            <th className="py-2.5 px-3 font-bold uppercase tracking-wider">
                              {activeStat === "csat" ? "Attach Category" : "Group Category"}
                            </th>
                            {isCsatView ? (
                              <>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Target</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Actual</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">Ach. %</th>
                              </>
                            ) : isTodayView ? (
                              <>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  เป้าวัน
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  ยอดวันนี้
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">
                                  ส่วนต่าง
                                </th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">
                                  % ถึงเป้า
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Target</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Actual</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">Ach. %</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Forecast</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">%Forecast</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Last Month</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% MoM</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Last Year</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% YoY</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Target Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Actual Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Diff Day</th>
                                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">% Ach Day</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <AnimatePresence mode="wait">
                          <motion.tbody
                            key={activeStat}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={{ duration: 0.25 }}
                            className="divide-y divide-emerald-500/10 bg-[#052b20]/60"
                          >
                            {tableRows.map((row, idx) => {
                              const isCsat = activeStat === "csat";
                              const isTotal = row.category === "Total" || row.category === "Average";
                              const fmtNum = (val: number) => isCsat ? `${val.toFixed(2)}%` : val.toLocaleString();
                              const fmtPct = (val: number) => `${val.toFixed(2)}%`;

                              // Scale a row's value to be relative to its target
                              // (0 = zero progress, 100 = hit target). Used for the
                              // colour band on the Ach.% badge so the colour
                              // reflects how close the officer is to the target,
                              // not the raw actual percentage.
                              const scaledForTarget = (r: typeof row) => {
                                const isPercentPreset =
                                  r.calcType === "attach" ||
                                  r.calcType === "bahtRate" ||
                                  r.calcType === "catAttach" ||
                                  r.calcType === "tradeIn";
                                if (isPercentPreset && r.target > 0) {
                                  return (r.actual / r.target) * 100;
                                }
                                return r.achPercent;
                              };

                              const getBadgeClass = (rate: number) => {
                                if (rate >= 100) return "bg-green-500/20 text-green-400 font-extrabold px-1.5 py-0.5 rounded border border-green-500/20";
                                if (rate >= 80) return "bg-amber-500/20 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20";
                                return "bg-rose-500/20 text-rose-400 font-extrabold px-1.5 py-0.5 rounded border border-rose-500/20";
                              };

                              const getDiffClass = (diff: number) => {
                                if (diff > 0) return "text-green-400 font-bold";
                                if (diff === 0) return "text-white/60";
                                return "text-rose-400 font-bold";
                              };

                              const getDiffText = (diff: number) => {
                                if (isCsat) return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`;
                                return diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                              };

                              if (isCsatView) {
                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${isTotal ? "bg-[#0c3123]/90 font-bold border-t border-emerald-500/30" : ""}`}
                                  >
                                    <td className="py-2.5 px-3 font-bold">{row.category}</td>
                                    <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>
                                      {row.target > 0 ? `${row.target}%` : "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold">
                                      {fmtActualAB(row.actualA, row.actualB, row.calcType)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={getBadgeClass(scaledForTarget(row))}>
                                        {fmtPct(row.achPercent)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              if (isTodayView) {
                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${isTotal ? "bg-[#0c3123]/90 font-bold border-t border-emerald-500/30" : ""}`}
                                  >
                                    <td className="py-2.5 px-3 font-bold">{row.category}</td>
                                    <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>
                                      {fmtNum(row.targetDay)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actualDay)}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className={getDiffClass(row.diffDay)}>
                                        {getDiffText(row.diffDay)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={getBadgeClass(row.achDayPercent)}>
                                        {fmtPct(row.achDayPercent)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr 
                                  key={idx} 
                                  className={`hover:bg-white/5 transition-colors duration-150 text-white/90 ${isTotal ? "bg-[#0c3123]/90 font-bold border-t border-emerald-500/30" : ""}`}
                                >
                                  <td className="py-2.5 px-3 font-bold">{row.category}</td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.target)}</td>
                                  <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actual)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.achPercent)}>
                                      {fmtPct(row.achPercent)}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.forecast)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.forecastPercent)}>
                                      {fmtPct(row.forecastPercent)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white/50">{fmtNum(row.lastMonth)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={row.momPercent === "New" ? "text-emerald-400 font-bold" : "text-white/80"}>
                                      {typeof row.momPercent === "number" ? fmtPct(row.momPercent) : row.momPercent}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white/50">{fmtNum(row.lastYear)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={row.yoyPercent === "New" ? "text-emerald-400 font-bold" : "text-white/80"}>
                                      {typeof row.yoyPercent === "number" ? fmtPct(row.yoyPercent) : row.yoyPercent}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-3 text-right ${isTotal ? "text-white" : "text-white/60"}`}>{fmtNum(row.targetDay)}</td>
                                  <td className="py-2.5 px-3 text-right font-bold">{fmtNum(row.actualDay)}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={getDiffClass(row.diffDay)}>
                                      {getDiffText(row.diffDay)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={getBadgeClass(row.achDayPercent)}>
                                      {fmtPct(row.achDayPercent)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </motion.tbody>
                        </AnimatePresence>
                      </table>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
  );
}
