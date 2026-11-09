import {
  Apple,
  Building2,
  Building,
  Calendar,
  Camera,
  Send,
  ChevronDown,
  DollarSign,
  Home,
  Phone,
  PieChart,
  Search,
  ShoppingBag,
  Smile,
  Star,
  TrendingUp,
  User,
  Users,
  Settings,
  Target,
  AlertTriangle,
  SlidersHorizontal,
  ImagePlus,
  Trash2,
  Rocket,
  Wallet,
  Tablet,
  ShieldCheck,
  Award,
  PenTool,
  Laptop,
  Activity,
  Watch,
  CreditCard,
  LogOut,
  Loader2,
  Sun,
  Moon,
  Gauge,
} from "lucide-react";
import CategoryTreePicker from "./components/CategoryTreePicker";

import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react";
import { parseCategoryMasterFile } from "./lib/categoryMasterUpload";
import { toJpeg } from "html-to-image";
import { parseDocDate } from "./lib/dateParser";
import { parseSalesExcelFile } from "./lib/salesUpload";
import { parseTargetExcelFile } from "./lib/targetUpload";
import {
  clearAllUploads,
  deleteUploadKind,
  fetchTursoStats,
  fetchUploads,
  hasUploadData,
  saveUploads,
  type UploadKind,
  type UploadState,
} from "./lib/uploadsApi";
import { getItem as idbGet, setItem as idbSet, migrateFromLocalStorage } from "./lib/storage";
import {
  fetchTradeInData,
  getBranchCodeFromString,
  getBranchCodeFromTarget,
  type TradeInResult,
} from "./lib/tradeInApi";
import { fetchCsatData, type CsatFetchResult, type CsatResult, type CsatUser } from "./lib/csatApi";
import {
  beginLineReport,
  fetchLineReportMeta,
  finishLineReport,
  uploadLineReportImage,
} from "./lib/lineReport";
import { applyTheme, findTheme, type ThemeId } from "./lib/themes";
import {
  EMPTY_TARGET_UPLIFT,
  applyTargetUplift,
  fetchTargetUplift,
  upliftLabel,
  type TargetUplift,
} from "./lib/targetUplift";
import {
  EMPTY_ATTACH_BOOST,
  boostLabel,
  fetchAttachBoost,
  type AttachBoost,
} from "./lib/attachBoost";
import { fetchUfundData, fetchUfundMonth, type UfundResult } from "./lib/ufundApi";
import {
  fetchTradeBranchMappingFromCloud,
  getTradeBranchMapping,
} from "./lib/tradeInBranchStorage";
import { rowMatchesKpiCategory } from "./lib/kpiCategoryAdapter";
import {
  calcAchievementPct,
  calcForecastByDays,
  calculateMetrics,
  normalizeId,
  toNumber,
} from "./lib/targetAggregations";
import {
  buildStaffRoster,
  getStaffAvatar,
  getStaffPhotoUrl,
  resizeImageFile,
  type StaffPhotosMap,
} from "./lib/staffAvatar";
import {
  deleteStaffPhoto,
  fetchStaffPhotos,
  saveStaffPhoto,
  fetchHiddenStaffIds,
  saveHiddenStaffIds,
  fetchBackOfficeConfig,
  type BackOfficeConfig,
} from "./lib/staffPhotosApi";
import {
  computeAttachRateRows,
  DEFAULT_ATTACH_CATEGORIES,
  DEFAULT_BASE_CATEGORIES,
  matchesOfficer as attachMatchesOfficer,
  overallAttachRate,
  type AttachOfficerRow,
} from "./lib/attachRate";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { HomeDashboardSection } from "./components/dashboard/HomeDashboardSection";


import {
  COMMISSION_CATEGORIES,
  calcCategoryCommission,
  findBandByTarget,
  findBandById,
  calcCommissionSplit,
  EMPTY_BACK_OFFICE_COUNTS,
  type CommissionStaffRow,
  type CommissionSplit,
} from "./lib/commissionScheme";

import { saveTrendSnapshot } from "./lib/trendsApi";

import { computeRunRate } from "./lib/runRate";
import { fetchStock, type StockStatus } from "./lib/stockApi";

import { StaffSection } from "./components/dashboard/StaffSection";



import {
  getPresets as getKpiPresets,
  cleanupTestPresets as cleanupKpiPresets,
} from "./lib/presetStorage";
import type { Preset as KpiPreset, PresetResult } from "./lib/presetTypes";
import { AuthProvider, useAuth } from "./lib/auth/authContext";
import LoginPage from "./components/LoginPage";
import ChangePasswordGate from "./components/ChangePasswordGate";
import { syncPiaFromOfficers } from "./lib/auth/piSync";
import { presetDisplayValue, computePresetAchPercent } from "./lib/presetEngine";
import { DailyBranchReportSection, type DailyReportData, type ReportRange } from "./components/dashboard/DailyBranchReportSection";
import { parseBills, type BillSummary } from "./lib/presetBills";
import { enrichSalesRowsWithCatDaily, buildCatDailyLookup } from "./lib/presetCatDaily";
import {
  isExcludedIphoneDeviceRow,
  LEGACY_IPHONE18_MODELS,
  listIphoneModels,
  normalizeDemoIphoneRows,
} from "./lib/iphoneModels";
import { buildFallbackMasterRows, findUnmappedCategoryPairs, type CategoryOverrides } from "./lib/categoryFallback";
import {
  fetchCategoryOverridesFromCloud,
  getCategoryOverrides,
  setCategoryOverrides,
} from "./lib/categoryOverrideStorage";
import { SettingsGate } from "./components/dashboard/SettingsGate";
import { ViewErrorBoundary } from "./components/ViewErrorBoundary";
import { IphoneModelExcludePicker } from "./components/dashboard/IphoneModelExcludePicker";
import { CategoryFallbackAlert } from "./components/dashboard/CategoryFallbackAlert";
import { MobileBottomNav } from "./components/dashboard/MobileBottomNav";
import { MobileHome } from "./components/mobile/MobileHome";
import { HourlySalesSection } from "./components/dashboard/HourlySalesSection";
import { buildHourlySales } from "./lib/hourlySales";
import { MobileStaff } from "./components/mobile/MobileStaff";
import { useIsMobile } from "./hooks/useIsMobile";

// ⚡ หน้าที่ไม่ใช่ Home/Staff โหลดโค้ดเฉพาะตอนเปิดหน้านั้น (ไฟล์ JS ตอนเปิดเว็บเล็กลง)
// ถ้าเปิดเว็บค้างไว้ข้าม deploy ไฟล์ชิ้นเก่าจะหายจาก server → import พัง (จอขาว)
// → รีโหลดหน้าเอง 1 ครั้งเพื่อดึงเวอร์ชันใหม่
const lazyRetry = <T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>) =>
  React.lazy(async () => {
    try {
      const m = await load();
      try {
        sessionStorage.removeItem("chunk-reloaded");
      } catch {
        /* ignore */
      }
      return m;
    } catch (e) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem("chunk-reloaded") === "1";
        if (!reloaded) sessionStorage.setItem("chunk-reloaded", "1");
      } catch {
        /* ignore */
      }
      if (!reloaded) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw e;
    }
  });
const AnalysisSection = lazyRetry(() => import("./components/dashboard/AnalysisSection").then((m) => ({ default: m.AnalysisSection })));
const CommissionSection = lazyRetry(() => import("./components/dashboard/CommissionSection").then((m) => ({ default: m.CommissionSection })));
const TrendsSection = lazyRetry(() => import("./components/dashboard/TrendsSection").then((m) => ({ default: m.TrendsSection })));
const RunRateSection = lazyRetry(() => import("./components/dashboard/RunRateSection").then((m) => ({ default: m.RunRateSection })));
const ReportsSection = lazyRetry(() => import("./components/dashboard/ReportsSection").then((m) => ({ default: m.ReportsSection })));
const SettingsSection = lazyRetry(() => import("./components/dashboard/SettingsSection").then((m) => ({ default: m.SettingsSection })));
const KpiPresetSection = lazyRetry(() => import("./components/dashboard/KpiPresetSection"));
/** โหลดโค้ดหน้าตั้งค่าล่วงหน้าตอนเปิดเมนูตั้งค่า (ระหว่างที่กำลังพิมพ์รหัส) */
const preloadSettingsSection = () => {
  void import("./components/dashboard/SettingsSection").catch(() => {});
};


// Neutral placeholder shown before any data is uploaded — no demo profiles.
const emptyStaff = {
  id: "",
  name: "-",
  store: "-",
  stats: {
    sales: "0",
    csat: "-",
    target: "0",
  },
};

type Interaction = {
  date: string;
  type: string;
  typeIcon: "building" | "user" | "phone";
  product: string;
  status: string;
  value: string;
};

// No demo interactions — sections render their empty state until real
// sales rows are uploaded.
const emptyInteractions: Record<string, Interaction[]> = {
  sales: [],
  csat: [],
  target: [],
};

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "building":
      return <Building2 className="w-4 h-4 text-emerald-400" />;
    case "user":
      return <User className="w-4 h-4 text-white/70" />;
    case "phone":
      return <Phone className="w-4 h-4 text-yellow-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  if (
    status.includes("Won") ||
    status.includes("Met") ||
    status.includes("5 Stars")
  )
    return "text-emerald-400";
  if (status.includes("Follow-up") || status.includes("4.5 Stars"))
    return "text-yellow-500";
  return "text-white/80";
};

const attachOptions = [
  { id: "appleCare", label: "AppleCare+", color: "#10b981" },
  { id: "accessories", label: "Accessories", color: "#3b82f6" },
  { id: "services", label: "Services", color: "#8b5cf6" },
];

const deviceOptions = [
  { id: "iPhone", label: "iPhone" },
  { id: "Mac", label: "Mac" },
  { id: "iPad", label: "iPad" },
  { id: "Apple Watch", label: "Apple Watch" },
];

const getAttachCategoryOptions = (rows: RawRow[]) => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    const category = String(row["CAT Daily"] ?? row["Category (Name)"] ?? row.category ?? "").trim();
    if (category) keys.add(category);
  });
  return ["all", ...Array.from(keys).sort((a, b) => a.localeCompare(b))];
};

const parseRadarTickPayload = (raw: string) => {
  const pipeIdx = raw.indexOf("|");
  const fullName = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
  const val = pipeIdx >= 0 ? raw.slice(pipeIdx + 1) : "";
  const name = fullName.replace(/^\d+\.\s*/, "").trim();
  return { name, val };
};

const breakRadarLabelLines = (text: string, maxLen = 13): string[] => {
  if (text.length <= maxLen) return [text];
  const breakAt = (idx: number) => {
    if (idx <= 0 || idx >= text.length) return -1;
    const ch = text[idx];
    return ch === " " || ch === "+" || ch === "(" ? idx : -1;
  };
  let split = -1;
  for (let i = Math.min(maxLen, text.length - 1); i >= Math.floor(maxLen * 0.55); i--) {
    split = breakAt(i);
    if (split > 0) break;
  }
  if (split <= 0) split = maxLen;
  const first = text.slice(0, split).trim();
  const rest = text.slice(split).trim();
  if (!rest) return [first];
  if (rest.length <= maxLen) return [first, rest];
  return [first, ...breakRadarLabelLines(rest, maxLen)];
};

const renderCustomTick = ({ payload, x, y, textAnchor }: any) => {
  const { name, val } = parseRadarTickPayload(String(payload?.value ?? ""));
  const lines = breakRadarLabelLines(name);
  const lineHeight = 11;
  const nameStartDy = lines.length > 1 ? -(lineHeight * (lines.length - 1)) / 2 - 4 : -4;
  const valDy = nameStartDy + lines.length * lineHeight + 6;
  const fontSize = name.length > 16 ? 9 : 10;

  return (
    <g transform={`translate(${x},${y})`} style={{ overflow: "visible" }}>
      {lines.map((line, i) => (
        <text
          key={`${line}-${i}`}
          x={0}
          y={0}
          dy={nameStartDy + i * lineHeight}
          textAnchor={textAnchor}
          fill="rgba(255,255,255,0.9)"
          fontSize={fontSize}
          fontWeight="600"
        >
          {line}
        </text>
      ))}
      {val ? (
        <text
          x={0}
          y={0}
          dy={valDy}
          textAnchor={textAnchor}
          fill="#34d399"
          fontSize={12}
          fontWeight="bold"
        >
          {val}
        </text>
      ) : null}
    </g>
  );
};

type RawRow = Record<string, string | number | undefined>;

type DerivedHomeStat = {
  label: string;
  value: string;
  trend: string;
  icon: typeof DollarSign;
  isUp: boolean;
};

type DerivedAttachRow = {
  id: string;
  name: string;
  branch: string;
  appleCare: number;
  accessories: number;
  services: number;
  avatar: string;
};

type OfficerPerformance = {
  name: string;
  branch: string;
  staffId: string;
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
  rate: number;
  position?: string;
};

type ParsedReport = {
  branches: Array<{ label: string; target: number; actual: number; lastMonth: number; lastYear: number; achPercent?: number; forecast?: number; forecastPercent?: number; momPercent?: number; yoyPercent?: number; targetPerDay?: number; diffPerDay?: number; currentDay?: number; totalDays?: number }>;
  categories: Array<{ category: string; actual: number; target: number; share: number }>;
  officers: Array<OfficerPerformance>;
  fileName: string;
};

// name/branch matching helpers — ย้ายไป src/lib/matchHelpers.ts
import {
  cleanBranchForMatching,
  cleanOfficerName,
  filterRowsByBranch,
  matchesOfficer,
  normalizeText,
} from "./lib/matchHelpers";
const getCategoryValue = (row: RawRow) => {
  return toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};
const mapAttachmentMetrics = (category: string, actual: number) => {
  const normalized = normalizeText(category);
  if (normalized.includes("applecare") || normalized.includes("care") || normalized.includes("insurance")) return { appleCare: actual, accessories: 0, services: 0 };
  if (normalized.includes("service") || normalized.includes("smile")) return { appleCare: 0, accessories: 0, services: actual };
  if (normalized.includes("adapter") || normalized.includes("film") || normalized.includes("case") || normalized.includes("accessory") || normalized.includes("btb")) return { appleCare: 0, accessories: actual, services: 0 };
  return { appleCare: 0, accessories: actual, services: 0 };
};
const categoryGroupKey = (category: string) => {
  const normalized = normalizeText(category);
  if (normalized.includes("applecare") || normalized.includes("care") || normalized.includes("insurance")) return "appleCare";
  if (normalized.includes("service") || normalized.includes("smile")) return "services";
  return "accessories";
};
const getSalesDate = (row: RawRow) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = parseDocDate(raw);
  return parsed ? parsed.getTime() : 0;
};
const isUfundRow = (row: any): boolean => {
  if (!row) return false;

  const cat = String(row["Category (Name)"] ?? row.category ?? "").toLowerCase();
  const prod = String(row["Product (Name)"] ?? row.product ?? "").toLowerCase();
  const sub = String(row["Sub Category"] ?? "").toLowerCase();
  const text = `${cat} ${sub} ${prod}`.replace(/\s+/g, " ").trim();

  // Match only clear UFUND / personal finance rows from product metadata,
  // not generic customer fields that can inflate the count.
  if (text.includes("ufund personal")) return true;
  if (text.includes("ufund") && text.includes("personal")) return true;
  if (text.includes("ufund")) return true;

  if (row.extra_json) {
    try {
      const extra = JSON.parse(row.extra_json);
      const extraText = Object.values(extra)
        .flatMap((val) => (Array.isArray(val) ? val : [val]))
        .map((val) => String(val).toLowerCase())
        .join(" ");

      // Keep extra_json as a very strict fallback only.
      if (extraText.includes("ufund personal")) return true;
    } catch {
      // ignore malformed extra_json
    }
  }

  return false;
};

/** Today's date in Asia/Bangkok as YYYY-MM-DD. */
import { latestDayFromKeys } from "./lib/dateHelpers";
import { useBranchReports } from "./hooks/useBranchReports";
import { useCombinedOfficerKpi } from "./hooks/useCombinedOfficerKpi";
import { useOfficerCategoryPerformance } from "./hooks/useOfficerCategoryPerformance";
import { useCategorySnapshots } from "./hooks/useCategorySnapshots";
import { useTodayStats } from "./hooks/useTodayStats";
import type { CategoryPerformanceRow } from "./lib/categoryPerformance";

// Attach / Case / Film / UFUND helpers — ย้ายไป src/lib/attachHelpers.ts
import {
  RAW_DEVICE_CATEGORY,
  calcPresetIphoneAcc,
} from "./lib/attachHelpers";

const countRows = (
  rows: RawRow[], 
  filterFn: (cat: string, prod: string, sub: string, row?: RawRow) => boolean
) => {
  let count = 0;
  rows.forEach(row => {
    const cat = String(row["Category (Name)"] ?? row.category ?? "").toLowerCase();
    const prod = String(row["Product (Name)"] ?? row.product ?? "").toLowerCase();
    const sub = String(row["Sub Category"] ?? "").toLowerCase();
    if (filterFn(cat, prod, sub, row)) {
      if (cat.includes("sim")) {
        count += toNumber(row.Number ?? row.number ?? row.qty ?? 1);
      } else {
        count += 1;
      }
    }
  });
  return count;
};
const sumSales = (
  rows: RawRow[], 
  filterFn: (cat: string, prod: string, sub: string) => boolean
) => {
  let sum = 0;
  rows.forEach(row => {
    const cat = String(row["Category (Name)"] ?? row.category ?? "").toLowerCase();
    const prod = String(row["Product (Name)"] ?? row.product ?? "").toLowerCase();
    const sub = String(row["Sub Category"] ?? "").toLowerCase();
    if (filterFn(cat, prod, sub)) {
      sum += toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
    }
  });
  return sum;
};
const mapTargetCategoryKey = (category: string, subCategory = "", productName = "") => {
  const text = normalizeText(`${category} ${subCategory} ${productName}`);
  
  // Corporate checks must come first so device keywords do not steal corporate rows
  if (text.includes("btb apple") || text.includes("btb(apple)")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";
  
  if (text.includes("iphone") || text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  
  if (text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  if (text.includes("smartphone")) return "Smartphone";
  return category || "Other";
};

const isCategoryMatched = (rowCat: string, rowSub: string, selectedList?: string[]): boolean => {
  if (!selectedList || selectedList.length === 0) return false;
  const c = rowCat.trim();
  const s = rowSub.trim();
  const targetCombo = `${c}||${s}`;
  const targetWholeCat = `${c}||`;
  return selectedList.includes(targetCombo) || selectedList.includes(targetWholeCat);
};
const getRowKey = (row: RawRow) => {
  return [
    String(row["Doc No"] ?? "").trim(),
    String(row["Product (Name)"] ?? "").replace(/\s+/g, " ").trim(),
    String(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice ?? "").trim(),
    String(row["Serial"] ?? "").trim(),
    String(row["Doc Date"] ?? "").trim()
  ].join("||");
};



const buildReport = (targetRows: RawRow[], currentRows: RawRow[], lastMonthRows: RawRow[], lastYearRows: RawRow[], categoryRows: RawRow[], fileName: string, todayRows: RawRow[] = []): ParsedReport => {
  const categoryMap = new Map<string, string>();
  categoryRows.forEach((row) => {
    const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
    const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
    if (key) categoryMap.set(key, value);
  });

  const parseSalesDate = (row: RawRow) => {
    const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
    if (!rawDate) return 0;
    const parsed = parseDocDate(rawDate);
    return parsed ? parsed.getTime() : 0;
  };

  const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const inferCurrentAnchorDate = () => {
    const sourceRows = todayRows.length ? todayRows : currentRows;
    let latest = 0;
    sourceRows.forEach((row) => {
      const parsed = parseSalesDate(row);
      if (parsed > latest) latest = parsed;
    });
    return latest ? new Date(latest) : new Date();
  };

  const currentAnchor = inferCurrentAnchorDate();
  const expectedLastMonthKey = monthKey(new Date(currentAnchor.getFullYear(), currentAnchor.getMonth() - 1, 1));
  const expectedLastYearKey = monthKey(new Date(currentAnchor.getFullYear() - 1, currentAnchor.getMonth(), 1));

  const rowsMatchMonth = (rows: RawRow[], expectedKey: string) => rows.some((row) => {
    const parsed = parseSalesDate(row);
    if (!parsed) return false;
    return monthKey(new Date(parsed)) === expectedKey;
  });

  const resolvedLastMonthRows = lastMonthRows.length && rowsMatchMonth(lastMonthRows, expectedLastMonthKey)
    ? lastMonthRows
    : currentRows.filter((row) => {
        const parsed = parseSalesDate(row);
        return parsed ? monthKey(new Date(parsed)) === expectedLastMonthKey : false;
      });

  const resolvedLastYearRows = lastYearRows.length && rowsMatchMonth(lastYearRows, expectedLastYearKey)
    ? lastYearRows
    : currentRows.filter((row) => {
        const parsed = parseSalesDate(row);
        return parsed ? monthKey(new Date(parsed)) === expectedLastYearKey : false;
      });

  const branchTargets = new Map<string, { totalTarget: number; days: number }>();
  const targetByOfficer = new Map<string, RawRow[]>();
  targetRows.forEach((row) => {
    const branchKey = normalizeText(row["BRANCH NAME"]);
    const officerKey = cleanOfficerName(`${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim());
    
    const targetVal = toNumber(row.Total);
    const days = toNumber(row.DAY) || 30;
    
    const currentBranchTarget = branchTargets.get(branchKey) ?? { totalTarget: 0, days: 30 };
    currentBranchTarget.totalTarget += targetVal;
    currentBranchTarget.days = Math.max(currentBranchTarget.days, days);
    branchTargets.set(branchKey, currentBranchTarget);
    
    targetByOfficer.set(officerKey, [...(targetByOfficer.get(officerKey) ?? []), row]);
  });

  const branchSummary = new Map<string, { label: string; target: number; actual: number; lastMonth: number; lastYear: number; currentDay: number; totalDays: number }>();
  const officerSummary = new Map<string, OfficerPerformance>();
  const categorySummary = new Map<string, { actual: number; target: number }>();

  // Use the latest data date for "currentDay" so the daily target /
  // forecast reflect the data we actually have, not the wall-clock date.
  const latestDataDateForReport = (() => {
    let best: { time: number } | null = null;
    for (const row of currentRows) {
      const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!raw) continue;
      const parsed = parseDocDate(raw);
      if (!parsed) continue;
      const time = parsed.getTime();
      if (!best || time > best.time) best = { time };
    }
    return best ? new Date(best.time) : new Date();
  })();

  // Pre-populate branchSummary from target branches
  branchTargets.forEach((info, branchKey) => {
    const targetRow = targetRows.find((row) => normalizeText(row["BRANCH NAME"]) === branchKey);
    const branchName = String(targetRow?.["BRANCH NAME"] ?? "Unknown Branch").trim();
    const totalDays = info.days || 30;
    const currentDay = Math.min(totalDays, latestDataDateForReport.getDate());
    
    branchSummary.set(branchKey, {
      label: branchName,
      target: info.totalTarget,
      actual: 0,
      lastMonth: 0,
      lastYear: 0,
      currentDay,
      totalDays,
    });
  });

  // Pre-calculate Category Targets by summing them up across all targetRows
  const catsToSum = ["iPhone", "Mac", "iPad", "Apple Watch", "SIM", "BTB", "BTB(Apple)"];
  targetRows.forEach((row) => {
    catsToSum.forEach((cat) => {
      const key = normalizeText(cat);
      let targetVal = 0;
      if (cat === "BTB(Apple)") {
        const btbAppleVal = row["BTB(Apple)"] ?? 
                            row["BTB (Apple)"] ?? 
                            row["BTB Apple"] ?? 
                            row["btb(apple)"] ?? 
                            row["btb (apple)"] ?? 
                            row["btb apple"] ?? 
                            row["BTB_Apple"] ?? 
                            row["btb_apple"];
        targetVal = toNumber(btbAppleVal);
      } else {
        targetVal = toNumber(row[cat] ?? row[cat.toLowerCase()]);
      }
      const catItem = categorySummary.get(key) ?? { actual: 0, target: 0 };
      catItem.target += targetVal;
      categorySummary.set(key, catItem);
    });
  });

  // Initialize Officer Summary with ALL officers in targetRows so 0-sales officers are included
  targetRows.forEach((row) => {
    const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
    if (!name) return;
    const officerKey = cleanOfficerName(name);
    const branch = String(row["BRANCH NAME"] ?? "").trim();
    const staffId = String(row["STAFF ID"] ?? row.emp_id ?? row.staff_id ?? "").trim();
    officerSummary.set(officerKey, {
      name,
      branch,
      staffId,
      target: toNumber(row.Total),
      actual: 0,
      achPercent: 0,
      forecast: 0,
      forecastPercent: 0,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 0,
      actualDay: 0,
      diffDay: 0,
      achDayPercent: 0,
      rate: 0,
      position: String(row["POSISION"] ?? "").trim(),
    });
  });

  const mergeSales = (rows: RawRow[], period: "current" | "lastMonth" | "lastYear") => {
    [...rows].sort((a, b) => getSalesDate(b) - getSalesDate(a)).forEach((row) => {
      const branch = String(row["Branch (Name)"] ?? "Unknown Branch").trim();
      const officer = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
      const categoryName = String(row["Category (Name)"] ?? "Other").trim();
      const sub = String(row["Sub Category"] ?? "").trim();
      const product = String(row["Product (Name)"] ?? "").trim();
      const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);
      
      const branchKey = normalizeText(branch);
      const targetInfo = branchTargets.get(branchKey);
      const totalDays = targetInfo?.days || 30;
      const currentDay = Math.min(totalDays, latestDataDateForReport.getDate());
      const actual = getCategoryValue(row);
      
      // Update Branch summary
      const branchItem = branchSummary.get(branchKey) ?? { label: branch, target: 0, actual: 0, lastMonth: 0, lastYear: 0, currentDay, totalDays };
      branchItem.target = targetInfo ? targetInfo.totalTarget : branchItem.target;
      if (period === "current") branchItem.actual += actual; else if (period === "lastMonth") branchItem.lastMonth += actual; else branchItem.lastYear += actual;
      branchSummary.set(branchKey, branchItem);
      
      // Update Category summary (only count actual sales in CURRENT period)
      const catKey = normalizeText(mapped);
      const catItem = categorySummary.get(catKey) ?? { actual: 0, target: 0 };
      if (period === "current") {
        catItem.actual += actual;
      }
      categorySummary.set(catKey, catItem);
      
      // Update Officer summary
      const officerKey = cleanOfficerName(officer);
      let matchedKey = "";
      for (const [existingKey, value] of officerSummary.entries()) {
        if (matchesOfficer(value.name, officer)) {
          matchedKey = existingKey;
          break;
        }
      }
      
      // Staff ID can come from either the target ("STAFF ID") or the
      // current sales rows ("Officer (ID)"). Look up both so the value
      // is captured regardless of which Excel the user uploaded.
      const rowStaffId = String(
        row["STAFF ID"] ?? row["Officer (ID)"] ?? row.emp_id ?? row.staff_id ?? "",
      ).trim();

      let officerState = matchedKey ? officerSummary.get(matchedKey) : undefined;
      if (!officerState) {
        officerState = {
          name: officer,
          branch,
          staffId: rowStaffId,
          target: 0,
          actual: 0,
          achPercent: 0,
          forecast: 0,
          forecastPercent: 0,
          lastMonth: 0,
          momPercent: "New",
          lastYear: 0,
          yoyPercent: "New",
          targetDay: 0,
          actualDay: 0,
          diffDay: 0,
          achDayPercent: 0,
          rate: 0,
        };
        officerSummary.set(officerKey, officerState);
      } else if (!officerState.staffId && rowStaffId) {
        // Backfill from the current sales rows when the target file
        // didn't supply one.
        officerState.staffId = rowStaffId;
      }
      if (period === "current") {
        officerState.actual += actual;
      } else if (period === "lastMonth") {
        officerState.lastMonth += actual;
      } else if (period === "lastYear") {
        officerState.lastYear += actual;
      }
    });
  };

  mergeSales(currentRows, "current"); 
  mergeSales(resolvedLastMonthRows, "lastMonth"); 
  mergeSales(resolvedLastYearRows, "lastYear");

  // Daily actual: prefer dedicated today sheet; else last day in current (legacy)
  // Compare by parsed time (not raw string) so mixed date formats for the
  // same calendar day are all included.
  let maxDateTime = 0;
  if (!todayRows.length) {
    currentRows.forEach((row) => {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!rawDate) return;
      const parsed = parseDocDate(rawDate);
      if (parsed) {
        const time = parsed.getTime();
        if (time > maxDateTime) maxDateTime = time;
      }
    });
  }

  const officerDailyActual = new Map<string, number>();
  const dailySourceRows = todayRows.length
    ? todayRows
    : maxDateTime > 0
      ? currentRows.filter((row) => {
          const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
          const parsed = parseDocDate(rawDate);
          const time = parsed ? parsed.getTime() : 0;
          return time && time === maxDateTime;
        })
      : [];

  dailySourceRows.forEach((row) => {
    const officerName = String(row["Officer (Name)"] ?? "").trim();
    if (!officerName) return;
    const matchedKey = [...officerSummary.keys()].find((k) =>
      matchesOfficer(officerSummary.get(k)!.name, officerName),
    );
    if (matchedKey) {
      officerDailyActual.set(
        matchedKey,
        (officerDailyActual.get(matchedKey) ?? 0) + getCategoryValue(row),
      );
    }
  });

  let maxCurrentDay = 22;
  let maxTotalDays = 31;
  branchSummary.forEach((b) => {
    maxCurrentDay = Math.max(maxCurrentDay, b.currentDay);
    maxTotalDays = Math.max(maxTotalDays, b.totalDays);
  });

  // Post-calculate all officer performance metrics dynamically
  officerSummary.forEach((state, officerKey) => {
    state.achPercent = calcAchievementPct(state.actual, state.target);
    state.rate = Math.round(state.achPercent);
    state.forecast = calcForecastByDays(state.actual, maxCurrentDay, maxTotalDays);
    state.forecastPercent = calcAchievementPct(state.forecast, state.target);
    
    if (state.lastMonth > 0) {
      state.momPercent = ((state.actual - state.lastMonth) / state.lastMonth) * 100;
    } else {
      state.momPercent = "New";
    }
    
    if (state.lastYear > 0) {
      state.yoyPercent = ((state.actual - state.lastYear) / state.lastYear) * 100;
    } else {
      state.yoyPercent = "New";
    }
    
    state.targetDay = Math.round(state.target / (maxTotalDays || 30));
    state.actualDay = officerDailyActual.get(officerKey) ?? 0;
    state.diffDay = state.actualDay - state.targetDay;
    state.achDayPercent = state.targetDay ? (state.actualDay / state.targetDay) * 100 : 0;
  });

  const branches = [...branchSummary.values()].map((r) => ({ ...r, ...calculateMetrics(r.target, r.actual, r.currentDay, r.totalDays, r.lastMonth, r.lastYear) }));
  const categories = [...categorySummary.entries()].map(([category, value]) => ({ category, actual: value.actual, target: value.target || Math.max(value.actual, 1), share: 0 }));
  const totalActual = categories.reduce((s, r) => s + r.actual, 0) || 1; categories.forEach((c) => { c.share = Math.round((c.actual / totalActual) * 100); });
  return { branches, categories, officers: [...officerSummary.values()], fileName };
};
const fallbackReport: ParsedReport = {
  fileName: "demo-data",
  branches: [
    { label: "Mega Bangna", target: 1200000, actual: 1324000, lastMonth: 1188000, lastYear: 1095000, achPercent: 110.3, forecast: 1324000, forecastPercent: 110.3, momPercent: 11.4, yoyPercent: 20.9, targetPerDay: 1200000, diffPerDay: 124000 },
    { label: "Central World", target: 1500000, actual: 1432000, lastMonth: 1394000, lastYear: 1287000, achPercent: 95.5, forecast: 1432000, forecastPercent: 95.5, momPercent: 2.7, yoyPercent: 11.2, targetPerDay: 1500000, diffPerDay: -68000 },
    { label: "Iconsiam", target: 980000, actual: 1013000, lastMonth: 960000, lastYear: 885000, achPercent: 103.4, forecast: 1013000, forecastPercent: 103.4, momPercent: 5.5, yoyPercent: 14.5, targetPerDay: 980000, diffPerDay: 33000 },
    { label: "Siam Paragon", target: 2100000, actual: 2245000, lastMonth: 1987000, lastYear: 2050000, achPercent: 106.9, forecast: 2245000, forecastPercent: 106.9, momPercent: 13.0, yoyPercent: 9.5, targetPerDay: 2100000, diffPerDay: 145000 },
  ],
  categories: [
    { category: "iPhone", actual: 3520000, target: 3100000, share: 34 },
    { category: "Mac", actual: 2260000, target: 2050000, share: 22 },
    { category: "iPad", actual: 1410000, target: 1300000, share: 14 },
    { category: "Apple Watch", actual: 980000, target: 870000, share: 10 },
    { category: "SIM", actual: 610000, target: 540000, share: 6 },
    { category: "BTB", actual: 1320000, target: 1250000, share: 14 },
  ],
  officers: [
    {
      name: "สิทธิโชค สิริเฉลิมกุล",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 7118866,
      achPercent: 107.33,
      forecast: 10031129,
      forecastPercent: 151.24,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 59470,
      diffDay: -154480,
      achDayPercent: 27.80,
      rate: 107
    },
    {
      name: "ยุทธนา เหมือนปิ๋ว",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 5150670,
      achPercent: 77.66,
      forecast: 7257762,
      forecastPercent: 109.43,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 140369,
      diffDay: -73581,
      achDayPercent: 65.61,
      rate: 78
    },
    {
      name: "ณฐนน นฤพลตระกูล",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 5040387,
      achPercent: 76.00,
      forecast: 7102364,
      forecastPercent: 107.09,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 164555,
      diffDay: -49395,
      achDayPercent: 76.91,
      rate: 76
    },
    {
      name: "ผกายศรี แซ่จิ๋ว",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 4609776,
      achPercent: 69.50,
      forecast: 6495593,
      forecastPercent: 97.94,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 222035,
      diffDay: 8085,
      achDayPercent: 103.78,
      rate: 70
    },
    {
      name: "วิภา คุณะแสน",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 4136991,
      achPercent: 62.38,
      forecast: 5829396,
      forecastPercent: 87.89,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 55830,
      diffDay: -158120,
      achDayPercent: 26.09,
      rate: 62
    },
    {
      name: "ธนภัทร เจตนาภิวัฒน์",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 4083869,
      achPercent: 61.57,
      forecast: 5754543,
      forecastPercent: 86.76,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 82759,
      diffDay: -131191,
      achDayPercent: 38.68,
      rate: 62
    },
    {
      name: "วรักยา สิงห์ตั้น",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3903181,
      achPercent: 58.85,
      forecast: 5499937,
      forecastPercent: 82.92,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 234973,
      diffDay: 21023,
      achDayPercent: 109.83,
      rate: 59
    },
    {
      name: "วิภาวี ปงรังษี",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3774022,
      achPercent: 56.90,
      forecast: 5317940,
      forecastPercent: 80.18,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 102409,
      diffDay: -111541,
      achDayPercent: 47.87,
      rate: 57
    },
    {
      name: "ดีพิณ คงทอง",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3743933,
      achPercent: 56.45,
      forecast: 5275542,
      forecastPercent: 79.54,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 94300,
      diffDay: -119650,
      achDayPercent: 44.08,
      rate: 56
    },
    {
      name: "ธีรพงษ์ ไพรรอน",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3504307,
      achPercent: 52.84,
      forecast: 4937887,
      forecastPercent: 74.45,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 0,
      diffDay: -213950,
      achDayPercent: 0.00,
      rate: 53
    },
    {
      name: "กัญญภัทร ชุมประยูร",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3473762,
      achPercent: 52.38,
      forecast: 4894846,
      forecastPercent: 73.80,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 0,
      diffDay: -213950,
      achDayPercent: 0.00,
      rate: 52
    },
    {
      name: "แพวนภา หนุยศ",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 3281079,
      achPercent: 49.47,
      forecast: 4623339,
      forecastPercent: 69.71,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 0,
      diffDay: -213950,
      achDayPercent: 0.00,
      rate: 49
    },
    {
      name: "ต่อศักดิ์ แก้วพลอย",
      branch: "645",
      staffId: "",
      target: 6632444,
      actual: 2991830,
      achPercent: 45.11,
      forecast: 4215760,
      forecastPercent: 63.56,
      lastMonth: 0,
      momPercent: "New",
      lastYear: 0,
      yoyPercent: "New",
      targetDay: 213950,
      actualDay: 71993,
      diffDay: -141957,
      achDayPercent: 33.65,
      rate: 45
    }
  ],
};


const getCategoryForSalesRow = (row: RawRow): string => {
  const cat = String(row["Category (Name)"] ?? row.category_name ?? row.Category ?? "").trim();
  const sub = String(row["Sub Category"] ?? row.sub_category ?? row.SubCategory ?? "").trim();
  const prod = String(row["Product (Name)"] ?? row.product_name ?? row.Product ?? "").trim();
  
  const text = normalizeText(`${cat} ${sub} ${prod}`);
  
  // Corporate checks must come first so device keywords do not steal corporate rows
  if (text.includes("btb apple") || text.includes("btb(apple)")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";
  
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  
  if (text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  
  return "Other";
};

const emptyReport: ParsedReport = {
  fileName: "",
  branches: [],
  categories: [],
  officers: [],
};

export default function App() {
  // Bot mode: pre-set a fake admin session in localStorage so the
  // existing AuthProvider/AuthContext treats the request as logged in.
  // The bot URL params control the branch + PIA that get loaded.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bot") === "1" && params.get("token")) {
      const expected = import.meta.env.VITE_BOT_TOKEN;
      if (params.get("token") === expected) {
        // Build the session token (matches the format from createSessionToken in lib/auth/session.ts)
        const sessionPayload = {
          userId: 1,           // any existing admin user
          username: "admin",
          role: "admin" as const,
          name: "Admin",
          exp: Date.now() + 5 * 60 * 1000, // 5 min
        };
        // UTF-8 safe base64 encoding (same as utf8ToBase64 in session.ts)
        const bytes = new TextEncoder().encode(JSON.stringify(sessionPayload));
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const token = btoa(binary);

        try {
          window.localStorage.setItem("studio7_auth_session", token);
          // Also pre-set the branch so the right data is loaded
          const branch = params.get("branch");
          if (branch) {
            window.localStorage.setItem("dashboard-selected-branch", branch);
          }
          // Pre-set the active staff so the right PIA shows
          const staffId = params.get("staffId");
          if (staffId) {
            window.localStorage.setItem("dashboard-bot-staff", staffId);
          }
          // Pre-set the active view (sales/today/csat) for the table
          const view = params.get("view");
          if (view) {
            window.localStorage.setItem("dashboard-bot-view", view);
          }
          // Strip bot params from URL to avoid noise
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
        } catch {
          // ignore
        }
      }
    }
  }
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

function AppGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c2722] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Force password change on first login (admin seed + PIA sync set this flag)
  if (user.mustChangePassword) {
    return <ChangePasswordGate />;
  }

  return <AppInternal role={user.role} userOfficerId={user.officerId} />;
}

function AppInternal({
  role,
  userOfficerId,
}: {
  role: "admin" | "pia";
  userOfficerId: string | null;
}) {
  const { user, logout, isPia } = useAuth();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<
    "home" | "staff" | "settings" | "reports" | "kpi_preset" | "analysis" | "trends" | "runrate" | "commission"
  >("home");
  useEffect(() => {
    if (currentView === "settings") preloadSettingsSection();
  }, [currentView]);
  // มือถือ: ใช้ได้แค่หน้าหลัก + หน้าพนักงาน (หน้าอื่นเปิดบนคอม)
  useEffect(() => {
    if (isMobile && currentView !== "home" && currentView !== "staff") setCurrentView("home");
  }, [isMobile, currentView]);

  // Light / dark theme. Applied as a `theme-light` class on <html> so a
  // small set of CSS overrides (index.css) can re-map the dark palette.
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem("theme");
      // ค่าเดิม "dark" / "light" ยังใช้ได้
      return findTheme(saved).id;
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const [parsedReport, setParsedReport] = useState<ParsedReport>(fallbackReport);
  const [uploadedFiles, setUploadedFiles] = useState<Record<UploadKind, RawRow[]>>({ target: [], current: [], today: [], lastMonth: [], lastYear: [], categoryMaster: [] });
  const [selectedBranch, setSelectedBranch] = useState<string>("Mega Bangna");
  const [selectedBranchLoaded, setSelectedBranchLoaded] = useState(false);
  const [categoryTargetOverrides, setCategoryTargetOverrides] = useState<
    Record<string, number>
  >({});
  const loadCategoryTargetOverrides = React.useCallback(async () => {
    if (!selectedBranch) return;
    try {
      const res = await fetch(
        `/api/category-target-overrides?branch=${encodeURIComponent(selectedBranch)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, number> = {};
      for (const [cat, v] of Object.entries(data.overrides ?? {})) {
        map[cat] = Number((v as any).target);
      }
      setCategoryTargetOverrides(map);
    } catch (e) {
      console.warn("[App] loadCategoryTargetOverrides failed:", e);
    }
  }, [selectedBranch]);

  const [tradeInData, setTradeInData] = useState<TradeInResult | undefined>(
    undefined,
  );
  const [csatData, setCsatData] = useState<CsatResult | undefined>(undefined);
  const [ufundData, setUfundData] = useState<UfundResult | undefined>(undefined);
  const [csatError, setCsatError] = useState<
    { code: "auth" | "no_token" | "error"; message: string } | undefined
  >(undefined);
  const [tradeBranchMapping, setTradeBranchMapping] = useState<
    Record<string, string>
  >(() => getTradeBranchMapping());

  // Hydrate the Trade In branch mapping from Turso so it follows the user
  // across devices (localStorage above is just the instant device cache).
  useEffect(() => {
    let cancelled = false;
    void fetchTradeBranchMappingFromCloud().then((cloud) => {
      if (!cancelled && cloud) setTradeBranchMapping(cloud);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // รุ่น iPhone ที่ผู้ใช้ติ๊กไม่นับยอด (ตัวเครื่องเท่านั้น) — ตัดออกจากการคำนวณทั้งหมด
  // ค่าเดิมของปุ่ม "ตัด iPhone 18" ย้ายมาเป็นรุ่นตระกูล 18 ทั้งหมด
  const [excludedIphoneModels, setExcludedIphoneModels] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("dashboard-exclude-iphone-models");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
      return localStorage.getItem("dashboard-exclude-iphone18") === "1" ? [...LEGACY_IPHONE18_MODELS] : [];
    } catch {
      return [];
    }
  });
  const excludedIphoneModelSet = useMemo(() => new Set(excludedIphoneModels), [excludedIphoneModels]);
  const excludingIphoneModels = excludedIphoneModelSet.size > 0;

  const [kpiPresets, setKpiPresets] = useState<KpiPreset[]>([]);

  const updateExcludedIphoneModels = (next: string[]) => {
    setExcludedIphoneModels(next);
    try {
      localStorage.setItem("dashboard-exclude-iphone-models", JSON.stringify(next));
      localStorage.removeItem("dashboard-exclude-iphone18");
    } catch {
      /* ignore */
    }
  };

  // หมวดที่ผู้ใช้เลือกให้หมวดย่อยใหม่ที่ Category Master ยังไม่มี (แชร์ผ่าน cloud)
  const [categoryOverrides, setCategoryOverridesState] = useState<CategoryOverrides>(() => getCategoryOverrides());
  useEffect(() => {
    let cancelled = false;
    void fetchCategoryOverridesFromCloud().then((cloud) => {
      if (!cancelled && cloud) setCategoryOverridesState(cloud);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const saveCategoryOverrides = (changes: CategoryOverrides) => {
    setCategoryOverridesState(setCategoryOverrides(changes));
  };

  const handleBranchChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    void idbSet("dashboard-selected-branch", newBranch).catch((e) =>
      console.warn("[App] persist selectedBranch failed:", e),
    );
  };

  // Branch-filtered sales rows (Demo iPhone → หมวด iPhone) BEFORE the model
  // exclusion — the base for the model picker and the "latest day".
  const branchSalesRows = useMemo(
    () => ({
      current: normalizeDemoIphoneRows(filterRowsByBranch(uploadedFiles.current, selectedBranch)),
      today: normalizeDemoIphoneRows(filterRowsByBranch(uploadedFiles.today ?? [], selectedBranch)),
      lastMonth: normalizeDemoIphoneRows(filterRowsByBranch(uploadedFiles.lastMonth, selectedBranch)),
      lastYear: normalizeDemoIphoneRows(filterRowsByBranch(uploadedFiles.lastYear, selectedBranch)),
    }),
    [uploadedFiles, selectedBranch],
  );

  // หมวดย่อยใหม่ที่ master ยังไม่มี → เดาจาก Sub อื่นใน Category เดียวกัน /
  // ใช้หมวดที่ผู้ใช้เลือก แล้วต่อท้าย master เป็นแถวเสริม
  const unmappedCategoryPairs = useMemo(
    () =>
      findUnmappedCategoryPairs(
        {
          current: branchSalesRows.current,
          others: [branchSalesRows.today, branchSalesRows.lastMonth, branchSalesRows.lastYear],
        },
        uploadedFiles.categoryMaster,
      ),
    [branchSalesRows, uploadedFiles.categoryMaster],
  );
  const effectiveCategoryMaster = useMemo(() => {
    const extra = buildFallbackMasterRows(unmappedCategoryPairs, categoryOverrides);
    return extra.length ? [...uploadedFiles.categoryMaster, ...extra] : uploadedFiles.categoryMaster;
  }, [uploadedFiles.categoryMaster, unmappedCategoryPairs, categoryOverrides]);

  const iphoneModelOptions = useMemo(() => listIphoneModels(branchSalesRows.current), [branchSalesRows.current]);

  // ปรับเป้าเพิ่ม (Stretch Target) — ตั้งใน Settings
  const [targetUplift, setTargetUplift] = useState<TargetUplift>({ ...EMPTY_TARGET_UPLIFT });
  useEffect(() => {
    const load = () =>
      void fetchTargetUplift().then((c) =>
        setTargetUplift((prev) => (JSON.stringify(prev) === JSON.stringify(c) ? prev : c)),
      );
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const displayUploads = useMemo<Record<UploadKind, RawRow[]>>(() => {
    // Optionally drop the ticked iPhone models (devices only) from every
    // calculation (single chokepoint — all tables/KPIs read from displayUploads).
    const strip = (rows: RawRow[]) =>
      excludingIphoneModels ? rows.filter((r) => !isExcludedIphoneDeviceRow(r, excludedIphoneModelSet)) : rows;
    return {
      target: applyTargetUplift(filterRowsByBranch(uploadedFiles.target, selectedBranch), targetUplift),
      current: strip(branchSalesRows.current),
      today: strip(branchSalesRows.today),
      lastMonth: strip(branchSalesRows.lastMonth),
      lastYear: strip(branchSalesRows.lastYear),
      categoryMaster: effectiveCategoryMaster,
    };
  }, [uploadedFiles.target, branchSalesRows, selectedBranch, excludedIphoneModelSet, effectiveCategoryMaster, targetUplift]);

  // Branch-filtered but WITHOUT the model exclusion — used to pick the
  // "latest day" so toggling the filter never changes which date is shown.
  const currentRowsAllModels = branchSalesRows.current;

  // ⚡ แยกบิลจากยอดขายทั้งเดือน "ครั้งเดียว" แล้วให้ทุกตารางใช้ร่วมกัน
  // (เดิมแต่ละตาราง enrich + parseBills เองซ้ำ ~10 รอบต่อการคำนวณ)
  const catDailyLookupShared = useMemo(
    () => buildCatDailyLookup(displayUploads.categoryMaster),
    [displayUploads.categoryMaster],
  );
  const enrichedCurrentShared = useMemo(
    () => enrichSalesRowsWithCatDaily(displayUploads.current, catDailyLookupShared),
    [displayUploads.current, catDailyLookupShared],
  );
  const currentBillsShared = useMemo(() => parseBills(enrichedCurrentShared), [enrichedCurrentShared]);
  /** วันที่ (YYYY-MM-DD) ของบิล — ใช้แถวแรกของบิล (ทุกแถวในบิลวันเดียวกัน) */
  const billDayKey = React.useCallback((b: BillSummary): string => {
    const p = parseDocDate(String(b.lineItems[0]?.["Doc Date"] ?? b.lineItems[0]?.["doc date"] ?? ""));
    return p
      ? `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`
      : "";
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (displayUploads.categoryMaster) {
      displayUploads.categoryMaster.forEach((row) => {
        const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
        const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
        if (key) map.set(key, value);
      });
    }
    return map;
  }, [displayUploads.categoryMaster]);

  // ⚡ getCategory ต้องคงที่ (useCallback) — ถ้าสร้างใหม่ทุก render ทุก useMemo ที่
  // ผูกกับมันจะคำนวณยอดขายทั้งเดือนใหม่ทุกครั้งที่กดแท็บ/เปลี่ยน state
  // + cache ผลต่อแถว (แถวเดียวกันถูกถามซ้ำหลายสิบรอบจากหลายตาราง)
  const categoryCache = useMemo(() => new WeakMap<RawRow, string>(), [categoryMap]);
  const getCategory = React.useCallback((row: RawRow): string => {
    const hit = categoryCache.get(row);
    if (hit !== undefined) return hit;
    const v = computeCategory(row);
    categoryCache.set(row, v);
    return v;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryCache]);

  function computeCategory(row: RawRow): string {
    const cat = String(row["Category (Name)"] ?? row.category_name ?? row.Category ?? "").trim();
    const sub = String(row["Sub Category"] ?? row.sub_category ?? row.SubCategory ?? "").trim();
    const prod = String(row["Product (Name)"] ?? row.product_name ?? row.Product ?? "").trim();
    
    // หมวดตัวเครื่องยึดคอลัมน์ Category (Name) ของไฟล์ขายก่อนเสมอ (ตรงกับระบบ
    // บริษัท) — กัน Category Master จับ iPhone บางรุ่นไปหมวดอื่น/คีย์ชนกัน
    const rawDevice = RAW_DEVICE_CATEGORY[cat.toLowerCase()];
    if (rawDevice) return rawDevice;

    const keyCombo = normalizeText(`${cat}${sub}`);
    const keyCat = normalizeText(cat);
    const keyProd = normalizeText(prod);
    
    const mapped = categoryMap.get(keyCombo) ?? 
                   categoryMap.get(keyCat) ?? 
                   categoryMap.get(keyProd);
                   
    if (mapped) {
      const normalizedMapped = mapped.trim();
      const lower = normalizedMapped.toLowerCase();
      if (lower === "btb apple" || lower === "btb(apple)") {
        return "BTB(Apple)";
      }
      // Canonicalize device-group labels: a new month's Category Master may
      // map Mac products to a variant name ("MacBook", "Notebook", "MAC")
      // that isn't exactly "Mac" — normalize those back so the category KPIs
      // still count. Device names are mutually exclusive.
      const m = normalizeText(normalizedMapped);
      // master จัดอุปกรณ์เสริม (เคส/ฟิล์ม "for iPhone") ไว้กลุ่มตัวเครื่อง —
      // ระบบบริษัทนับหมวดตัวเครื่องเฉพาะ Category = ตัวเครื่อง → ไม่นับเข้า
      // (ไปอยู่ "อื่นๆ" แทน)
      const isDeviceGroup =
        m.includes("iphone") || m.includes("ipad") || m.includes("mac") || m.includes("notebook") || m.includes("watch");
      if (isDeviceGroup && cat) return "Accessories";
      if (m.includes("iphone")) return "iPhone";
      if (m.includes("ipad")) return "iPad";
      if (m.includes("macbook") || m.includes("imac") || m.includes("mac") || m.includes("notebook"))
        return "Mac";
      if (m.includes("apple watch") || m.includes("watch")) return "Apple Watch";
      return normalizedMapped;
    }

    // ไม่มีใน Category Master (เช่น หมวดย่อยใหม่ CASING IPHONE 18 PRO MAX /
    // CAMERA FILM) → เดาจากข้อความ แต่ห้ามจัดอุปกรณ์เสริมเข้าหมวดตัวเครื่อง
    // เพราะชื่อมีคำว่า "iPhone" (ตัวเครื่องจริงถูกจับจาก Category ด้านบนแล้ว)
    const guessed = mapTargetCategoryKey(cat, sub, prod);
    if (cat && ["iPhone", "iPad", "Mac", "Apple Watch"].includes(guessed)) return "Accessories";
    return guessed;
  }

  const todayRows = useMemo(() => {
    if (displayUploads.today.length) return displayUploads.today;
    if (!displayUploads.current.length) return [];
    // Find the latest date by PARSED TIME (not by string), so rows with
    // mixed formats (e.g. "26/06/2026" vs "26/06/2569" vs "26 Jun 2026")
    // for the same calendar day are all included.
    let maxDateTime = 0;
    displayUploads.current.forEach((row) => {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!rawDate) return;
      const parsed = parseDocDate(rawDate);
      if (parsed && parsed.getTime() > maxDateTime) {
        maxDateTime = parsed.getTime();
      }
    });
    if (!maxDateTime) return [];
    return displayUploads.current.filter((row) => {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      const parsed = parseDocDate(rawDate);
      return parsed ? parsed.getTime() === maxDateTime : false;
    });
  }, [displayUploads.today, displayUploads.current]);

  const todayStats = useTodayStats({ todayRows, parsedReport, getCategory });

  const [activeStat, setActiveStat] = useState<"sales" | "csat" | "target">(
    "sales",
  );
  const [activeStaffId, setActiveStaffId] = useState("1");
  const [staffPhotosLoaded, setStaffPhotosLoaded] = useState(false);
  const [kpiPresetsLoaded, setKpiPresetsLoaded] = useState(false);

  // Bot mode (read from localStorage set by App component):
  // Force "staff" view + select the requested PIA + mark ready when data is loaded.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const botStaff = window.localStorage.getItem("dashboard-bot-staff");
    if (!botStaff) return;
    // Only act once
    if (sessionStorage.getItem("dashboard-bot-active")) return;
    sessionStorage.setItem("dashboard-bot-active", "1");
    setCurrentView("staff");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const botStaff = window.localStorage.getItem("dashboard-bot-staff");
    if (!botStaff) return;
    if (parsedReport.officers.length === 0) return;
    const idx = parsedReport.officers.findIndex((o) => o.staffId === botStaff);
    if (idx >= 0) {
      setActiveStaffId(String(idx + 1));
      setCurrentView("staff");
      // Apply bot view override (sales / target / csat)
      const botView = window.localStorage.getItem("dashboard-bot-view");
      if (botView === "target" || botView === "csat" || botView === "sales") {
        setActiveStat(botView);
      }
      // Clean up localStorage so subsequent loads are clean
      setTimeout(() => {
        try {
          window.localStorage.removeItem("dashboard-bot-staff");
          window.localStorage.removeItem("dashboard-bot-view");
        } catch {}
      }, 5000);
    }
  }, [parsedReport.officers]);

  // Bot mode: mark screenshot-ready when KPI presets + staff photos + officers
  // all loaded (so 7 Wonders table and avatar render correctly). Safety timeout
  // at 10s ensures screenshots still trigger even if a load hangs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const botStaff = window.localStorage.getItem("dashboard-bot-staff");
    if (!botStaff) return;
    if (parsedReport.officers.length === 0) return;
    if (!kpiPresetsLoaded || !staffPhotosLoaded) return;

    // Everything is loaded — wait a bit more for chart animation to settle
    const t = setTimeout(() => {
      document.body.setAttribute("data-bot-ready", "1");
    }, 1500);
    return () => clearTimeout(t);
  }, [parsedReport.officers, kpiPresetsLoaded, staffPhotosLoaded]);

  // Bot mode: safety fallback — if presets/photos take longer than 10s,
  // mark ready anyway so screenshots don't hang indefinitely.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const botStaff = window.localStorage.getItem("dashboard-bot-staff");
    if (!botStaff) return;
    if (parsedReport.officers.length === 0) return;
    if (kpiPresetsLoaded && staffPhotosLoaded) return;

    const t = setTimeout(() => {
      document.body.setAttribute("data-bot-ready", "1");
      console.warn("[bot] data-bot-ready safety fallback triggered after 10s");
    }, 10000);
    return () => clearTimeout(t);
  }, [parsedReport.officers, kpiPresetsLoaded, staffPhotosLoaded]);

  // PIA: auto-select their own officer + force "staff" view + restrict navigation
  useEffect(() => {
    if (role !== "pia") return;
    const officers = parsedReport.officers;
    if (officers.length === 0) return;
    // Match by name — `userOfficerId` is the emp_id but OfficerPerformance
    // does not carry an emp_id field, only `name` and `branch`. The PIA's
    // `user.name` was set from the same officer record so it matches.
    const piaName = (user?.name ?? "").trim();
    const ownIndex = piaName
      ? officers.findIndex((o) => matchesOfficer(o.name ?? "", piaName))
      : -1;
    const newId = ownIndex >= 0 ? String(ownIndex + 1) : "1";
    if (activeStaffId !== newId) setActiveStaffId(newId);
    if (currentView !== "staff" && currentView !== "home") {
      setCurrentView("staff");
    }
  }, [role, userOfficerId, user, parsedReport.officers, activeStaffId, currentView]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("iPhone");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // เวลาที่อัปโหลดไฟล์ยอดขาย (current) เข้าระบบล่าสุด — โชว์ในตารางรายงานรายวัน
  const [salesUploadedAt, setSalesUploadedAt] = useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState<Record<UploadKind, boolean>>({
    target: false,
    current: false,
    today: false,
    lastMonth: false,
    lastYear: false,
    categoryMaster: false,
  });
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<UploadKind, string>>({
    target: "",
    current: "",
    today: "",
    lastMonth: "",
    lastYear: "",
    categoryMaster: "",
  });
  const [uploadStatus, setUploadStatus] = useState<{
    ok: boolean;
    message: string;
    summary?: Record<string, number>;
    errors?: Array<{ kind: string; error: string }>;
  } | null>(null);
  const [sheetBranches, setSheetBranches] = useState<string[]>([]);

  const [homeTab, setHomeTab] = useState<"monthly" | "today">("monthly");
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [staffPhotos, setStaffPhotos] = useState<StaffPhotosMap>({});
  const [staffPhotoError, setStaffPhotoError] = useState<string | null>(null);
  // STAFF IDs hidden from the Staff Profile page (e.g. non-sales roles)
  const [hiddenStaffIds, setHiddenStaffIds] = useState<string[]>([]);
  useEffect(() => {
    void fetchHiddenStaffIds().then(setHiddenStaffIds);
  }, []);
  // จำนวนพนักงานหลังบ้านต่อตำแหน่ง (ตั้งค่าในหน้า Settings)
  const [backOfficeCfg, setBackOfficeCfg] = useState<BackOfficeConfig>({
    counts: EMPTY_BACK_OFFICE_COUNTS,
    rates: {},
  });
  useEffect(() => {
    void fetchBackOfficeConfig().then((cfg) =>
      setBackOfficeCfg({
        counts: { ...EMPTY_BACK_OFFICE_COUNTS, ...cfg.counts },
        rates: cfg.rates ?? {},
      }),
    );
  }, []);
  // โหมด x2 (Attach Boost) — ตั้งใน Settings
  const [attachBoost, setAttachBoost] = useState<AttachBoost>({ ...EMPTY_ATTACH_BOOST });
  useEffect(() => {
    // โหลดค่าใหม่ตอนเปิดเว็บ + ทุกครั้งที่กลับมาที่แท็บ + ทุก 2 นาที
    // (ตั้งค่าจากอีกเครื่อง/อีกแท็บ หน้าที่เปิดค้างไว้จะได้ค่าล่าสุดเสมอ)
    const load = () =>
      void fetchAttachBoost().then((b) =>
        setAttachBoost((prev) => (JSON.stringify(prev) === JSON.stringify(b) ? prev : b)),
      );
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const iv = window.setInterval(load, 2 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(iv);
    };
  }, []);
  const isStaffHidden = React.useCallback(
    (officer: { staffId?: string; name?: string }): boolean => {
      if (!hiddenStaffIds.length) return false;
      const code = String(officer.staffId ?? "").replace(/\D/g, "");
      const nm = cleanOfficerName(officer.name ?? "");
      return hiddenStaffIds.some((h) => {
        const hs = String(h).trim();
        const hd = hs.replace(/\D/g, "");
        if (hd && code && hd === code) return true;
        return cleanOfficerName(hs) === nm && nm.length > 0;
      });
    },
    [hiddenStaffIds],
  );

  // Re-anchor uploaded photos to the STAFF ID in the target file. Photos may
  // have been saved under a name-based key (or a previous id) — build a
  // name→STAFF ID map from the target and add an alias entry keyed by that
  // id so lookups by the (stable) target STAFF ID always find the photo,
  // even after a new month's target re-keys the roster.
  const reconciledStaffPhotos = useMemo<StaffPhotosMap>(() => {
    const rows = displayUploads.target;
    if (!rows.length || Object.keys(staffPhotos).length === 0) return staffPhotos;
    const nameToId = new Map<string, string>();
    for (const row of rows) {
      const id = String(row["STAFF ID"] ?? row.staffId ?? "").trim();
      const nm = cleanOfficerName(`${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim());
      if (id && nm) nameToId.set(nm, id);
    }
    if (nameToId.size === 0) return staffPhotos;
    const out: StaffPhotosMap = { ...staffPhotos };
    for (const rec of Object.values(staffPhotos)) {
      const key =
        cleanOfficerName(String((rec as { officerKey?: string }).officerKey ?? "")) ||
        cleanOfficerName(String((rec as { displayName?: string }).displayName ?? ""));
      const targetId = key ? nameToId.get(key) : undefined;
      if (targetId && !out[targetId]?.photoUrl) out[targetId] = rec;
    }
    return out;
  }, [staffPhotos, displayUploads.target]);

  // Load KPI presets from Turso (cloud-backed).
  useEffect(() => {
    void (async () => {
      try {
        const removedKpi = await cleanupKpiPresets();
        if (removedKpi.length > 0) {
          console.info(`[App] removed test KPI presets: ${removedKpi.join(", ")}`);
        }
        const presets = await getKpiPresets();
        setKpiPresets(presets);
        setKpiPresetsLoaded(true);
      } catch (e) {
        console.warn("[App] load KPI presets failed:", e);
        setKpiPresetsLoaded(true);
      }
    })();
  }, []);

  const uniqueCombos = useMemo(() => {
    const combos = new Map<string, { cat: string; sub: string; label: string }>();
    const addCombo = (cat: string, sub: string) => {
      const trimmedCat = cat.trim();
      const trimmedSub = sub.trim();
      if (!trimmedCat) return;
      const key = `${trimmedCat}||${trimmedSub}`;
      if (!combos.has(key)) {
        combos.set(key, {
          cat: trimmedCat,
          sub: trimmedSub,
          label: trimmedSub ? `${trimmedCat} > ${trimmedSub}` : trimmedCat,
        });
      }
    };

    displayUploads.current.forEach((row) => {
      const cat = String(row["Category (Name)"] ?? row.category ?? "").trim();
      const sub = String(row["Sub Category"] ?? row.subcategory ?? "").trim();
      addCombo(cat, sub);
    });

    displayUploads.categoryMaster.forEach((row) => {
      const cat = String(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.Category ?? "").trim();
      const sub = String(row["Sub Category"] ?? row.SubCategory ?? "").trim();
      if (cat.includes("||")) {
        const [c, s] = cat.split("||");
        addCombo(c, s || sub);
      } else {
        addCombo(cat, sub);
      }
    });

    return Array.from(combos.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [displayUploads.current, displayUploads.categoryMaster]);

  const salesHeaders = useMemo<string[]>(() => {
    const headers = new Set<string>([
      "Product (Code)",
      "Product (Name)",
      "Category (Name)",
      "Sub Category",
      "Branch (Name)",
      "Officer (Name)",
      "Doc No",
      "Doc Date",
      "Total Price",
      "ราคาจำหน่าย",
      "ราคาขายตามบิล",
      "Number",
      "Customer (Name)",
      "customerCodes",
      "Customer Code",
    ]);

    if (displayUploads.current && displayUploads.current.length > 0) {
      displayUploads.current.slice(0, 100).forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (
            key !== "id" &&
            key !== "period" &&
            key !== "extra_json" &&
            !key.startsWith("r_")
          ) {
            headers.add(key);
          }
        });
      });
    }
    return Array.from(headers).sort();
  }, [displayUploads.current]);

  const STORAGE_KEY = "dashboard-upload-state-v1"; // legacy localStorage key — only used for one-time migration

  const KIND_LABELS: Record<UploadKind, string> = {
    target: "Target",
    current: "Current",
    today: "Today",
    lastMonth: "Last Month",
    lastYear: "Last Year",
    categoryMaster: "Category Master",
  };

  // Branches present in the uploaded data. Derived from raw uploaded
  // rows (not filtered parsedReport) so that newly uploaded files for
  // a different branch appear immediately in the dropdown.
  const uploadedBranches = useMemo<string[]>(() => {
    const set = new Set<string>();
    const branchCols = ["Branch (Name)", "BRANCH NAME", "BRANCH NAME "];
    const kinds = [uploadedFiles.current, uploadedFiles.target, uploadedFiles.today];
    for (const rows of kinds) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        for (const col of branchCols) {
          const val = String(row[col] ?? "").trim();
          if (val) { set.add(val); break; }
        }
      }
    }
    return Array.from(set).sort();
  }, [uploadedFiles.current, uploadedFiles.target, uploadedFiles.today]);

  // Combined branch list for the dropdown: uploaded first (primary),
  // then the Google-Sheet list (secondary) as a fallback for branches
  // the user might want to switch to even before uploading data.
  const combinedBranches = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const b of uploadedBranches) {
      const key = b.trim().toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); out.push(b); }
    }
    for (const b of sheetBranches) {
      const key = b.trim().toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); out.push(b); }
    }
    return out;
  }, [uploadedBranches, sheetBranches]);

  const currentStaff = emptyStaff;
  const currentOfficer = parsedReport.officers[Number(activeStaffId) - 1] ?? parsedReport.officers[0];
  const activeOfficerIndex = Math.max(Number(activeStaffId) - 1, 0);
  const activeOfficer = parsedReport.officers[activeOfficerIndex] ?? parsedReport.officers[0];

  const attachOfficerRows = useMemo<AttachOfficerRow[]>(() => {
    if (!displayUploads.current.length) return [];
    return computeAttachRateRows({
      currentRows: displayUploads.current,
      targetRows: displayUploads.target,
      categoryMaster: displayUploads.categoryMaster,
      baseCategories: DEFAULT_BASE_CATEGORIES,
      attachCategories: DEFAULT_ATTACH_CATEGORIES,
      kpiTarget: 20,
      filterBranch: "All Branches",
    });
  }, [
    displayUploads.current,
    displayUploads.target,
    displayUploads.categoryMaster,
  ]);



  const dynamicLanguages = useMemo(() => {
    if (!activeOfficer) return "-";
    const branch = activeOfficer.branch ?? "";
    if (branch.includes("World") || branch.includes("Paragon") || branch.includes("Iconsiam")) {
      return (activeOfficerIndex % 2 === 0) ? "TH / EN / CN" : "TH / EN / JP";
    }
    return "TH / EN";
  }, [activeOfficer, activeOfficerIndex]);

  const dynamicExperience = useMemo(() => {
    if (!activeOfficer) return "-";
    const target = activeOfficer.target ?? 0;
    if (target > 1500000) return "5+ Years";
    if (target > 800000) return "3-5 Years";
    return "1-2 Years";
  }, [activeOfficer]);

  const dynamicRole = useMemo(() => {
    if (!activeOfficer) return "-";
    const target = activeOfficer.target ?? 0;
    if (target > 1500000) return "Senior Sales Spec.";
    if (target > 800000) return "Sales Specialist";
    return "Sales Associate";
  }, [activeOfficer]);

  const dynamicExpertise = useMemo(() => {
    if (!displayUploads.current.length || !activeOfficer) {
      return "-";
    }
    const catSales = new Map<string, number>();
    displayUploads.current.forEach((row) => {
      const officerName = String(row["Officer (Name)"] ?? row.Officer ?? "");
      if (attachMatchesOfficer(officerName, activeOfficer.name)) {
        const cat = String(row["Category (Name)"] ?? row.category ?? "Other").trim();
        const amount = toNumber(row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
        if (cat) {
          catSales.set(cat, (catSales.get(cat) ?? 0) + amount);
        }
      }
    });
    if (!catSales.size) {
      return "General Sales";
    }
    let maxCat = "";
    let maxVal = -1;
    catSales.forEach((val, cat) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });
    if (!maxCat) return "General Sales";
    const lower = maxCat.toLowerCase();
    if (lower.includes("iphone")) return "iPhone Specialist";
    if (lower.includes("mac")) return "Mac Specialist";
    if (lower.includes("ipad")) return "iPad Specialist";
    if (lower.includes("watch")) return "Apple Watch Spec.";
    if (lower.includes("sim")) return "SIM & Services Spec.";
    if (lower.includes("btb")) return "Corporate Sales Spec.";
    return `${maxCat} Specialist`;
  }, [displayUploads.current, activeOfficer]);

  const activeOfficerCategoryPerformance = useOfficerCategoryPerformance({ activeOfficer, displayUploads, parsedReport, getCategory, todayRows, catDailyLookupShared, currentBillsShared });

  const activeOfficerTodaySales = useMemo(() => {
    if (!activeOfficer) return 0;
    const total = activeOfficerCategoryPerformance.find((r) => r.category === "Total");
    if (total) return Math.round(total.actualDay);
    return Math.round(activeOfficer.actualDay ?? 0);
  }, [activeOfficer, activeOfficerCategoryPerformance]);

  const categoryPerformanceHint = useMemo(() => {
    if (activeStat === "csat") return null;
    if (activeStat === "target") {
      if (todayStats.dateStr) {
        const source = displayUploads.today.length ? "Today sheet" : "current (วันล่าสุด)";
        return `แสดงยอดขายวันที่ ${todayStats.dateStr} — ${source}`;
      }
      if (!displayUploads.today.length && !displayUploads.current.length) return null;
      return "ไม่พบยอดขายวันนี้ — ซิงก์ Today sheet";
    }
    if (!displayUploads.current.length) return null;
    if (displayUploads.categoryMaster.length > 0) return null;
    const totalRow = activeOfficerCategoryPerformance.find((r) => r.category === "Total");
    if (totalRow && totalRow.actual > 0) return null;
    return "อัปโหลด Category Master (Reports) เพื่อจัดกลุ่มยอดขายตามหมวด — ตอนนี้ยอด Actual อาจไม่ตรงหมวด";
  }, [
    displayUploads.current.length,
    displayUploads.categoryMaster.length,
    activeOfficerCategoryPerformance,
    activeStat,
    todayStats.dateStr,
  ]);

  // Parse officer's bills for preset-based 7 Wonders calculation
  const activeOfficerBills = useMemo<BillSummary[]>(() => {
    if (!activeOfficer) return [];
    const officerName = activeOfficer.name;
    const officerRows = displayUploads.current.filter((row) => {
      const officer = String(row["Officer (Name)"] ?? "").trim();
      return matchesOfficer(officer, officerName);
    });
    if (officerRows.length === 0) return [];
    const lookup = buildCatDailyLookup(displayUploads.categoryMaster);
    const enriched = enrichSalesRowsWithCatDaily(officerRows, lookup);
    return parseBills(enriched);
  }, [activeOfficer, displayUploads.current, displayUploads.categoryMaster]);

  // Per-officer Trade In lookup for the "tradeIn" preset calcType.
  // The Trade API tags each record with SALE_CODE (= STAFF ID) and
  // SALE_NAME, so completed trades can be attributed to each officer.
  const tradeInByOfficer = useMemo(() => {
    // actual = สิ้นสุดประมูล (agreed); target = รายการเทรดทั้งหมด (ประเมิน)
    const byCode = new Map<string, { actual: number; target: number }>();
    const byName = new Map<string, { actual: number; target: number }>();
    for (const s of tradeInData?.perStaff ?? []) {
      const val = { actual: s.actual, target: s.target };
      const code = String(s.code ?? "").replace(/[^0-9]/g, "");
      if (code) byCode.set(code, val);
      const name = cleanOfficerName(s.name ?? "");
      if (name) byName.set(name, val);
    }
    return { byCode, byName };
  }, [tradeInData]);

  const tradeForOfficer = React.useCallback(
    (staffId?: string, name?: string): { actual: number; target: number } => {
      const code = String(staffId ?? "").replace(/[^0-9]/g, "");
      if (code && tradeInByOfficer.byCode.has(code)) {
        return tradeInByOfficer.byCode.get(code) ?? { actual: 0, target: 0 };
      }
      const nm = cleanOfficerName(name ?? "");
      return tradeInByOfficer.byName.get(nm) ?? { actual: 0, target: 0 };
    },
    [tradeInByOfficer],
  );

  // Agreed count (สิ้นสุดประมูล) — used as the tradeIn preset's numerator
  const tradeCountForOfficer = React.useCallback(
    (staffId?: string, name?: string): number => tradeForOfficer(staffId, name).actual,
    [tradeForOfficer],
  );

  // Per-officer uFund lookup (empCode = STAFF ID; API name is first-name only
  // so code match is primary, name is a loose fallback).
  const ufundByOfficer = useMemo(() => {
    const byCode = new Map<string, { total: number; approved: number }>();
    const byName = new Map<string, { total: number; approved: number }>();
    for (const s of ufundData?.perStaff ?? []) {
      const val = { total: s.total, approved: s.approved };
      const code = String(s.empCode ?? "").replace(/[^0-9]/g, "");
      if (code) byCode.set(code, val);
      const nm = cleanOfficerName(s.name ?? "");
      if (nm) byName.set(nm, val);
    }
    return { byCode, byName };
  }, [ufundData]);


  const matchUfund = (
    lut: { byCode: Map<string, { total: number; approved: number }>; byName: Map<string, { total: number; approved: number }> },
    staffId?: string,
    name?: string,
  ): { total: number; approved: number } | undefined => {
    const code = String(staffId ?? "").replace(/[^0-9]/g, "");
    if (code && lut.byCode.has(code)) return lut.byCode.get(code);
    const nm = cleanOfficerName(name ?? "");
    for (const [k, v] of lut.byName) {
      if (k && (nm === k || nm.startsWith(k + " ") || nm.split(" ")[0] === k)) return v;
    }
    return undefined;
  };

  const ufundForOfficer = React.useCallback(
    (staffId?: string, name?: string) => matchUfund(ufundByOfficer, staffId, name),
    [ufundByOfficer],
  );

  // Per-officer CSAT lookup (emp_code = STAFF ID, fallback = name match)
  const csatByOfficer = useMemo(() => {
    const byCode = new Map<string, CsatUser>();
    const byName = new Map<string, CsatUser>();
    for (const u of csatData?.users ?? []) {
      const code = normalizeId(u.empCode);
      if (code) byCode.set(code, u);
      const nm = cleanOfficerName(u.name);
      if (nm) byName.set(nm, u);
    }
    return { byCode, byName };
  }, [csatData]);

  const csatForOfficer = React.useCallback(
    (staffId?: string, name?: string): CsatUser | undefined => {
      const code = normalizeId(staffId ?? "");
      if (code && csatByOfficer.byCode.has(code)) {
        return csatByOfficer.byCode.get(code);
      }
      const nm = cleanOfficerName(name ?? "");
      return csatByOfficer.byName.get(nm);
    },
    [csatByOfficer],
  );

  const iphoneUnitsFromBills = React.useCallback(
    (bills: BillSummary[]): number =>
      bills.reduce(
        (sum, bill) =>
          sum +
          bill.lineItems.reduce(
            (s, li) =>
              rowMatchesKpiCategory(li, "iPhone")
                ? s + toNumber(li["Number"] ?? li.number ?? li.qty)
                : s,
            0,
          ),
        0,
      ),
    [],
  );

  // Compute KPI results for presets marked showInStaffProfile
  const activeOfficerPresetResults = useMemo<PresetResult[]>(() => {
    if (activeOfficerBills.length === 0) return [];
    const staffPresets = kpiPresets.filter((p) => p.showInStaffProfile);
    if (staffPresets.length === 0) return [];
    const ctx = {
      tradeInCount: tradeCountForOfficer(activeOfficer?.staffId, activeOfficer?.name),
      iphoneUnits: iphoneUnitsFromBills(activeOfficerBills),
    };
    return staffPresets.map((p) => calcPresetIphoneAcc(activeOfficerBills, p, ctx));
  }, [activeOfficerBills, kpiPresets, activeOfficer, tradeCountForOfficer, iphoneUnitsFromBills]);

  const activeOfficer7WondersPerformance = useMemo<CategoryPerformanceRow[]>(() => {
    if (!activeOfficer) return [];
    const hasPresetResults = activeOfficerPresetResults.length > 0;

    if (hasPresetResults) {
      const rows: CategoryPerformanceRow[] = activeOfficerPresetResults.map((r, idx) => {
        const actualVal = presetDisplayValue(r);
        const preset = kpiPresets.find((p) => p.id === r.presetId);
        const target = preset?.targetPercent ?? 0;
        const achPercent = computePresetAchPercent(r, target);
        return {
          category: `${idx + 1}. ${r.presetName}`,
          target,
          actual: actualVal,
          achPercent,
          forecast: actualVal,
          forecastPercent: achPercent,
          lastMonth: 0,
          momPercent: "New",
          lastYear: 0,
          yoyPercent: "New",
          targetDay: target,
          actualDay: actualVal,
          diffDay: actualVal - target,
          achDayPercent: achPercent,
          actualA: r.billsWithAandB,
          actualB: r.billsWithB,
          calcType: preset?.calcType,
        };
      });

      const totalTarget = rows.reduce((s, r) => s + r.target, 0) / (rows.length || 1);
      const totalActual = rows.reduce((s, r) => s + r.actual, 0) / (rows.length || 1);
      const totalAchPercent = rows.reduce((s, r) => s + r.achPercent, 0) / (rows.length || 1);

      const totalRow: CategoryPerformanceRow = {
        category: "Average",
        target: totalTarget,
        actual: totalActual,
        achPercent: totalAchPercent,
        forecast: totalActual,
        forecastPercent: totalAchPercent,
        lastMonth: 0,
        momPercent: "New",
        lastYear: 0,
        yoyPercent: "New",
        targetDay: totalTarget,
        actualDay: totalActual,
        diffDay: totalActual - totalTarget,
        achDayPercent: totalAchPercent,
      };

      return [...rows, totalRow];
    }

    return [];
  }, [activeOfficer, activeOfficerPresetResults, kpiPresets]);

  const sevenWondersScore = useMemo(() => {
    const wondersRows = activeOfficer7WondersPerformance.filter(r => r.category !== "Average" && r.category !== "Total");
    if (wondersRows.length === 0) return 0;

    // Average the same scaled value used by the radar chart (see
    // dynamicRadarData below) so the centre number and the polygon
    // are always consistent. For percent-based preset types the radar
    // value is (actual/target)*100; for absolute types it is achPercent.
    const sum = wondersRows.reduce((acc, row) => {
      const isPercentPreset =
        row.calcType === "attach" ||
        row.calcType === "bahtRate" ||
        row.calcType === "catAttach" ||
        row.calcType === "tradeIn";
      const v = isPercentPreset && row.target > 0
        ? (row.actual / row.target) * 100
        : row.achPercent;
      return acc + (v || 0);
    }, 0);
    const avg = sum / wondersRows.length;
    return Math.min(100, Math.max(0, Math.round(avg)));
  }, [activeOfficer7WondersPerformance]);

  // Focus Device: the main device (iPhone / iPad / Mac / Apple Watch) the
  // officer is performing WORST at. Shown on the staff profile so they
  // know which device to focus on.
  const focusDevice = useMemo<{ label: string; rate: number } | null>(() => {
    const deviceNames = ["iPhone", "iPad", "Mac", "Apple Watch"];
    const rows = activeOfficerCategoryPerformance.filter((r) =>
      deviceNames.includes(r.category) && r.target > 0,
    );
    if (rows.length === 0) return null;
    let worst: { label: string; rate: number } | null = null;
    rows.forEach((row) => {
      const rate = row.achPercent;
      if (!worst || rate < worst.rate) {
        worst = { label: row.category, rate };
      }
    });
    return worst;
  }, [activeOfficerCategoryPerformance]);

  // Focus Wonder: the 7-Wonder KPI the officer is performing WORST at.
  // Shown on the staff profile so they know which attach metric to focus on.
  const focusWonder = useMemo<{ label: string; rate: number } | null>(() => {
    const wondersRows = activeOfficer7WondersPerformance.filter(
      (r) => r.category !== "Average" && r.category !== "Total",
    );
    if (wondersRows.length === 0) return null;
    let worst: { label: string; rate: number } | null = null;
    wondersRows.forEach((row) => {
      const isPercentPreset =
        row.calcType === "attach" ||
        row.calcType === "bahtRate" ||
        row.calcType === "catAttach" ||
        row.calcType === "tradeIn";
      const rate = isPercentPreset && row.target > 0
        ? (row.actual / row.target) * 100
        : row.achPercent;
      const label = row.category.replace(/^\d+\.\s*/, "").trim();
      if (!worst || rate < worst.rate) {
        worst = { label, rate };
      }
    });
    return worst;
  }, [activeOfficer7WondersPerformance]);

  // Branch Overview: per-officer KPI results for presets marked showInBranchOverview
  const branchOverviewKpiData = useMemo<{
    presets: KpiPreset[];
    rows: { officer: { name: string; branch: string }; results: Record<string, number> }[];
  }>(() => {
    const branchPresets = kpiPresets.filter((p) => p.showInBranchOverview);
    if (branchPresets.length === 0) return { presets: [], rows: [] };
    if (displayUploads.current.length === 0) return { presets: branchPresets, rows: [] };

    const allBills = currentBillsShared;

    const officerList = parsedReport.officers.length > 0
      ? parsedReport.officers
      : Array.from(
          new Map(
            allBills
              .filter((b) => b.officerName)
              .map((b) => [b.officerName, { name: b.officerName, branch: b.branchName }]),
          ).values(),
        );

    const rows: { officer: { name: string; branch: string }; results: Record<string, number> }[] =
      officerList
        .map((officer) => {
          const officerBills = allBills.filter((b) =>
            matchesOfficer(b.officerName, officer.name),
          );
          if (officerBills.length === 0) return null;
          const ctx = {
            tradeInCount: tradeCountForOfficer(
              (officer as { staffId?: string }).staffId,
              officer.name,
            ),
            iphoneUnits: iphoneUnitsFromBills(officerBills),
          };
          const results: Record<string, number> = {};
          branchPresets.forEach((p) => {
            const r = calcPresetIphoneAcc(officerBills, p, ctx);
            results[p.id] = presetDisplayValue(r);
          });
          return { officer, results };
        })
        .filter((r): r is { officer: { name: string; branch: string }; results: Record<string, number> } => r !== null)
        .sort((a, b) => {
          const aTotal = Object.values<number>(a.results).reduce((s, v) => s + v, 0);
          const bTotal = Object.values<number>(b.results).reduce((s, v) => s + v, 0);
          return bTotal - aTotal;
        });

    return { presets: branchPresets, rows };
  }, [kpiPresets, displayUploads.current, displayUploads.categoryMaster, parsedReport.officers, tradeCountForOfficer, iphoneUnitsFromBills]);

  // Home: ตารางรวมยอดขายแยกตามหมวด (เหมือน staff profile) + 7 Wonders
  // ในตารางเดียว ลิสต์เป็นรายเจ้าหน้าที่
  const combinedOfficerKpiData = useCombinedOfficerKpi({
    kpiPresets,
    displayUploads,
    parsedReport,
    getCategory,
    tradeCountForOfficer,
    tradeForOfficer,
    ufundForOfficer,
    iphoneUnitsFromBills,
    csatForOfficer,
    currentBillsShared,
  });



  // ─── ค่าคอมมิชชั่น (PIA Individual) ─────────────────────────────────────
  // "" = เลือกช่วงอัตโนมัติจากเป้ารวมของร้าน
  const [commissionBandId, setCommissionBandId] = useState<string>(() => {
    try {
      return localStorage.getItem("dashboard-commission-band") ?? "";
    } catch {
      return "";
    }
  });
  const [commissionNewScheme, setCommissionNewScheme] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dashboard-commission-newscheme") === "1";
    } catch {
      return false;
    }
  });
  // ยอดขายสะสมรายหมวด × อัตราตามขั้น % achievement ของหมวดนั้น
  // เป้ารวมทั้งร้าน — ใช้เลือกช่วง scheme (1-5 / >5-10 / >10-20 / >20-30 / >30 MB)
  // ใช้เป้าของสาขาโดยตรง ไม่ใช่ผลรวมจาก combinedOfficerKpiData เพราะตารางนั้น
  // กรองคนที่ยังไม่มียอดขายออก ทำให้เป้ารวมต่ำกว่าจริง (ช่วงจะเพี้ยนตอนต้นเดือน)
  const storeTargetTotal = useMemo(() => {
    const fromBranches = parsedReport.branches.reduce((s, b) => s + (b.target ?? 0), 0);
    if (fromBranches > 0) return fromBranches;
    return combinedOfficerKpiData.rows.reduce((s, r) => s + (r.catTotal?.target ?? 0), 0);
  }, [parsedReport.branches, combinedOfficerKpiData]);
  const commissionBand = useMemo(
    () => (commissionBandId ? findBandById(commissionBandId) : undefined) ?? findBandByTarget(storeTargetTotal),
    [commissionBandId, storeTargetTotal],
  );

  const commissionRows = useMemo<CommissionStaffRow[]>(() => {
    return combinedOfficerKpiData.rows
      .filter((r) => String((r.officer as { position?: string }).position ?? "").toUpperCase() === "PIA")
      .map((r) => {
        const categories = COMMISSION_CATEGORIES.map((cat) => {
          const c = r.cats[cat];
          return calcCategoryCommission(
            commissionBand,
            cat,
            c?.actual ?? 0,
            c?.target ?? 0,
            commissionNewScheme,
          );
        });
        return {
          name: r.officer.name,
          staffId: (r.officer as { staffId?: string }).staffId,
          branch: r.officer.branch,
          categories,
          totalActual: categories.reduce((s, c) => s + c.actual, 0),
          totalTarget: categories.reduce((s, c) => s + c.target, 0),
          totalCommission: categories.reduce((s, c) => s + c.commission, 0),
        };
      })
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [combinedOfficerKpiData, commissionBand, commissionNewScheme]);

  // หลังบ้าน: ใช้จำนวนคนที่กรอกไว้ในหน้า Settings
  const commissionSplit = useMemo<CommissionSplit>(() => {
    const grossPool = commissionRows.reduce((s, r) => s + r.totalCommission, 0);
    return calcCommissionSplit(grossPool, backOfficeCfg.counts, backOfficeCfg.rates);
  }, [commissionRows, backOfficeCfg]);

  // ค่าคอมที่เซลได้จริง = ก้อนที่เหลือ × สัดส่วนค่าคอมของแต่ละคน
  const commissionSalesRows = useMemo(() => {
    const gross = commissionSplit.grossPool;
    return commissionRows.map((r) => ({
      ...r,
      netCommission:
        gross > 0 ? (commissionSplit.salesPool * r.totalCommission) / gross : 0,
    }));
  }, [commissionRows, commissionSplit]);

  // ─── รายงานยอดขาย + Attach รายวัน (วันล่าสุด) — รวมสาขา + รายคน ──────────
  // ตาราง "รายงานยอดขาย + Attach" — คำนวณ 2 ชุด: วันล่าสุด / ทั้งเดือนล่าสุด
  // ช่วงวันของตาราง "รายงานยอดขาย + Attach รายเดือน" (null = ทั้งเดือน)
  const [monthReportRange, setMonthReportRange] = useState<ReportRange>(null);
  const branchReports = useBranchReports({
    monthRange: monthReportRange,
    displayUploads,
    parsedReport,
    kpiPresets,
    currentRowsAllModels,
    excludedIphoneModelSet,
    excludingIphoneModels,
    attachBoost,
    currentBillsShared,
    billDayKey,
  });
  const dailyBranchReport = branchReports.daily;
  const monthlyBranchReport = branchReports.monthly;
  // ช่วงเวลาที่ขายดี — ยอดเฉลี่ยต่อวันของแต่ละชั่วโมง (ทั้งเดือน)
  const hourlySales = useMemo(() => buildHourlySales(displayUploads.current), [displayUploads.current]);

  // เวลาอัปโหลดไฟล์ยอดขาย — ดึงใหม่ทุกครั้งที่ข้อมูลยอดขายเปลี่ยน (อัปไฟล์ใหม่)
  useEffect(() => {
    if (!uploadedFiles.current.length) return;
    let cancelled = false;
    void fetchTursoStats().then((r) => {
      const raw = r?.stats.current.updatedAt;
      if (cancelled || !raw) return;
      // updated_at ใน Turso เป็น UTC "YYYY-MM-DD HH:MM:SS" → แสดงเวลาไทย
      const d = new Date(String(raw).replace(" ", "T") + "Z");
      if (Number.isNaN(d.getTime())) return;
      setSalesUploadedAt(
        new Intl.DateTimeFormat("th-TH", {
          timeZone: "Asia/Bangkok",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [uploadedFiles.current]);

  // ─── LINE bot snapshot ───────────────────────────────────────────────────
  // บันทึกผลตาราง "รายงานยอดขาย + Attach รายวัน" ไว้ที่ server ให้ LINE bot
  // อ่านไปตอบในกลุ่ม (bot ไม่ต้องคำนวณเอง → ตัวเลขตรงกับหน้าเว็บเสมอ)
  const lastLineSnapshotRef = React.useRef<string>("");
  useEffect(() => {
    if (!dailyBranchReport.latestDate) return;
    const officers = dailyBranchReport.rows.filter((r) => !(r as { isTotal?: boolean }).isTotal);
    if (!officers.length) return;
    const payload = {
      date: dailyBranchReport.latestDate,
      branch: selectedBranch,
      excludeIphone18: excludingIphoneModels,
      boost: boostLabel(attachBoost),
      dashboardUrl: typeof window !== "undefined" ? window.location.origin : "",
      rows: officers.map((r) => {
        const x = r as typeof r & {
          creditedBills?: number;
          requiredCredits?: number;
          iphoneAttachAlert?: boolean;
          iphoneAttachWarn?: boolean;
          coverBills?: number;
          ufundBills?: number;
          simBills?: number;
          staffId?: string;
        };
        // รูปจากหน้า Staff Profile → ส่ง key ของรูปใน DB ให้ bot สร้าง URL รูป
        const photoUrl = getStaffPhotoUrl(reconciledStaffPhotos, {
          staffId: x.staffId,
          officerKey: cleanOfficerName(x.name),
        });
        const photoRec = photoUrl
          ? Object.values(reconciledStaffPhotos).find((p) => p.photoUrl === photoUrl)
          : undefined;
        return {
          name: x.name,
          photoId: photoRec?.staffId ?? "",
          photoVer: String(photoRec?.updatedAt ?? "").replace(/\D/g, "").slice(0, 14),
          totalBaht: Math.round(x.totalBaht),
          iphone: x.iphoneUnit,
          iphoneBills: x.billCount ?? 0,
          credited: x.creditedBills ?? 0,
          required: x.requiredCredits ?? 0,
          qualified: x.qualifiedBills ?? 0,
          cover: x.coverBills ?? 0,
          ufund: x.ufundBills ?? 0,
          sim: x.simBills ?? 0,
          status: x.iphoneAttachAlert ? "red" : x.iphoneAttachWarn ? "yellow" : "green",
        };
      }),
    };
    const key = JSON.stringify(payload);
    if (key === lastLineSnapshotRef.current) return;
    const t = window.setTimeout(() => {
      lastLineSnapshotRef.current = key;
      void fetch("/api/line-webhook?resource=snapshot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: key,
      }).catch(() => {
        lastLineSnapshotRef.current = "";
      });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [dailyBranchReport, selectedBranch, excludedIphoneModels, reconciledStaffPhotos, attachBoost]);

  const dynamicRadarData = useMemo(() => {
    if (activeStat === "csat") {
      const wondersRows = activeOfficer7WondersPerformance.filter(r => r.category !== "Average" && r.category !== "Total");

      return wondersRows.map((row) => {
        const label = row.category.replace(/^\d+\.\s*/, "").trim();
        // For percent-based preset types (attach / bahtRate / catAttach)
        // the raw `actual` is itself a percentage (e.g. COVER+ 29.4% of
        // base). To make the radar chart show progress against the
        // configured target, scale by (actual / target) * 100 so a
        // hit-at-target reads as 100. For absolute preset types (unit /
        // baht / catBaht / catQty) `achPercent` is already the
        // (actual/target)*100 ratio, so use it directly.
        const isPercentPreset =
          row.calcType === "attach" ||
          row.calcType === "bahtRate" ||
          row.calcType === "catAttach" ||
          row.calcType === "tradeIn";
        const scaled = isPercentPreset && row.target > 0
          ? (row.actual / row.target) * 100
          : row.achPercent;
        const displayPct = isPercentPreset ? row.actual : row.achPercent;

        return {
          subject: `${label}|${displayPct.toFixed(1)}%`,
          value: Math.min(100, Math.max(0, Math.round(scaled))),
          fullMark: 100
        };
      });
    } else if (activeStat === "target") {
      const catRows = activeOfficerCategoryPerformance.filter(
        (r) => r.category !== "Total" && r.category !== "Average",
      );

      return catRows.map((row) => {
        const ach = Math.round(row.achDayPercent);

        return {
          subject: `${row.category}|${ach}%`,
          value: Math.min(Math.max(ach, 0), 100),
          fullMark: 100,
        };
      });
    } else {
      const catRows = activeOfficerCategoryPerformance.filter(r => r.category !== "Total" && r.category !== "Average");
      
      return catRows.map((row) => {
        const ach = Math.round(row.achPercent);
        
        return {
          subject: `${row.category}|${ach}%`,
          value: Math.min(Math.max(ach, 0), 100),
          fullMark: 100
        };
      });
    }
  }, [
    activeStat,
    activeOfficerCategoryPerformance,
    activeOfficer7WondersPerformance,
  ]);

  const dynamicScore = useMemo(() => {
    if (dynamicRadarData.length === 0) return 0;
    const sum = dynamicRadarData.reduce((acc, curr) => acc + curr.value, 0);
    return Math.round(sum / dynamicRadarData.length);
  }, [dynamicRadarData]);

  const staffRoster = useMemo(
    () => buildStaffRoster(displayUploads.target, parsedReport.officers, cleanOfficerName),
    [displayUploads.target, parsedReport.officers],
  );

  const derivedHomeStats = useMemo<DerivedHomeStat[]>(() => {
    const totalSales = parsedReport.branches.reduce((sum, branch) => sum + branch.actual, 0);
    const totalTarget = parsedReport.branches.reduce((sum, branch) => sum + branch.target, 0);
    const avgAch = totalTarget ? (totalSales / totalTarget) * 100 : 0;
    const avgRate = parsedReport.officers.length
      ? parsedReport.officers.reduce((sum, officer) => sum + officer.rate, 0) / parsedReport.officers.length
      : 0;
    const totalOfficers = parsedReport.officers.length;
    const lastMonthTotal = parsedReport.branches.reduce((sum, branch) => sum + branch.lastMonth, 0);
    const trendPercent = lastMonthTotal ? ((totalSales - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return [
      {
        label: "ยอดขายเดือนนี้",
        value: `฿${Math.round(totalSales).toLocaleString()}`,
        trend: lastMonthTotal ? `${trendPercent >= 0 ? "+" : ""}${Math.round(trendPercent)}% เทียบทั้งเดือนก่อน` : "",
        icon: DollarSign,
        isUp: trendPercent >= 0,
      },
      {
        label: "ถึงเป้าร้าน",
        value: `${Math.round(avgAch)}%`,
        trend: avgAch >= 100 ? "ถึงเป้าแล้ว" : `ขาดอีก ${Math.round(100 - avgAch)}%`,
        icon: Star,
        isUp: avgAch >= 100,
      },
      {
        label: "เฉลี่ยรายคน",
        value: `${Math.round(avgRate)}%`,
        trend: "ถึงเป้าเฉลี่ยของพนักงาน",
        icon: Smile,
        isUp: true,
      },
      {
        label: "พนักงานขาย",
        value: `${totalOfficers.toLocaleString()} คน`,
        trend: "",
        icon: Users,
        isUp: true,
      },
    ];
  }, [parsedReport]);

  const monthlyPerformance = useMemo(() => {
    const hasData = displayUploads.current.length > 0;

    // Card 1: Overall Score
    let avgScore = 0;
    let scoresList: number[] = [];
    if (parsedReport.officers.length > 0) {
      parsedReport.officers.forEach((officer, index) => {
        const achRate = officer.rate;
        const attachRow = attachOfficerRows.find(row => matchesOfficer(row.name, officer.name));
        const attRate = attachRow ? overallAttachRate(attachRow) : 0;
        
        let soldCategoriesCount = 0;
        if (attachRow && attachRow.attachMap) {
          Object.keys(attachRow.attachMap).forEach((cat) => {
            if ((attachRow.attachMap[cat]?.units ?? 0) > 0) {
              soldCategoriesCount++;
            }
          });
        }
        
        const prodKnowledge = Math.min(Math.max(65 + Math.round(achRate * 0.15) + (soldCategoriesCount * 4), 60), 99);
        const custService = Math.min(Math.max(80 + Math.round(achRate * 0.1) + (index % 3) * 3, 75), 100);
        const upselling = Math.min(Math.max(50 + Math.round(attRate * 1.2), 50), 99);
        const baseUnits = attachRow?.baseUnits ?? 0;
        const communication = Math.min(Math.max(70 + Math.round(Math.min(baseUnits, 100) * 0.2) + (index % 4) * 3, 65), 98);
        const techSupport = Math.min(Math.max(70 + Math.round(achRate * 0.08) + ((index * 7) % 5) * 4, 60), 97);
        const score = Math.round((prodKnowledge + custService + upselling + communication + techSupport) / 5);
        scoresList.push(score);
      });
      if (scoresList.length > 0) {
        avgScore = scoresList.reduce((a, b) => a + b, 0) / scoresList.length;
      }
    }
    
    // Grade mapping
    let grade = "D";
    if (avgScore >= 90) grade = "A";
    else if (avgScore >= 80) grade = "B";
    else if (avgScore >= 70) grade = "C";
    
    // Grade distribution
    let gradeDist = { A: 0, B: 0, C: 0, D: 0 };
    if (scoresList.length > 0) {
      gradeDist = { A: 0, B: 0, C: 0, D: 0 };
      scoresList.forEach(s => {
        if (s >= 90) gradeDist.A++;
        else if (s >= 80) gradeDist.B++;
        else if (s >= 70) gradeDist.C++;
        else gradeDist.D++;
      });
    }
    
    // Low Forecast (<70% achievement rate)
    let lowForecastCount = 0;
    if (parsedReport.officers.length > 0) {
      lowForecastCount = parsedReport.officers.filter(o => o.rate < 70).length;
    }

    // Card 2: Actual Sales
    const totalSales = parsedReport.branches.reduce((sum, b) => sum + b.actual, 0);
    const totalTarget = parsedReport.branches.reduce((sum, b) => sum + b.target, 0);
    const salesAchRate = calcAchievementPct(totalSales, totalTarget);
    
    // Card 3: True Sim
    const simCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("sim")) : 0;
    const iphoneCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("iphone")) : 0;
    const simRate = iphoneCount > 0 ? (simCount / iphoneCount) * 100 : 0;
    
    // Card 4: Case iPhone
    const caseCount = hasData ? countRows(displayUploads.current, (cat, prod, sub) => cat.includes("case") || prod.includes("case") || sub.includes("case")) : 0;
    const caseRate = iphoneCount > 0 ? (caseCount / iphoneCount) * 100 : 0;
    
    // Card 5: UFUND PERSONAL
    const ufundCount = hasData ? countRows(displayUploads.current, (cat, prod, sub, row) => isUfundRow(row)) : 0;
    const ufundBase = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ufund") || cat.includes("personal")) : 0;
    const ufundRate = ufundBase > 0 ? (ufundCount / ufundBase) * 100 : 0;
    
    // Card 6: COVER + (solid card)
    const coverCount = hasData ? countRows(displayUploads.current, (cat, prod) => cat.includes("cover") || cat.includes("care") || prod.includes("cover") || prod.includes("care")) : 0;
    const coverRate = iphoneCount > 0 ? (coverCount / iphoneCount) * 100 : 0;
    
    // Card 7: KPIs Pencil 85%
    const pencilCount = hasData ? countRows(displayUploads.current, (cat, prod) => prod.includes("pencil") || prod.includes("pen")) : 0;
    const ipadCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ipad")) : 0;
    const pencilRate = ipadCount > 0 ? (pencilCount / ipadCount) * 100 : 0;
    
    // Card 8: KPIs Mac 10%
    const macCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("mac")) : 0;
    const macRate = iphoneCount > 0 ? (macCount / iphoneCount) * 100 : 0;
    
    // Card 9: KPIs iPad 30%
    const ipadAttachCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ipad")) : 0;
    const ipadRate = iphoneCount > 0 ? (ipadAttachCount / iphoneCount) * 100 : 0;
    
    // Card 10: KPIs BTB Mix 10%
    const btbSales = hasData ? sumSales(displayUploads.current, (cat) => cat.includes("btb")) : 0;
    const btbTotalSales = totalSales;
    const btbRate = btbTotalSales > 0 ? (btbSales / btbTotalSales) * 100 : 0;
    
    // Card 11: Mac Growth YoY
    const currentMacSales = hasData
      ? parsedReport.categories.find((c) => c.category.toLowerCase() === "mac")?.actual ?? sumSales(displayUploads.current, (cat) => cat.includes("mac"))
      : 0;
    const lastYearMacSales = hasData ? sumSales(displayUploads.lastYear, (cat) => cat.includes("mac")) : 0;
    const macYoYRate = lastYearMacSales > 0 ? ((currentMacSales - lastYearMacSales) / lastYearMacSales) * 100 : 0.00;
    
    // Card 12: Total Sales Growth YoY (same buildReport aggregation as totalSales)
    const currentTotalSales = totalSales;
    const lastYearTotalSales = hasData
      ? parsedReport.branches.reduce((sum, b) => sum + (b.lastYear || 0), 0)
      : 0;
    const totalSalesYoYRate = lastYearTotalSales > 0 ? ((currentTotalSales - lastYearTotalSales) / lastYearTotalSales) * 100 : 0.00;

    return {
      overallScore: { score: avgScore, grade },
      actualSales: { actual: totalSales, target: totalTarget, rate: salesAchRate },
      trueSim: { count: simCount, base: iphoneCount, rate: simRate, target: 15 },
      caseIphone: { count: caseCount, base: iphoneCount, rate: caseRate, target: 60 },
      ufundPersonal: { count: ufundCount, base: ufundBase, rate: ufundRate, target: 7 },
      coverPlus: { count: coverCount, base: iphoneCount, rate: coverRate, target: 25 },
      pencil: { count: pencilCount, base: ipadCount, rate: pencilRate, target: 85 },
      kpisMac: { count: macCount, base: iphoneCount, rate: macRate, target: 10 },
      kpisIpad: { count: ipadAttachCount, base: iphoneCount, rate: ipadRate, target: 30 },
      btbMix: { btbSales, totalSales: btbTotalSales, rate: btbRate, target: 10 },
      macYoY: { actual: currentMacSales, target: lastYearMacSales, rate: macYoYRate, targetRate: 10 },
      totalYoY: { actual: currentTotalSales, target: lastYearTotalSales, rate: totalSalesYoYRate, targetRate: 10 },
      gradeDist,
      lowForecast: lowForecastCount,
    };
  }, [displayUploads, parsedReport, attachOfficerRows]);

  // Enrich sales rows with `catDaily` (from the Category Master) so
  // rowMatchesKpiCategory can use the most reliable signal when picking
  // rows into BTB / BTB(Apple) / COVER+ / AC+ / SIM.
  const enrichedCurrentRows = useMemo(() => {
    if (!displayUploads.categoryMaster?.length) return displayUploads.current;
    return enrichedCurrentShared;
  }, [displayUploads.current, displayUploads.categoryMaster]);

  const enrichedTodayRows = useMemo(() => {
    if (!displayUploads.categoryMaster?.length) return displayUploads.today;
    const lookup = buildCatDailyLookup(displayUploads.categoryMaster);
    return enrichSalesRowsWithCatDaily(displayUploads.today, lookup);
  }, [displayUploads.today, displayUploads.categoryMaster]);

  const categorySnapshotData = useCategorySnapshots({ displayUploads, enrichedCurrentRows, enrichedTodayRows, categoryTargetOverrides, tradeInData, kpiPresets, currentBillsShared });

  // Auto-capture a compact daily snapshot for the trends charts. Keyed by
  // branch + Bangkok date and upserted once per session/day, so simply
  // opening the dashboard each day builds the history.
  const snapshotWrittenRef = useRef<string>("");
  useEffect(() => {
    const branchKey = selectedBranch;
    if (!branchKey) return;
    if (!combinedOfficerKpiData.rows.length) return;
    if (!(monthlyPerformance.actualSales.target > 0)) return;
    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
    }).format(new Date());
    const guard = `${branchKey}|${dayKey}`;
    if (snapshotWrittenRef.current === guard) return;
    snapshotWrittenRef.current = guard;
    // Per-officer metric snapshot (for the day-over-day progress tracker):
    // overall achievement + each category/7-Wonder/CSAT achievement %.
    const isPct = (c?: string) =>
      c === "attach" || c === "bahtRate" || c === "catAttach" || c === "tradeIn";
    const staff = combinedOfficerKpiData.rows.map((r) => {
      const m: Record<string, number> = {};
      for (const cat of combinedOfficerKpiData.categories) {
        const c = r.cats[cat];
        if (c && c.target > 0) m[cat] = Math.round(c.achPercent);
      }
      for (const p of combinedOfficerKpiData.presets) {
        const w = r.wonders[p.id];
        if (w && w.target > 0) {
          const pct = isPct(p.calcType) ? (w.actual / w.target) * 100 : w.achPercent;
          m[p.name] = Math.round(pct);
        }
      }
      if (r.csat && r.csat.billCount > 0)
        m["CSAT"] = Math.round((r.csat.responseCount / r.csat.billCount) * 100);
      return {
        name: r.officer.name,
        overallPct: Math.round(r.catTotal.achPercent),
        m,
      };
    });

    const payload = {
      totalActual: monthlyPerformance.actualSales.actual,
      totalTarget: monthlyPerformance.actualSales.target,
      achPct: monthlyPerformance.actualSales.rate,
      categories: categorySnapshotData.map((c) => ({
        name: c.category,
        actual: c.actual,
        target: c.target,
      })),
      csat: csatData
        ? {
            nps: csatData.overview.npsScore,
            avgScore: csatData.overview.avgScore,
            responseRate: csatData.overview.submitBillPercent,
            submitBill: csatData.overview.submitBill,
            totalBill: csatData.overview.totalBill,
          }
        : null,
      staff,
    };
    void saveTrendSnapshot(branchKey, payload, dayKey);
  }, [
    selectedBranch,
    combinedOfficerKpiData,
    monthlyPerformance,
    categorySnapshotData,
    csatData,
  ]);

  // Day-of-month for the pace banner — from the latest data date in the
  // current upload (so pace reflects the data we actually have), else today.
  const paceInfo = useMemo(() => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    let day = new Date().getDate();
    let best = 0;
    for (const row of displayUploads.current) {
      const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!raw) continue;
      const p = parseDocDate(raw);
      if (p && p.getTime() > best) {
        best = p.getTime();
        year = p.getFullYear();
        month = p.getMonth();
        day = p.getDate();
      }
    }
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { currentDay: Math.min(day, totalDays), totalDays };
  }, [displayUploads.current]);

  // Latest data date (YYYY-MM-DD) in the current upload — for daily API pulls
  const latestDataYmd = useMemo(() => {
    const keys = new Set<string>();
    for (const row of displayUploads.current) {
      const p = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
      if (p) {
        keys.add(
          `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`,
        );
      }
    }
    return latestDayFromKeys(keys);
  }, [displayUploads.current]);


  const [stockStatus, setStockStatus] = useState<StockStatus | undefined>(undefined);
  const loadStock = React.useCallback(() => {
    if (!selectedBranch) return;
    void fetchStock(selectedBranch).then(setStockStatus);
  }, [selectedBranch]);
  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const [runRateWindow, setRunRateWindow] = useState<number>(0); // 0 = MTD, 7 = last 7 days
  const runRateData = useMemo(
    () =>
      computeRunRate(displayUploads.current, getCategory, {
        daysElapsed: paceInfo.currentDay,
        totalDays: paceInfo.totalDays,
        stockByProduct: stockStatus?.map,
        costByProduct: stockStatus?.cost,
        stockItems: stockStatus?.items,
        windowDays: runRateWindow || undefined,
      }),
    [displayUploads.current, getCategory, paceInfo, stockStatus, runRateWindow],
  );

  const salesTrendData = useMemo(() => {
    if (!displayUploads.current.length) {
      return [];
    }

    const dailySales = new Map<string, number>();
    displayUploads.current.forEach((row) => {
      const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
      if (!rawDate) return;
      
      let formattedDate = rawDate;
      const match = rawDate.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
      if (match) {
        formattedDate = `${match[1]}/${match[2]}`;
      } else {
        formattedDate = rawDate.slice(0, 10);
      }
      const val = getCategoryValue(row);
      dailySales.set(formattedDate, (dailySales.get(formattedDate) ?? 0) + val);
    });

    const sortedDates = Array.from(dailySales.keys()).sort((a, b) => {
      const [aD, aM] = a.split("/").map(Number);
      const [bD, bM] = b.split("/").map(Number);
      if (aM !== bM) return aM - bM;
      return aD - bD;
    });

    return sortedDates.slice(-7).map((date, index) => ({
      date,
      sales: Math.round((dailySales.get(date) ?? 0) / 1000),
      index,
    }));
  }, [displayUploads.current]);

  const topPerformingProducts = useMemo(() => {
    if (!displayUploads.current.length) {
      return [];
    }

    const productSales = new Map<string, number>();
    displayUploads.current.forEach((row) => {
      const name = String(row["Product (Name)"] ?? row["Category (Name)"] ?? "Other").trim();
      if (!name || name === "Other") return;
      const val = getCategoryValue(row);
      productSales.set(name, (productSales.get(name) ?? 0) + val);
    });

    const sorted = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const maxVal = sorted[0]?.[1] || 1;
    const colors = ["bg-emerald-400", "bg-emerald-500", "bg-white/40"];
    
    return sorted.map(([name, sales], index) => ({
      name,
      value: Math.round((sales / maxVal) * 100),
      color: colors[index] ?? "bg-white/20",
    }));
  }, [displayUploads.current]);

  const attachCategoryOptions = useMemo(() => getAttachCategoryOptions(displayUploads.categoryMaster), [displayUploads.categoryMaster]);

  // Uploaded photo of the active officer — empty string when there is no
  // real photo (the profile view then renders no image at all).
  const displayStaffAvatar = useMemo(() => {
    if (!activeOfficer) return "";
    const attachRow = attachOfficerRows.find((row) =>
      attachMatchesOfficer(row.name, activeOfficer.name),
    );
    return getStaffPhotoUrl(reconciledStaffPhotos, {
      staffId: attachRow?.staffId,
      officerKey: cleanOfficerName(activeOfficer.name),
    });
  }, [activeOfficer, attachOfficerRows, reconciledStaffPhotos]);

  const parsedStoreHeader = useMemo(() => {
    const matchedBranch = parsedReport.branches.find(b => {
      const bNorm = cleanBranchForMatching(b.label);
      const cNorm = cleanBranchForMatching(selectedBranch);
      return bNorm && cNorm && (bNorm.includes(cNorm) || cNorm.includes(bNorm));
    });
    
    const branchLabel = matchedBranch?.label || selectedBranch;
    
    if (branchLabel.includes(":")) {
      const parts = branchLabel.split(":");
      const idPart = parts[0].replace(/ID/i, "").trim();
      const namePart = parts[1].trim();
      return {
        name: namePart.startsWith("iStudio") || namePart.startsWith("Studio 7") ? namePart : `iStudio ${namePart}`,
        id: idPart,
      };
    }

    return {
      name: branchLabel.startsWith("iStudio") || branchLabel.startsWith("Studio 7")
        ? branchLabel
        : `iStudio ${branchLabel}`,
      id: "10452",
    };
  }, [parsedReport.branches, selectedBranch]);

  const staffLeaderboard = useMemo(() => {
    const ranked = attachOfficerRows.filter(
      (row) => row.baseUnits > 0 || row.totalAttachUnitsForSorting > 0,
    );
    if (ranked.length) return ranked.slice(0, 3);
    return parsedReport.officers
      .slice()
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 3)
      .map((officer) => ({
        id: cleanOfficerName(officer.name),
        name: officer.name,
        branch: officer.branch,
        staffId: 0,
        baseUnits: officer.actual,
        attachMap: {} as AttachOfficerRow["attachMap"],
        totalAttachUnitsForSorting: 0,
      }));
  }, [attachOfficerRows, parsedReport.officers]);

  const activeOfficerInteractions = useMemo(() => {
    const officerName = activeOfficer?.name ?? "";
    if (!displayUploads.current.length || !officerName) return emptyInteractions;

    const formatDocDate = (raw: unknown) => {
      const parsed = parseDocDate(raw);
      if (!parsed) return String(raw ?? "-");
      return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatValue = (row: RawRow) => {
      const amount = toNumber(
        row["ราคาจำหน่าย"] ?? row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice,
      );
      return amount ? amount.toLocaleString() : "-";
    };

    const rows = displayUploads.current
      .filter((row) =>
        attachMatchesOfficer(
          String(row["Officer (Name)"] ?? row.Officer ?? ""),
          officerName,
        ),
      )
      .slice()
      .sort((a, b) => getSalesDate(b) - getSalesDate(a))
      .slice(0, 8)
      .map((row) => {
        const category = String(row["Category (Name)"] ?? row.category ?? "Sales").trim();
        const subCategory = String(row["Sub Category"] ?? "").trim();
        return {
          date: formatDocDate(row["Doc Date"] ?? row["doc date"]),
          type: subCategory || category,
          typeIcon: category.toLowerCase().includes("corporate")
            ? "building"
            : category.toLowerCase().includes("call")
              ? "phone"
              : "user",
          product: String(row["Product (Name)"] ?? row.product ?? "-").trim(),
          status:
            DEFAULT_ATTACH_CATEGORIES.some(
              (cat) =>
                normalizeText(category).includes(normalizeText(cat)) ||
                normalizeText(subCategory).includes(normalizeText(cat)),
            )
              ? "Attached"
              : "Closed Won",
          value: formatValue(row),
        };
      });

    if (!rows.length) return emptyInteractions;
    return {
      sales: rows,
      csat: rows,
      target: rows,
    };
  }, [displayUploads.current, activeOfficer?.name]);

  /**
   * Persist the upload state to IndexedDB (replaces the old
   * localStorage-based persistUploadsLocal). Per-kind save so we
   * don't rewrite the whole 50 MB state when only one file changes.
   */
  const persistUploads = async (
    nextUploads: UploadState,
    kinds?: UploadKind[],
  ) => {
    setIsSaving(true);
    try {
      await saveUploads(nextUploads, kinds);
      setUploadError(null);
    } catch (e) {
      console.error("[App] persistUploads failed:", e);
      setUploadError(
        e instanceof Error
          ? `บันทึกลง Browser ไม่สำเร็จ: ${e.message}`
          : "บันทึกลง Browser ไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const loadPersistedUploads = async (): Promise<UploadState | null> => {
    try {
      const remote = await fetchUploads();
      if (remote && hasUploadData(remote)) return remote;
    } catch (e) {
      console.warn("[App] fetchUploads failed:", e);
    }
    return null;
  };

  const rebuildReport = (
    nextUploads: UploadState,
    options?: { skipPersist?: boolean; changedKinds?: UploadKind[] },
  ) => {
    // Same Demo → iPhone, model exclusion and Category Master fallback as
    // displayUploads so the store totals in parsedReport follow them too.
    const branchRows = (rows: RawRow[]) => normalizeDemoIphoneRows(filterRowsByBranch(rows, selectedBranch));
    const strip = (rows: RawRow[]) =>
      excludingIphoneModels ? rows.filter((r) => !isExcludedIphoneDeviceRow(r, excludedIphoneModelSet)) : rows;
    const filteredTarget = applyTargetUplift(filterRowsByBranch(nextUploads.target, selectedBranch), targetUplift);
    const branchCurrent = branchRows(nextUploads.current);
    const branchToday = branchRows(nextUploads.today ?? []);
    const branchLastMonth = branchRows(nextUploads.lastMonth);
    const branchLastYear = branchRows(nextUploads.lastYear);
    const fallbackMasterRows = buildFallbackMasterRows(
      findUnmappedCategoryPairs(
        { current: branchCurrent, others: [branchToday, branchLastMonth, branchLastYear] },
        nextUploads.categoryMaster,
      ),
      categoryOverrides,
    );

    const report = buildReport(
      filteredTarget,
      strip(branchCurrent),
      strip(branchLastMonth),
      strip(branchLastYear),
      fallbackMasterRows.length ? [...nextUploads.categoryMaster, ...fallbackMasterRows] : nextUploads.categoryMaster,
      "uploaded-data",
      strip(branchToday),
    );
    setParsedReport(report);
    if (!options?.skipPersist) {
      void persistUploads(nextUploads, options?.changedKinds);
    }
  };


  const exportCsv = () => {
    const rows = [
      ["Branch Summary", "Target", "Actual", "Ach%", "Forecast", "Forecast%", "MoM%", "YoY%", "Target/Day", "Diff/Day"],
      ...parsedReport.branches.map((row) => [row.label, row.target, row.actual, row.achPercent?.toFixed(1) ?? "0.0", row.forecast?.toFixed(0) ?? "0", row.forecastPercent?.toFixed(1) ?? "0.0", row.momPercent?.toFixed(1) ?? "0.0", row.yoyPercent?.toFixed(1) ?? "0.0", row.targetPerDay?.toFixed(0) ?? "0", row.diffPerDay?.toFixed(0) ?? "0"]),
      [],
      ["Category Summary", "Actual", "Target", "Share"],
      ...parsedReport.categories.map((row) => [row.category, row.actual, row.target, `${row.share}%`]),
      [],
      ["Officer Summary", "Branch", "Actual", "Target", "Rate"],
      ...parsedReport.officers.map((row) => [row.name, row.branch, row.actual, row.target, `${Math.round(row.rate)}%`]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${parsedReport.fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const emptyUploadState = (): UploadState => ({
    target: [],
    current: [],
    today: [],
    lastMonth: [],
    lastYear: [],
    categoryMaster: [],
  });

  /**
   * Generic file-upload handler for any kind.
   * Routes to the right parser based on kind, persists to IndexedDB,
   * rebuilds the report, and shows a status message.
   */
  const handleUploadFile = async (kind: UploadKind, file: File) => {
    setIsUploadingFile((prev) => ({ ...prev, [kind]: true }));
    setUploadError(null);

    try {
      let rows: RawRow[];
      if (kind === "categoryMaster") {
        rows = await parseCategoryMasterFile(file);
      } else if (kind === "target") {
        rows = await parseTargetExcelFile(file);
      } else {
        // current, today, lastMonth, lastYear — all sales data
        rows = await parseSalesExcelFile(file);
      }

      const nextUploads: UploadState = { ...uploadedFiles, [kind]: rows };
      setUploadedFiles(nextUploads);
      setUploadedFileNames((prev) => ({ ...prev, [kind]: file.name }));

      rebuildReport(nextUploads, { changedKinds: [kind] });

      // After target upload, sync PIA users from the staff list
      if (kind === "target" && rows.length > 0) {
        void syncPiaFromOfficers(
          rows.map((r) => ({
            name: `${r.NAME ?? ""} ${r.SURNAME ?? ""}`.trim() || String(r["STAFF ID"] ?? ""),
            empId: String(r["STAFF ID"] ?? r.emp_id ?? "").trim(),
            branch: String(r["BRANCH NAME"] ?? r["emp_shop_code"] ?? "").trim(),
          })),
        ).catch((e) => console.warn("[App] PIA sync failed:", e));
      }

      setUploadStatus({
        ok: true,
        message: `อัปโหลด ${KIND_LABELS[kind]} สำเร็จ — ${rows.length.toLocaleString()} แถว`,
        summary: { [kind]: rows.length },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `อัปโหลด ${KIND_LABELS[kind]} ไม่สำเร็จ`;
      setUploadError(message);
      setUploadStatus({
        ok: false,
        message: `อัปโหลด ${KIND_LABELS[kind]} ไม่สำเร็จ — ${message}`,
      });
    } finally {
      setIsUploadingFile((prev) => ({ ...prev, [kind]: false }));
    }
  };

  const removeUploadedFile = async (kind: UploadKind) => {
    const nextUploads: UploadState = { ...uploadedFiles, [kind]: [] };
    setUploadedFiles(nextUploads);
    setUploadedFileNames((prev) => ({ ...prev, [kind]: "" }));
    await deleteUploadKind(kind);
    rebuildReport(nextUploads, { skipPersist: true, changedKinds: [kind] });
  };

  const clearAllUploadData = async () => {
    await clearAllUploads();
    // Also clean up legacy localStorage entry if it still exists
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const empty = emptyUploadState();
    setUploadedFiles(empty);
    setUploadedFileNames({
      target: "",
      current: "",
      today: "",
      lastMonth: "",
      lastYear: "",
      categoryMaster: "",
    });
    setParsedReport(emptyReport);
    setUploadError(null);
    setUploadStatus({
      ok: true,
      message: "ลบข้อมูลทั้งหมดเรียบร้อย",
    });
  };

  useEffect(() => {
    void (async () => {
      setIsInitialLoading(true);

      // One-time migration: copy any legacy localStorage data into
      // IndexedDB on first run, then drop the localStorage entry.
      await migrateFromLocalStorage("dashboard-selected-branch");
      await migrateFromLocalStorage("dashboard_7wonder_configs");
      await migrateFromLocalStorage("dashboard-staff-photos-v1");
      await migrateFromLocalStorage(STORAGE_KEY); // legacy upload state

      const [persisted, photos, branchesRes, savedBranch] = await Promise.all([
        loadPersistedUploads(),
        fetchStaffPhotos(),
        fetch("/api/branches").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        idbGet<string>("dashboard-selected-branch"),
      ]);

      if (savedBranch) {
        setSelectedBranch(savedBranch);
      }
      // เครื่องใหม่ (มือถือ/เบราว์เซอร์ที่ไม่เคยเลือกสาขา) ก็ต้องนับว่าโหลดเสร็จ —
      // ไม่งั้นตัวสลับไปสาขาที่มีข้อมูลอัตโนมัติด้านล่างไม่ทำงาน ค้างที่สาขา
      // ค่าเริ่มต้นซึ่งไม่มียอด (หน้าโชว์ ฿0 บนมือถือ ทั้งที่คอมเห็นข้อมูล)
      setSelectedBranchLoaded(true);

      if (photos) setStaffPhotos(photos);
      setStaffPhotosLoaded(true);
      if (branchesRes && branchesRes.ok && Array.isArray(branchesRes.branches)) {
        setSheetBranches(branchesRes.branches);

        // Auto-match the saved selectedBranch to the canonical sheet branch format
        if (savedBranch) {
          const savedNorm = cleanBranchForMatching(savedBranch);
          const matched = branchesRes.branches.find((b: string) => {
            const bNorm = cleanBranchForMatching(b);
            return bNorm && savedNorm && (bNorm.includes(savedNorm) || savedNorm.includes(bNorm));
          });
          if (matched && matched !== savedBranch) {
            setSelectedBranch(matched);
            void idbSet("dashboard-selected-branch", matched);
          }
        }
      }
      if (persisted && hasUploadData(persisted)) {
        setUploadedFiles(persisted);
        rebuildReport(persisted, { skipPersist: true });
      } else {
        setParsedReport(fallbackReport);
      }
      setIsInitialLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (parsedStoreHeader.name) {
      document.title = parsedStoreHeader.name;
    }
  }, [parsedStoreHeader.name]);

  useEffect(() => {
    // Skip the very first render before initial load completes — the
    // init useEffect already calls rebuildReport with the right branch.
    if (!selectedBranchLoaded) return;
    if (uploadedFiles && hasUploadData(uploadedFiles)) {
      rebuildReport(uploadedFiles, { skipPersist: true });
    }
    // model exclusion / category choices are deps so changing them rebuilds the store totals too
  }, [selectedBranch, selectedBranchLoaded, excludedIphoneModels, categoryOverrides, targetUplift]);

  useEffect(() => {
    if (!selectedBranchLoaded) return;
    void loadCategoryTargetOverrides();
  }, [selectedBranch, selectedBranchLoaded, loadCategoryTargetOverrides]);

  // Resolve to a stable string first so the fetch effect below only
  // refires when the effective branch code actually changes (not on every
  // uploads-array identity change).
  const tradeInBranchCode = useMemo(
    () =>
      // 1) explicit user override, 2) the CSAT refId (= real_branch_id ที่
      // Trade API ใช้ เช่น 3015 — อันเดียวกับที่ UFUND/CSAT ใช้แล้วได้ผล),
      // 3) โค้ดจากไฟล์เป้า, 4) จากชื่อสาขา. เดิมข้ามข้อ 2 ทำให้ตอนขึ้นเดือนใหม่
      // ไฟล์เป้าอาจให้ branch_id ผิด (เช่น 1770) แล้ว Trade API คืนค่าว่าง
      tradeBranchMapping[selectedBranch] ||
      csatData?.branch?.refId ||
      getBranchCodeFromTarget(displayUploads.target) ||
      getBranchCodeFromString(selectedBranch),
    [selectedBranch, displayUploads.target, tradeBranchMapping, csatData?.branch?.refId],
  );

  useEffect(() => {
    if (!selectedBranchLoaded) return;
    if (!tradeInBranchCode) {
      setTradeInData(undefined);
      return;
    }
    let cancelled = false;
    // ยึดเดือนตามวันล่าสุดของไฟล์ยอดขาย (ไม่ใช่เดือนปัจจุบัน) — ตอนขึ้นเดือนใหม่
    // ไฟล์ยอดขายอาจยังเป็นเดือนก่อน ถ้าดึงเดือนปัจจุบัน Trade API จะว่าง
    // (ตอนนี้ยิงผ่าน proxy แล้ว ข้อมูลมาครบ จึง anchor ได้ปลอดภัย)
    fetchTradeInData(tradeInBranchCode, latestDataYmd || undefined)
      .then((result) => {
        if (!cancelled) {
          setTradeInData(result);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[App] fetchTradeInData failed:", e);
          setTradeInData(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
    // latestDataYmd ต้องอยู่ใน deps — ข้อมูลยอดขายมักโหลดเสร็จทีหลัง ถ้าไม่ดึงใหม่
    // จะค้างเป็นเดือนผิด (เช่นดึงเดือนปัจจุบันที่ระบบเทรดยังไม่มีข้อมูล → ขึ้น 0)
  }, [tradeInBranchCode, selectedBranchLoaded, latestDataYmd]);

  // CSAT (COM7 backoffice) — store + per-staff satisfaction. Uses the same
  // branch code as Trade In; the API falls back to the first branch the
  // token can see when the code doesn't match.
  useEffect(() => {
    if (!selectedBranchLoaded) return;
    let cancelled = false;
    fetchCsatData(tradeInBranchCode || undefined)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setCsatData(result.data);
          setCsatError(undefined);
        } else {
          // ใช้ Extract บังคับ type แทนการพึ่ง narrowing (กัน type error ที่เคยขึ้น)
          const fail = result as Extract<CsatFetchResult, { ok: false }>;
          setCsatData(undefined);
          setCsatError({ code: fail.code, message: fail.error });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[App] fetchCsatData failed:", e);
          setCsatData(undefined);
          setCsatError({ code: "error", message: String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tradeInBranchCode, selectedBranchLoaded, latestDataYmd]);

  // uFund Tracker — per-staff ยอดยื่น (total) / อนุมัติ (approved). Uses the
  // store ref code (same "3015" as CSAT); public API, no auth.
  useEffect(() => {
    if (!selectedBranchLoaded) return;
    const code =
      csatData?.branch?.refId ||
      getBranchCodeFromTarget(displayUploads.target) ||
      getBranchCodeFromString(selectedBranch);
    if (!code) {
      setUfundData(undefined);
      return;
    }
    let cancelled = false;
    // ยึดเดือนตามวันล่าสุดของข้อมูล (ถ้ามี) ให้ตรงกับที่แดชบอร์ดแสดง —
    // ไม่งั้น API จะคืนเดือนปัจจุบันซึ่งอาจว่างถ้าอัปโหลดข้อมูลเดือนก่อน
    const ufundFetch = latestDataYmd
      ? fetchUfundMonth(code, latestDataYmd)
      : fetchUfundData(code);
    ufundFetch
      .then((result) => {
        if (!cancelled) setUfundData(result);
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[App] fetchUfundData failed:", e);
          setUfundData(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [csatData?.branch?.refId, displayUploads.target, selectedBranch, selectedBranchLoaded, latestDataYmd]);

  // When the user uploads data for a branch that isn't currently
  // selected, auto-switch to the first uploaded branch so the rest of
  // the dashboard immediately reflects the new data.
  useEffect(() => {
    if (!selectedBranchLoaded) return;
    if (!uploadedBranches.length) return;
    // เทียบแบบเดียวกับ filterRowsByBranch (ตัดคำ Studio7/iStudio/รหัส ID ออก)
    // ไม่งั้น "ID251 : Studio 7-Mega-Bangna" กับ "iStudio Mega Bangna" ไม่ตรงกัน
    const current = cleanBranchForMatching(selectedBranch);
    const isInUploaded = Boolean(current) && uploadedBranches.some((b) => {
      const nb = cleanBranchForMatching(b);
      return Boolean(nb) && (nb === current || nb.includes(current) || current.includes(nb));
    });
    if (!isInUploaded) {
      const first = uploadedBranches[0];
      setSelectedBranch(first);
      void idbSet("dashboard-selected-branch", first).catch(() => undefined);
    }
  }, [uploadedBranches, selectedBranchLoaded]);


  const handleStaffPhotoUpload = async (
    entry: { staffId: string; officerKey: string; name: string; branch?: string },
    file: File,
  ) => {
    if (!file.type.startsWith("image/")) {
      setStaffPhotoError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStaffPhotoError("ขนาดรูปภาพต้องไม่เกิน 5MB");
      return;
    }

    setUploadingPhotoId(entry.staffId);
    setStaffPhotoError(null);
    try {
      const photoUrl = await resizeImageFile(file);
      const record = {
        staffId: entry.staffId,
        officerKey: entry.officerKey,
        displayName: entry.name,
        branch: entry.branch,
        photoUrl,
      };
      const saved = await saveStaffPhoto(record);
      setStaffPhotos((prev) => ({ ...prev, [entry.staffId]: record }));
      if (!saved) {
        setStaffPhotoError("บันทึกลงเซิร์ฟเวอร์ไม่สำเร็จ ระบบได้บันทึกไว้ในเบราว์เซอร์ชั่วคราวแล้ว");
      }
    } catch (error) {
      setStaffPhotoError(
        error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ",
      );
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleStaffPhotoRemove = async (staffId: string) => {
    setUploadingPhotoId(staffId);
    setStaffPhotoError(null);
    try {
      await deleteStaffPhoto(staffId);
      setStaffPhotos((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    } catch (error) {
      setStaffPhotoError(
        error instanceof Error ? error.message : "ลบรูปภาพไม่สำเร็จ",
      );
    } finally {
      setUploadingPhotoId(null);
    }
  };

  // Find 1-based indices of PIA officers for "ส่งทั้งหมด" feature
  const piaIndices = parsedReport.officers.reduce<string[]>((acc, o, idx) => {
    if (String(o.position ?? "").toUpperCase() === "PIA") acc.push(String(idx + 1));
    return acc;
  }, []);
  const homeCaptureRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const categorySnapshotRef = useRef<HTMLDivElement>(null);
  // Stat cards + Category KPI Snapshot inside the always-rendered hidden
  // home view — captured at a stable 1200px width regardless of viewport.
  const homeStatsCaptureRef = useRef<HTMLDivElement>(null);
  // "ยอดขายตามหมวด + 7 Wonders รายคน" table inside the hidden home view —
  // captured as its own image when the user hits cap on Home.
  const combinedTableCaptureRef = useRef<HTMLDivElement>(null);
  // Staff profile card element (set by StaffSection) for the camera button.
  const staffProfileCaptureRef = useRef<HTMLDivElement>(null);
  const [staffCaptureProgress, setStaffCaptureProgress] = useState("");

  // ─── ตัวเรนเดอร์รูป (ใช้ร่วม: ปุ่มแคป / ส่ง LINE อัตโนมัติ) ─────────────
  /** แคป element เป็น JPEG — homeStyle เติม padding + พื้นไล่สีเขียวแบบหน้า Home */
  const renderElementJpeg = async (el: HTMLElement, homeStyle: boolean): Promise<string> => {
    const w = Math.max(el.scrollWidth, el.offsetWidth);
    const h = Math.max(el.scrollHeight, el.offsetHeight);
    const pad = homeStyle ? 28 : 0;
    // Inject a <style> element as a CHILD of the element so it travels
    // with the clone into the SVG foreignObject (hides scrollbars/shadows).
    const innerStyle = document.createElement("style");
    innerStyle.textContent = `
      *::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      * { --tw-ring-shadow: 0 0 #0000 !important; --tw-ring-offset-shadow: 0 0 #0000 !important; }
      * { --tw-shadow: 0 0 #0000 !important; }
      * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    `;
    el.appendChild(innerStyle);
    try {
      return await toJpeg(el, {
        quality: 0.94,
        pixelRatio: 1.5,
        cacheBust: false,
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue("--capture-bg").trim() || "#1c2722",
        width: w + pad * 2,
        ...(homeStyle ? { height: h + pad * 2 } : {}),
        style: {
          width: `${w + pad * 2}px`,
          height: homeStyle ? `${h + pad * 2}px` : "auto",
          boxSizing: "border-box",
          overflow: "visible",
          ...(homeStyle
            ? {
                padding: `${pad}px`,
                // พื้นหลังรูปแคปตามธีมที่เลือก
                background:
                  (() => {
                    const el = document.querySelector(".app-panel");
                    if (!el) return "#191917";
                    const cs = getComputedStyle(el);
                    return cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : cs.backgroundColor;
                  })(),
              }
            : {}),
        },
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList?.contains("mix-blend-overlay")) {
            return false;
          }
          return true;
        },
        fetchRequestInit: { mode: "cors" },
      });
    } finally {
      innerStyle.remove();
    }
  };

  /** แคปการ์ด Staff Profile (ต้องใส่ global style ปิด backdrop-filter ก่อนเรียก) */
  const renderStaffCardJpeg = async (el: HTMLElement): Promise<string> => {
    const w = Math.max(el.scrollWidth, el.offsetWidth);
    const h = Math.max(el.scrollHeight, el.offsetHeight);
    const pad = 32;
    return toJpeg(el, {
      quality: 0.92,
      pixelRatio: 1.5,
      cacheBust: false,
      backgroundColor:
        getComputedStyle(document.documentElement).getPropertyValue("--capture-bg").trim() || "#1c2722",
      // Padding is added AROUND the card (w/h + pad*2) so the content
      // stays centered with even margins on every side.
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
      filter: (node) => !(node instanceof HTMLElement && String(node.className).includes("mix-blend-")),
      fetchRequestInit: { mode: "cors" },
    });
  };

  const CAPTURE_GLOBAL_CSS = `
    * { scrollbar-width: none !important; }
    *::-webkit-scrollbar { display: none !important; }
    * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  `;
  const isBranchManagerOfficer = (o: { position?: string }): boolean =>
    /bsm|bm|manager|ผู้จัดการ|จัดการ/i.test(String(o.position ?? "").trim());

  const captureScreen = async () => {
    // On home view, capture the 4 stat cards + Category KPI Snapshot
    const isHome = currentView === "home" && !!homeStatsCaptureRef.current;
    const ts = new Date().toISOString().slice(0, 10);

    // Capture a single element and trigger a download. `homeStyle` adds the
    // padding + green gradient so home cards/table match the on-screen look.
    const captureAndDownload = async (
      el: HTMLElement | null,
      label: string,
      homeStyle: boolean,
    ) => {
      if (!el) return;
      try {
        const dataUrl = await renderElementJpeg(el, homeStyle);
        const link = document.createElement("a");
        link.download = `dashboard-${label}-${ts}.jpeg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("[captureScreen] failed:", e);
      }
    };

    if (isHome) {
      // 1) stat cards + Category KPI Snapshot
      await captureAndDownload(homeStatsCaptureRef.current, "home", true);
      // 2) ยอดขายตามหมวด + 7 Wonders รายคน (แยกเป็นอีก 1 รูป)
      if (combinedTableCaptureRef.current) {
        await captureAndDownload(combinedTableCaptureRef.current, "officers", true);
      }
    } else {
      await captureAndDownload(mainRef.current, currentView === "staff" ? "staff" : currentView, false);
    }
  };

  /**
   * Camera button on the staff view: walk through EVERY officer and
   * download 2 images per person — the KPI (sales) view and the
   * 7 Wonders (csat) view of the profile card — same framing as the
   * "ส่งไป Telegram" captures.
   */
  const captureAllStaffProfiles = async () => {
    if (staffCaptureProgress) return; // already running
    const officers = parsedReport.officers;
    if (!officers.length || !staffProfileCaptureRef.current) {
      // No roster yet — fall back to a plain full-page capture
      await captureScreen();
      return;
    }

    const views: Array<{ stat: "sales" | "csat"; label: string }> = [
      { stat: "sales", label: "KPI" },
      { stat: "csat", label: "7Wonders" },
    ];
    const prevStaffId = activeStaffId;
    const prevStat = activeStat;
    const ts = new Date().toISOString().slice(0, 10);

    const styleTag = document.createElement("style");
    // backdrop-filter renders as a misplaced light patch in html-to-image
    // clones — disable it (and scrollbars) during capture.
    styleTag.textContent = `
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    `;
    document.head.appendChild(styleTag);

    // ข้าม BM (ผู้จัดการร้าน) — แคปเฉพาะพนักงานขาย (ไม่ใช่ตำแหน่งผู้จัดการ)
    const isBranchManager = (o: { position?: string }): boolean => {
      const p = String(o.position ?? "").trim();
      return /bsm|bm|manager|ผู้จัดการ|จัดการ/i.test(p);
    };

    const failed: string[] = [];
    try {
      for (let idx = 0; idx < officers.length; idx++) {
        if (isBranchManager(officers[idx])) continue;
        // ข้ามคนที่ตั้งค่าไม่ให้แสดงในหน้า Staff Profile (Settings → แสดงพนักงาน)
        if (isStaffHidden(officers[idx])) continue;
        setActiveStaffId(String(idx + 1));
        const officerName = officers[idx].name.trim().replace(/\s+/g, "-");
        for (const view of views) {
          setActiveStat(view.stat);
          setStaffCaptureProgress(
            `คนที่ ${idx + 1}/${officers.length} — ${view.label}`,
          );
          // Wait for the profile card + charts to finish animating
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 3500)));
          const el = staffProfileCaptureRef.current;
          if (!el) continue;
          // One failed capture must not abort the rest of the roster
          try {
            const dataUrl = await renderStaffCardJpeg(el);
            const link = document.createElement("a");
            link.download = `staff-${String(idx + 1).padStart(2, "0")}-${officerName}-${view.label}-${ts}.jpeg`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (e) {
            console.error(
              `[captureAllStaffProfiles] ${officerName} ${view.label} failed:`,
              e,
            );
            failed.push(`${officers[idx].name} (${view.label})`);
          }
        }
      }
    } finally {
      styleTag.remove();
      setActiveStaffId(prevStaffId);
      setActiveStat(prevStat);
      setStaffCaptureProgress("");
    }
    if (failed.length) {
      window.alert(
        `แคปไม่สำเร็จ ${failed.length} รูป:\n${failed.join("\n")}\n\nหมายเหตุ: ถ้าไฟล์ไม่ถูกดาวน์โหลด กรุณาอนุญาต "ดาวน์โหลดหลายไฟล์" ในเบราว์เซอร์แล้วลองใหม่`,
      );
    }
  };

  // ─── LINE "report รายวัน": แคปอัตโนมัติแล้วเก็บไว้ให้ bot ──────────────────
  // เมื่อเปิด Dashboard (บนคอม, ไม่ใช่บัญชี PIA) แล้วข้อมูลยอดขายเปลี่ยนจากชุดที่
  // แคปไว้ล่าสุด → แคปรูป Home 2 รูป + Staff Profile รายคน แล้วอัปขึ้น server
  // ให้ LINE bot ตอบกลับด้วยรูปเหล่านี้เมื่อมีคนพิมพ์ "report รายวัน"
  const [lineReportProgress, setLineReportProgress] = useState("");
  const lineReportBusyRef = useRef(false);
  const lineReportDoneSigRef = useRef<string>("");

  const lineReportSig = useMemo(() => {
    if (!dailyBranchReport.latestDate) return "";
    const total = dailyBranchReport.rows.find((r) => (r as { isTotal?: boolean }).isTotal);
    return [
      selectedBranch,
      dailyBranchReport.latestDate,
      displayUploads.current.length,
      Math.round(Number(total?.totalBaht ?? 0)),
    ].join("|");
  }, [dailyBranchReport, selectedBranch, displayUploads.current.length]);

  const autoCaptureForLine = async (sig: string, date: string) => {
    if (lineReportBusyRef.current || staffCaptureProgress) return;
    lineReportBusyRef.current = true;
    const prevView = currentView;
    const prevStaffId = activeStaffId;
    const prevStat = activeStat;
    const styleTag = document.createElement("style");
    styleTag.textContent = CAPTURE_GLOBAL_CSS;
    let ok = false;
    try {
      setLineReportProgress("เริ่มแคปรีพอท…");
      await beginLineReport(date, sig, selectedBranch);
      let seq = 0;

      // 1) Home (วิวซ่อนที่ render ไว้ตลอด — ไม่ต้องสลับหน้า)
      setLineReportProgress("แคปหน้า Home…");
      if (homeStatsCaptureRef.current) {
        const img = await renderElementJpeg(homeStatsCaptureRef.current, true);
        await uploadLineReportImage(seq++, "home", "ภาพรวม + Category KPI", img);
      }
      if (combinedTableCaptureRef.current) {
        const img = await renderElementJpeg(combinedTableCaptureRef.current, true);
        await uploadLineReportImage(seq++, "home", "ยอดขายตามหมวด + 7 Wonders รายคน", img);
      }

      // 2) Staff Profile รายคน (ต้องสลับไปหน้า staff ชั่วคราว)
      const officers = parsedReport.officers
        .map((o, idx) => ({ o, idx }))
        .filter(({ o }) => !isBranchManagerOfficer(o) && !isStaffHidden(o));
      if (officers.length) {
        setCurrentView("staff");
        await new Promise((r) => setTimeout(r, 1500));
        document.head.appendChild(styleTag);
        const views: Array<{ stat: "sales" | "csat"; label: string }> = [
          { stat: "sales", label: "KPI" },
          { stat: "csat", label: "7 Wonders" },
        ];
        for (let i = 0; i < officers.length; i++) {
          const { o, idx } = officers[i];
          setActiveStaffId(String(idx + 1));
          for (const view of views) {
            setActiveStat(view.stat);
            setLineReportProgress(`แคปรายคน ${i + 1}/${officers.length} — ${view.label}`);
            await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 3500)));
            const el = staffProfileCaptureRef.current;
            if (!el) continue;
            try {
              const img = await renderStaffCardJpeg(el);
              await uploadLineReportImage(seq++, "staff", `${o.name} · ${view.label}`, img);
            } catch (e) {
              console.error("[lineReport] staff capture failed", o.name, view.label, e);
            }
          }
        }
      }

      setLineReportProgress("กำลังบันทึก…");
      await finishLineReport(date, sig);
      ok = true;
    } catch (e) {
      console.error("[lineReport] auto capture failed", e);
    } finally {
      styleTag.remove();
      setCurrentView(prevView);
      setActiveStaffId(prevStaffId);
      setActiveStat(prevStat);
      setLineReportProgress("");
      lineReportBusyRef.current = false;
      // สำเร็จ หรือพังก็ตาม — ไม่ลองซ้ำกับข้อมูลชุดเดิมใน session นี้ (กันวนลูป)
      lineReportDoneSigRef.current = sig;
      if (!ok) console.warn("[lineReport] will retry next time the dashboard is opened");
    }
  };

  // กดปุ่ม "ส่งรีพอทเข้า LINE" (ไม่แคปอัตโนมัติแล้ว — ใช้วันละครั้งตอนปิดร้าน)
  const [lineReportDone, setLineReportDone] = useState<string>("");
  const sendLineReportNow = async () => {
    if (lineReportBusyRef.current || !dailyBranchReport.latestDate || !lineReportSig) return;
    if (!parsedReport.officers.length) {
      window.alert("ยังไม่มีข้อมูลพนักงาน — อัปโหลดไฟล์ Target/ยอดขายก่อน");
      return;
    }
    setLineReportDone("");
    await autoCaptureForLine(lineReportSig, dailyBranchReport.latestDate);
    const meta = await fetchLineReportMeta();
    if (meta?.status === "done" && meta.sig === lineReportSig) {
      setLineReportDone(`ส่งแล้ว ${meta.images?.length ?? 0} รูป — พิมพ์ "report" ใน LINE ได้เลย`);
    } else {
      setLineReportDone("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    window.setTimeout(() => setLineReportDone(""), 8000);
  };

  // การ์ดสรุปใต้การ์ดยอด/เป้า — ไม่ซ้ำกับการ์ดใหญ่: ยอดวันล่าสุด + เฉลี่ยรายคน + จำนวนพนักงาน
  const homeStatCards: DerivedHomeStat[] = (() => {
    const t = dailyBranchReport.rows.find((r) => r.isTotal);
    const d = dailyBranchReport.latestDate ? dailyBranchReport.latestDate.split("-").reverse().slice(0, 2).join("/") : "";
    const today: DerivedHomeStat = {
      label: d ? `ยอดวันล่าสุด (${d})` : "ยอดวันล่าสุด",
      value: `฿${Math.round(t?.totalBaht ?? 0).toLocaleString()}`,
      trend: t ? `${t.totalDevice} เครื่อง · iPhone ${t.iphoneUnit}` : "",
      icon: DollarSign,
      isUp: true,
    };
    return [today, ...derivedHomeStats.slice(2)];
  })();
  // ── มือถือ: layout แยก (การ์ด/แถบ) — บนคอมใช้หน้าเดิม ───────────────
  const homePace = {
    actual: monthlyPerformance.actualSales.actual,
    target: monthlyPerformance.actualSales.target,
    currentDay: paceInfo.currentDay,
    totalDays: paceInfo.totalDays,
  };
  const mobileAvatarOf = (name: string, staffId?: string): string | undefined => {
    const sid =
      staffId ?? parsedReport.officers.find((o) => matchesOfficer(o.name ?? "", name))?.staffId;
    return getStaffPhotoUrl(reconciledStaffPhotos, { staffId: sid, officerKey: cleanOfficerName(name) }) || undefined;
  };
  const openStaffByName = (name: string) => {
    const idx = parsedReport.officers.findIndex((o) => matchesOfficer(o.name ?? "", name));
    if (idx >= 0) setActiveStaffId(String(idx + 1));
    setCurrentView("staff");
    window.scrollTo({ top: 0 });
  };
  const mobileStaffList = parsedReport.officers
    .map((o, index) => ({ name: o.name, staffId: o.staffId, index, ach: o.achPercent }))
    .filter((o) => !isStaffHidden(o));
  const mobileStaffRank = (() => {
    if (!activeOfficer) return undefined;
    const sorted = [...mobileStaffList].sort((a, b) => (b.ach || 0) - (a.ach || 0));
    const pos = sorted.findIndex((o) => o.index === activeOfficerIndex);
    return pos >= 0 ? { pos: pos + 1, of: sorted.length } : undefined;
  })();
  const homeFullSections = (
    <>
      <div className="hidden md:flex items-baseline justify-between gap-4 -mt-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-white truncate">{parsedStoreHeader.name}</h1>
          <div className="text-[13px] text-white/50">
            Store ID {parsedStoreHeader.id}
            {dailyBranchReport.latestDate
              ? ` · ข้อมูลถึง ${dailyBranchReport.latestDate.split("-").reverse().join("/")}${dailyBranchReport.lastBillTime ? ` ${dailyBranchReport.lastBillTime} น.` : ""}`
              : ""}
          </div>
        </div>
      </div>
                <HomeDashboardSection
                  derivedHomeStats={homeStatCards}
                  monthlyPerformance={monthlyPerformance}
                  categorySnapshots={categorySnapshotData}
                  branchOverviewKpiData={branchOverviewKpiData}
                  combinedOfficerKpiData={combinedOfficerKpiData}
                  csatOverview={csatData?.overview}
                  csatLowScores={csatData?.lowScores}
                  pace={{
                    actual: monthlyPerformance.actualSales.actual,
                    target: monthlyPerformance.actualSales.target,
                    currentDay: paceInfo.currentDay,
                    totalDays: paceInfo.totalDays,
                  }}
                  categorySnapshotRef={categorySnapshotRef}
                />
                <div className="hidden md:block">
                  <HourlySalesSection data={hourlySales} />
                </div>
                <DailyBranchReportSection data={dailyBranchReport} boost={boostLabel(attachBoost)} uploadedAt={salesUploadedAt} />
                <DailyBranchReportSection data={monthlyBranchReport} boost={boostLabel(attachBoost)} uploadedAt={salesUploadedAt} range={monthReportRange} onRangeChange={setMonthReportRange} />
    </>
  );
  const staffFullView = (
              <StaffSection
                displayStaffAvatar={displayStaffAvatar}
                activeOfficer={activeOfficer}
                currentStaff={currentStaff}
                dynamicRadarData={dynamicRadarData}
                renderCustomTick={renderCustomTick}
                dynamicScore={dynamicScore}
                activeStat={activeStat}
                onSetActiveStat={setActiveStat}
                sevenWondersScore={sevenWondersScore}
                dynamicRole={dynamicRole}
                dynamicExperience={dynamicExperience}
                dynamicExpertise={dynamicExpertise}
                dynamicLanguages={dynamicLanguages}
                focusDevice={focusDevice}
                focusWonder={focusWonder}
                csatUser={csatForOfficer(activeOfficer?.staffId, activeOfficer?.name)}
                csatBillCount={csatForOfficer(activeOfficer?.staffId, activeOfficer?.name)?.totalBill}
                activeOfficer7WondersPerformance={activeOfficer7WondersPerformance}
                activeOfficerCategoryPerformance={activeOfficerCategoryPerformance}
                todaySalesTotal={activeOfficerTodaySales}
                todayDateLabel={todayStats.dateStr}
                 categoryPerformanceHint={categoryPerformanceHint}
                 onSetActiveStaffId={setActiveStaffId}
                 piaIndices={piaIndices}
                 homeCaptureRef={homeCaptureRef}
                 profileCaptureRef={staffProfileCaptureRef}
              />
  );

  return (
    <div className="app-root min-h-screen bg-[#1c2722] p-0 sm:p-4 font-sans text-white md:p-8 flex flex-col items-center">
      {isInitialLoading && (
        <div className="fixed inset-0 z-[999] bg-[#1c2722] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-white/60 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}
      {lineReportProgress ? (
        <div className="fixed inset-0 z-[998] bg-black/40 flex items-end justify-center p-6 pointer-events-auto">
          <div className="rounded-2xl bg-[#0c3123] border border-emerald-400/30 px-5 py-4 shadow-2xl flex items-center gap-3 text-white">
            <div className="w-6 h-6 border-[3px] border-white/20 border-t-emerald-400 rounded-full animate-spin" />
            <div>
              <div className="text-sm font-bold">กำลังแคปรีพอทส่งเข้า LINE</div>
              <div className="text-xs text-white/60">{lineReportProgress} · รอสักครู่ ไม่ต้องกดอะไร</div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="app-panel w-full max-w-[1440px] h-auto min-h-screen sm:min-h-[90vh] bg-gradient-to-br from-[#1b5d44] to-[#123627] rounded-none sm:rounded-[2rem] border-0 sm:border border-white/10 shadow-2xl flex flex-col relative overflow-x-hidden">
        {/* Logo (Absolute Left) */}
        <div className="absolute top-4 left-4 md:top-6 md:left-8 z-50 flex items-center gap-4 pointer-events-auto">
          <img src="/site-logo.09b5daa.svg" alt="Logo" className="h-6 md:h-8" />
        </div>

        {/* Top Navigation (Floating Right) */}
        <header className="absolute top-2.5 right-3 md:top-6 md:right-8 flex justify-end items-center z-50 pointer-events-none">
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            {/* ป้ายเตือนว่ากำลังใช้เป้าที่ปรับเพิ่ม (ตั้งใน Settings) */}
            {upliftLabel(targetUplift) ? (
              <span
                title="กำลังใช้เป้าที่ปรับเพิ่มจากเป้าจริง — ปิดได้ที่ Settings → ปรับเป้าเพิ่ม"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap bg-sky-500/10 border-sky-400/30 text-sky-200"
              >
                <Target className="w-3.5 h-3.5" /> {upliftLabel(targetUplift)}
              </span>
            ) : null}
            {/* ส่งรีพอท (Home + Staff Profile) ให้ LINE bot — กดวันละครั้งตอนปิดร้าน */}
            {!isPia ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => void sendLineReportNow()}
                  disabled={!!lineReportProgress || !dailyBranchReport.latestDate}
                  title="แคปหน้า Home + Staff Profile ทุกคน แล้วเก็บไว้ให้ LINE bot (พิมพ์ report ในกลุ่มเพื่อดูรูป)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors bg-[#06c755]/15 border-[#06c755]/40 text-white hover:bg-[#06c755]/25 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {lineReportProgress ? "กำลังส่ง…" : "ส่ง LINE"}
                </button>
                {lineReportDone ? (
                  <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-[#0c3123] border border-emerald-400/30 px-3 py-1.5 text-[11px] text-emerald-200 ">
                    {lineReportDone}
                  </div>
                ) : null}
              </div>
            ) : null}
            {/* ติ๊กเลือกรุ่น iPhone ที่ไม่นับยอด (ตัดออกจากการคำนวณทุกตาราง) */}
            <div className="hidden md:block">
              <IphoneModelExcludePicker
                options={iphoneModelOptions}
                selected={excludedIphoneModels}
                onChange={updateExcludedIphoneModels}
              />
            </div>
            <nav className="flex items-center space-x-2 lg:space-x-4 bg-white/10  px-4 py-2 rounded-full border border-white/5  hidden md:flex">
              <button
                onClick={() => setCurrentView("home")}
                className={`p-2 rounded-full transition-colors ${currentView === "home" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                title="Home"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("staff")}
                className={`p-2 rounded-full transition-colors ${currentView === "staff" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                title="Staff Profile"
              >
                <User className="w-5 h-5" />
              </button>
              {!isPia && (
                <>
                  <button
                    onClick={() => setCurrentView("reports")}
                    className={`p-2 rounded-full transition-colors ${currentView === "reports" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="Reports"
                  >
                    <PieChart className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("commission")}
                    className={`p-2 rounded-full transition-colors ${currentView === "commission" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="ค่าคอมมิชชั่น (PIA)"
                  >
                    <Wallet className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("kpi_preset")}
                    className={`p-2 rounded-full transition-colors ${currentView === "kpi_preset" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="KPI Preset"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("analysis")}
                    className={`p-2 rounded-full transition-colors ${currentView === "analysis" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="บทวิเคราะห์รายวัน"
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("trends")}
                    className={`p-2 rounded-full transition-colors ${currentView === "trends" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="แนวโน้มย้อนหลัง"
                  >
                    <TrendingUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("runrate")}
                    className={`p-2 rounded-full transition-colors ${currentView === "runrate" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="Run Rate อัตราการขาย"
                  >
                    <Gauge className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("settings")}
                    className={`p-2 rounded-full transition-colors ${currentView === "settings" ? "bg-[#0f4430]  text-white" : "text-white/60 hover:text-white"}`}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </>
              )}
            </nav>

            {/* Screenshot capture button */}
            <div className="pointer-events-auto hidden md:flex items-center gap-2 pl-2 ml-2 border-l border-white/10">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
                className="p-2 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  if (currentView === "staff") {
                    void captureAllStaffProfiles();
                  } else {
                    void captureScreen();
                  }
                }}
                disabled={!!staffCaptureProgress}
                title={
                  currentView === "staff"
                    ? "บันทึกภาพ KPI + 7 Wonders ของพนักงานทุกคน"
                    : "บันทึกภาพหน้าจอ"
                }
                className="p-2 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-60 flex items-center gap-1.5"
              >
                {staffCaptureProgress ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                    <span className="text-xs text-emerald-200 whitespace-nowrap">
                      {staffCaptureProgress}
                    </span>
                  </>
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* User info + logout */}
            <div className="pointer-events-auto flex items-center gap-3 md:pl-2 md:ml-2 md:border-l border-white/10">
              <div className="hidden xl:flex flex-col items-end whitespace-nowrap">
                <span className="text-xs text-white/90 font-medium leading-tight">
                  {user?.name ?? "Guest"}
                </span>
                {(() => {
                  const roleLabel = user?.role === "admin" ? "Branch Sales Manager" : "PIA";
                  return roleLabel !== (user?.name ?? "") ? (
                    <span className="text-[11px] text-white/50 leading-tight">{roleLabel}</span>
                  ) : null;
                })()}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {currentView === "staff" && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`w-10 h-10 border-2 border-white/20 rounded-full overflow-hidden shrink-0 ${isPia ? "cursor-default" : "cursor-pointer hover:border-white/40"} transition-colors bg-emerald-500/20`}
                    onClick={() => { if (!isPia) setShowDropdown(!showDropdown); }}
                  >
                    {displayStaffAvatar ? (
                      <img
                        src={displayStaffAvatar}
                        alt={activeOfficer?.name ?? "Staff"}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-300/80" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {showDropdown && !isPia && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-48 bg-[#0c3123]/90  border border-white/10 rounded-2xl  overflow-hidden z-50 flex flex-col"
                      >
                        {parsedReport.officers
                          .map((officer, idx) => ({ officer, idx }))
                          .filter(({ officer }) => !isStaffHidden(officer))
                          .map(({ officer, idx }) => (
                          <button
                            key={`${officer.name}-${idx}`}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${idx === activeOfficerIndex ? "bg-white/5" : ""}`}
                            onClick={() => {
                              setActiveStaffId(String(idx + 1));
                              setShowDropdown(false);
                            }}
                          >
                            <img
                              src={getStaffAvatar(reconciledStaffPhotos, {
                                officerKey: cleanOfficerName(officer.name),
                                fallbackIndex: idx,
                              })}
                              className="w-8 h-8 rounded-full object-cover object-top bg-emerald-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">
                                {officer.name}
                              </div>
                              <div className="text-[11px] text-white/60 truncate">
                                {officer.branch}
                              </div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main
          ref={mainRef}
          className={`relative flex-1 flex flex-col px-3 md:px-8 pb-24 md:pb-8 gap-4 md:gap-6 z-20 overflow-x-hidden ${currentView === "home" ? "pt-16 md:pt-28" : "pt-16 md:pt-24"}`}
        >
          <ViewErrorBoundary label="หน้าหลัก">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-white/50 text-sm gap-3">
                <div className="w-6 h-6 border-[3px] border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                กำลังโหลดหน้า…
              </div>
            }
          >
          <AnimatePresence mode="wait">
            {currentView === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                {role === "admin" && csatError && (csatError.code === "auth" || csatError.code === "no_token") ? (
                  <button
                    onClick={() => setCurrentView("settings")}
                    className="flex items-center gap-3 text-left rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 hover:bg-amber-500/15 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                    <span className="text-sm text-amber-100/90">
                      {csatError.message}{" "}
                      <span className="underline font-semibold">ไปที่ Settings →</span>
                    </span>
                  </button>
                ) : null}
                {isMobile ? (
                  <MobileHome
                    storeName={parsedStoreHeader.name}
                    pace={homePace}
                    categories={categorySnapshotData}
                    combined={combinedOfficerKpiData}
                    daily={dailyBranchReport}
                    hourly={hourlySales}
                    avatarOf={mobileAvatarOf}
                    onOpenStaff={openStaffByName}
                    fullView={homeFullSections}
                  />
                ) : (
                  homeFullSections
                )}
              </motion.div>
            )}
            {currentView === "staff" && (
              isMobile ? (
                <motion.div
                  key="staff-mobile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <MobileStaff
                    officers={mobileStaffList}
                    activeIndex={activeOfficerIndex}
                    onSelect={(idx) => setActiveStaffId(String(idx + 1))}
                    canSwitch={!isPia}
                    avatarOf={mobileAvatarOf}
                    name={activeOfficer?.name ?? "-"}
                    staffId={activeOfficer?.staffId}
                    branch={activeOfficer?.branch}
                    rank={mobileStaffRank}
                    categoryRows={activeOfficerCategoryPerformance}
                    wonderRows={activeOfficer7WondersPerformance}
                    sevenWondersScore={sevenWondersScore}
                    focusDevice={focusDevice}
                    focusWonder={focusWonder}
                    todayDateLabel={todayStats.dateStr}
                    fullView={staffFullView}
                  />
                </motion.div>
              ) : (
                staffFullView
              )
            )}
            {!isPia && currentView === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <ReportsSection
                  uploadedFiles={uploadedFiles}
                  uploadedFileNames={uploadedFileNames}
                  isUploadingFile={isUploadingFile}
                  isSaving={isSaving}
                  uploadError={uploadError}
                  uploadStatus={uploadStatus}
                  onExportCsv={exportCsv}
                  onClearAll={() => void clearAllUploadData()}
                  onRemoveFile={removeUploadedFile}
                  onUploadFile={handleUploadFile}
                  parsedReport={parsedReport}
                />
              </motion.div>
            )}
            {!isPia && currentView === "trends" && (
              <motion.div
                key="trends"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <TrendsSection branch={selectedBranch} />
              </motion.div>
            )}
            {!isPia && currentView === "commission" && (
              <motion.div
                key="commission"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <CommissionSection
                  rows={commissionSalesRows}
                  split={commissionSplit}
                  band={commissionBand}
                  bandId={commissionBandId}
                  onBandChange={(id) => {
                    setCommissionBandId(id);
                    try {
                      localStorage.setItem("dashboard-commission-band", id);
                    } catch {
                      /* ignore */
                    }
                  }}
                  newScheme={commissionNewScheme}
                  onNewSchemeChange={(v) => {
                    setCommissionNewScheme(v);
                    try {
                      localStorage.setItem("dashboard-commission-newscheme", v ? "1" : "0");
                    } catch {
                      /* ignore */
                    }
                  }}
                  storeTargetTotal={storeTargetTotal}
                />
              </motion.div>
            )}
            {!isPia && currentView === "runrate" && (
              <motion.div
                key="runrate"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <RunRateSection
                  data={runRateData}
                  branch={selectedBranch}
                  stockStatus={stockStatus}
                  updatedBy={user?.name ?? user?.username}
                  onStockSaved={loadStock}
                  windowDays={runRateWindow}
                  onWindowChange={setRunRateWindow}
                />
              </motion.div>
            )}
            {!isPia && currentView === "analysis" && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <AnalysisSection
                  combinedOfficerKpiData={combinedOfficerKpiData}
                  dateLabel={todayStats.dateStr}
                  onSendTelegram={async (text) => {
                    try {
                      const res = await fetch("/api/telegram-report", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text }),
                      });
                      const data = await res.json();
                      return res.ok && data.ok
                        ? { ok: true }
                        : { ok: false, error: data.error ?? `HTTP ${res.status}` };
                    } catch (e) {
                      return { ok: false, error: e instanceof Error ? e.message : String(e) };
                    }
                  }}
                />
              </motion.div>
            )}
            {!isPia && currentView === "kpi_preset" && (
              <motion.div
                key="kpi_preset"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <KpiPresetSection
                  salesRows={displayUploads.current}
                  categoryMasterRows={displayUploads.categoryMaster}
                  selectedBranch={selectedBranch}
                  presets={kpiPresets}
                  onPresetsChange={setKpiPresets}
                />
              </motion.div>
            )}
            {!isPia && currentView === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <ViewErrorBoundary label="ตั้งค่า">
                <SettingsGate updatedBy={user?.name ?? user?.username}>
                {/* Suspense เฉพาะจุด: ปลดล็อกครั้งแรกโค้ดหน้าตั้งค่ายังโหลดไม่เสร็จ — ถ้าไปให้
                    Suspense ชั้นนอกจับ มันจะซ่อนทั้ง motion.div แล้วแอนิเมชันค้างที่ opacity 0 (จอขาว) */}
                <React.Suspense
                  fallback={
                    <div className="flex justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                    </div>
                  }
                >
                <SettingsSection
                  selectedBranch={selectedBranch}
                  onBranchChange={handleBranchChange}
                  sheetBranches={combinedBranches}
                  staffRoster={staffRoster}
                  onStaffVisibilityChange={setHiddenStaffIds}
                  onBackOfficeChange={setBackOfficeCfg}
                  onAttachBoostChange={setAttachBoost}
                  onTargetUpliftChange={setTargetUplift}
                  staffPhotos={Object.fromEntries(
                    Object.entries(reconciledStaffPhotos).map(([id, record]) => [id, (record as any).photoUrl]),
                  )}
                  uploadingPhotoId={uploadingPhotoId}
                  staffPhotoError={staffPhotoError}
                  getStaffAvatar={getStaffAvatar}
                  onPhotoUpload={(entry, file) => {
                    void handleStaffPhotoUpload(entry, file);
                  }}
                  onPhotoRemove={(staffId) => {
                    void handleStaffPhotoRemove(staffId);
                  }}
                  onNavigateToReports={() => setCurrentView("reports")}
                  isAdmin={role === "admin"}
                  adminName={user?.name ?? user?.username}
                  onCategoryTargetsChanged={loadCategoryTargetOverrides}
                  tradeBranchMapping={tradeBranchMapping}
                  onTradeBranchMappingChange={setTradeBranchMapping}
                />
                </React.Suspense>
                </SettingsGate>
                </ViewErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
          </React.Suspense>
          </ViewErrorBoundary>
        </main>

        {/* แจ้งเตือนหมวดย่อยใหม่ที่ Category Master ยังไม่มี — นอก <main> ไม่ติดไปกับรูปที่แคป */}
        {!isPia ? (
          <CategoryFallbackAlert
            pairs={unmappedCategoryPairs}
            overrides={categoryOverrides}
            onSave={saveCategoryOverrides}
            showManage={currentView === "settings"}
          />
        ) : null}

        {/* เมนูล่างสำหรับมือถือ (เมนูบนซ่อนตอนจอเล็ก) */}
        <MobileBottomNav
          current={currentView}
          onChange={(v) => {
            setCurrentView(v);
            window.scrollTo({ top: 0 });
          }}
          items={[
            { view: "home", label: "หน้าหลัก", icon: Home },
            { view: "staff", label: isPia ? "ของฉัน" : "พนักงาน", icon: User },
          ]}
        />

        {/* Hidden home view for Telegram screenshot capture (always rendered,
            visible in DOM but invisible via opacity:0 so charts render).
            Placed outside <main> so main content capture doesn't include it. */}
        {/* กล่องครอบขนาด 0 + overflow:hidden — ไม่ให้สำเนากว้าง 1200px ดันหน้าจอมือถือ
            (iPhone ซูมออกให้พอดีกับสิ่งที่กว้างที่สุดในหน้า แม้จะโปร่งใส) */}
        <div
          aria-hidden
          style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}
        >
        <div
          ref={homeCaptureRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
            background: "var(--capture-bg, #1c2722)",
          }}
        >
          <div style={{ width: "1200px", minHeight: "900px", padding: "24px" }}>
            <HomeDashboardSection
              derivedHomeStats={homeStatCards}
              monthlyPerformance={monthlyPerformance}
              categorySnapshots={categorySnapshotData}
              branchOverviewKpiData={branchOverviewKpiData}
              combinedOfficerKpiData={combinedOfficerKpiData}
              csatOverview={csatData?.overview}
              csatLowScores={csatData?.lowScores}
              pace={{
                actual: monthlyPerformance.actualSales.actual,
                target: monthlyPerformance.actualSales.target,
                currentDay: paceInfo.currentDay,
                totalDays: paceInfo.totalDays,
              }}
              categorySnapshotRef={categorySnapshotRef}
              captureRef={homeStatsCaptureRef}
              combinedTableRef={combinedTableCaptureRef}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
