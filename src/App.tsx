import {
  Apple,
  Building2,
  Building,
  Calendar,
  Camera,
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
  Check,
  Settings,
  Target,
  SlidersHorizontal,
  ImagePlus,
  Trash2,
  Rocket,
  Smartphone,
  Tablet,
  ShieldCheck,
  Award,
  PenTool,
  Laptop,
  Activity,
  Watch,
  CreditCard,
  LogOut,
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
  fetchUploads,
  hasUploadData,
  saveUploads,
  type UploadKind,
  type UploadState,
} from "./lib/uploadsApi";
import { getItem as idbGet, setItem as idbSet, migrateFromLocalStorage } from "./lib/storage";
import { buildCategorySnapshots } from "./lib/categorySnapshotBuilder";
import {
  fetchTradeInData,
  getBranchCodeFromString,
  getBranchCodeFromTarget,
} from "./lib/tradeInApi";
import { getTradeBranchMapping } from "./lib/tradeInBranchStorage";
import type { KpiCategoryKey } from "./lib/kpiCategoryAdapter";
import {
  getOfficerCategoryKpi,
  resolveOfficerId,
} from "./lib/officerCategoryKpi";
import {
  calcAchievementPct,
  calcForecastByDays,
  calculateMetrics,
  calcTargetToDate,
  calcTodayAchievementPct,
  normalizeId,
  rawTargetRowsToRecords,
} from "./lib/targetAggregations";
import {
  buildStaffRoster,
  getStaffAvatar,
  resizeImageFile,
  type StaffPhotosMap,
} from "./lib/staffAvatar";
import {
  deleteStaffPhoto,
  fetchStaffPhotos,
  saveStaffPhoto,
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

import { StaffSection } from "./components/dashboard/StaffSection";
import { ReportsSection } from "./components/dashboard/ReportsSection";
import { SettingsSection } from "./components/dashboard/SettingsSection";
import KpiPresetSection from "./components/dashboard/KpiPresetSection";
import {
  getPresets as getKpiPresets,
  cleanupTestPresets as cleanupKpiPresets,
} from "./lib/presetStorage";
import type { Preset as KpiPreset, PresetResult, PresetCalcType } from "./lib/presetTypes";
import { AuthProvider, useAuth } from "./lib/auth/authContext";
import LoginPage from "./components/LoginPage";
import ChangePasswordGate from "./components/ChangePasswordGate";
import { syncPiaFromOfficers } from "./lib/auth/piSync";
import { calcPreset, presetDisplayValue, computePresetAchPercent } from "./lib/presetEngine";
import { parseBills, type BillSummary } from "./lib/presetBills";
import { enrichSalesRowsWithCatDaily, buildCatDailyLookup } from "./lib/presetCatDaily";


type Staff = {
  id: string;
  name: string;
  store: string;
  role: string;
  experience: string;
  expertise: string;
  languages: string;
  image: string;
  radar: { subject: string; value: number; fullMark: number }[];
  score: number;
  stats: {
    sales: string;
    csat: string;
    target: string;
  };
};

const staffData: Staff[] = [
  {
    id: "1",
    name: "Sarut Jitranon",
    store: "iStudio Rama 9",
    role: "Senior Sales Spec.",
    experience: "5 Years",
    expertise: "iPhone & Mac",
    languages: "TH / EN",
    image: "/staff1.png",
    score: 97,
    radar: [
      { subject: "Trade In|48%", value: 96, fullMark: 100 },
      { subject: "Cover Plus|26%", value: 100, fullMark: 100 },
      { subject: "UFUND|5.7%", value: 95, fullMark: 100 },
      { subject: "SIM|16%", value: 100, fullMark: 100 },
      { subject: "Pencil|82%", value: 96, fullMark: 100 },
      { subject: "Mac Att|14%", value: 93, fullMark: 100 },
      { subject: "Case Att|48%", value: 96, fullMark: 100 },
    ],
    stats: {
      sales: "142",
      csat: "4.9/5",
      target: "115%",
    },
  },
  {
    id: "2",
    name: "Nadech Kugimiya",
    store: "iStudio Central World",
    role: "Store Manager",
    experience: "8 Years",
    expertise: "All Products",
    languages: "TH / EN / JP",
    image: "/staff2.png",
    score: 100,
    radar: [
      { subject: "Trade In|52%", value: 100, fullMark: 100 },
      { subject: "Cover Plus|28%", value: 100, fullMark: 100 },
      { subject: "UFUND|6.3%", value: 100, fullMark: 100 },
      { subject: "SIM|17%", value: 100, fullMark: 100 },
      { subject: "Pencil|86%", value: 100, fullMark: 100 },
      { subject: "Mac Att|16%", value: 100, fullMark: 100 },
      { subject: "Case Att|53%", value: 100, fullMark: 100 },
    ],
    stats: {
      sales: "256",
      csat: "5.0/5",
      target: "125%",
    },
  },
  {
    id: "3",
    name: "Yaya Urassaya",
    store: "iStudio Iconsiam",
    role: "Sales Specialist",
    experience: "3 Years",
    expertise: "iPad & Watch",
    languages: "TH / EN",
    image: "/staff3.png",
    score: 90,
    radar: [
      { subject: "Trade In|42%", value: 84, fullMark: 100 },
      { subject: "Cover Plus|22%", value: 88, fullMark: 100 },
      { subject: "UFUND|5.4%", value: 90, fullMark: 100 },
      { subject: "SIM|13.5%", value: 90, fullMark: 100 },
      { subject: "Pencil|80%", value: 94, fullMark: 100 },
      { subject: "Mac Att|13.5%", value: 90, fullMark: 100 },
      { subject: "Case Att|46%", value: 92, fullMark: 100 },
    ],
    stats: {
      sales: "118",
      csat: "4.8/5",
      target: "105%",
    },
  },
];

type Interaction = {
  date: string;
  type: string;
  typeIcon: "building" | "user" | "phone";
  product: string;
  status: string;
  value: string;
};

const interactionsData: Record<string, Interaction[]> = {
  sales: [
    {
      date: "04 Nov 2025",
      type: "Corporate",
      typeIcon: "building",
      product: 'MacBook Pro 16"',
      status: "Closed Won",
      value: "189,000",
    },
    {
      date: "02 Nov 2025",
      type: "Walk-in",
      typeIcon: "user",
      product: "iPhone 15 Pro Max",
      status: "Closed Won",
      value: "48,900",
    },
    {
      date: "01 Nov 2025",
      type: "Call-in",
      typeIcon: "phone",
      product: "iPad Air M2",
      status: "Follow-up",
      value: "23,900",
    },
  ],
  csat: [
    {
      date: "05 Nov 2025",
      type: "Walk-in",
      typeIcon: "user",
      product: "AirPods Pro",
      status: "5 Stars",
      value: "8,990",
    },
    {
      date: "04 Nov 2025",
      type: "Corporate",
      typeIcon: "building",
      product: "MacBook Air M3",
      status: "5 Stars",
      value: "39,900",
    },
    {
      date: "01 Nov 2025",
      type: "Walk-in",
      typeIcon: "user",
      product: "Apple Watch S9",
      status: "4.5 Stars",
      value: "15,900",
    },
  ],
  target: [
    {
      date: "04 Nov 2025",
      type: "Corporate",
      typeIcon: "building",
      product: 'MacBook Pro 16"',
      status: "Goal Met",
      value: "189,000",
    },
    {
      date: "03 Nov 2025",
      type: "Call-in",
      typeIcon: "phone",
      product: "Mac Studio",
      status: "Goal Met",
      value: "74,900",
    },
    {
      date: "30 Oct 2025",
      type: "Walk-in",
      typeIcon: "user",
      product: "Accessories Bundle",
      status: "Goal Met",
      value: "12,500",
    },
  ],
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
  branches: Array<{ label: string; target: number; actual: number; lastMonth: number; lastYear: number; achPercent?: number; forecast?: number; forecastPercent?: number; momPercent?: number; yoyPercent?: number; targetPerDay?: number; diffPerDay?: number }>;
  categories: Array<{ category: string; actual: number; target: number; share: number }>;
  officers: Array<OfficerPerformance>;
  fileName: string;
};

const normalizeText = (value: unknown) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();
const cleanBranchForMatching = (val: unknown): string => {
  if (!val) return "";
  let clean = String(val).toLowerCase();
  clean = clean.replace(/id\s*:?\s*\d+/g, "");
  clean = clean.replace(/istudio\s*by\s*spvi/g, "");
  clean = clean.replace(/istudio/g, "");
  clean = clean.replace(/studio\s*7/g, "");
  clean = clean.replace(/studio7/g, "");
  clean = clean.replace(/studio/g, "");
  clean = clean.replace(/spvi/g, "");
  clean = clean.replace(/uficon/g, "");
  clean = clean.replace(/copperwired/g, "");
  clean = clean.replace(/iserve/g, "");
  clean = clean.replace(/dotlife/g, "");
  clean = clean.replace(/banana\s*it/g, "");
  clean = clean.replace(/banana/g, "");
  clean = clean.replace(/plaza/g, "");
  clean = clean.replace(/[^a-z0-9ก-๙]/gi, "");
  return clean.trim();
};
const filterRowsByBranch = (rows: any[], branch: string) => {
  if (!rows || !rows.length) return [];
  const normParam = cleanBranchForMatching(branch);
  if (!normParam) return rows;
  return rows.filter((row) => {
    const rowBranchVal = row["Branch (Name)"] || row["BRANCH NAME"] || row.branch_name || row.shop_name || "";
    const normRow = cleanBranchForMatching(rowBranchVal);
    return normRow && normParam && (normRow.includes(normParam) || normParam.includes(normRow));
  });
};
const toNumber = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { "แพวนภา": "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};
const matchesOfficer = (a: string, b: string) => {
  if (!a || !b) return false;
  const cleanA = cleanOfficerName(a);
  const cleanB = cleanOfficerName(b);
  if (cleanA === cleanB) return true;

  // Split original names by whitespace to get first names
  const firstA = cleanOfficerName(a.split(/\s+/)[0] || "");
  const firstB = cleanOfficerName(b.split(/\s+/)[0] || "");
  if (firstA && firstB && firstA === firstB) return true;

  return false;
};
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

type CategoryPerformanceRow = {
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
  const [currentView, setCurrentView] = useState<
    "home" | "staff" | "settings" | "reports" | "kpi_preset"
  >("home");
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

  const [tradeInData, setTradeInData] = useState<
    { actual: number; today: number } | undefined
  >(undefined);
  const [tradeBranchMapping, setTradeBranchMapping] = useState<
    Record<string, string>
  >(() => getTradeBranchMapping());

  const [kpiPresets, setKpiPresets] = useState<KpiPreset[]>([]);

  const handleBranchChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    void idbSet("dashboard-selected-branch", newBranch).catch((e) =>
      console.warn("[App] persist selectedBranch failed:", e),
    );
  };

  const displayUploads = useMemo<Record<UploadKind, RawRow[]>>(
    () => ({
      target: filterRowsByBranch(uploadedFiles.target, selectedBranch),
      current: filterRowsByBranch(uploadedFiles.current, selectedBranch),
      today: filterRowsByBranch(uploadedFiles.today ?? [], selectedBranch),
      lastMonth: filterRowsByBranch(uploadedFiles.lastMonth, selectedBranch),
      lastYear: filterRowsByBranch(uploadedFiles.lastYear, selectedBranch),
      categoryMaster: uploadedFiles.categoryMaster,
    }),
    [uploadedFiles, selectedBranch],
  );

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

  const getCategory = (row: RawRow): string => {
    const cat = String(row["Category (Name)"] ?? row.category_name ?? row.Category ?? "").trim();
    const sub = String(row["Sub Category"] ?? row.sub_category ?? row.SubCategory ?? "").trim();
    const prod = String(row["Product (Name)"] ?? row.product_name ?? row.Product ?? "").trim();
    
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
      return normalizedMapped;
    }
    
    return mapTargetCategoryKey(cat, sub, prod);
  };

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

  const formatTodayDateLabel = (rawDate: string) => {
    if (!rawDate) return "";
    const parsed = parseDocDate(rawDate);
    if (!parsed) return rawDate;
    return parsed.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const todayStats = useMemo(() => {
    if (!todayRows.length) return { revenue: 0, units: 0, target: 0, ach: 0, mom: 0, yoy: 0, categories: [], dateStr: "" };
    
    let totalRevenue = 0;
    let totalUnits = 0;
    
    todayRows.forEach(row => {
      const cat = String(row["Category (Name)"] ?? "").toLowerCase();
      const val = getCategoryValue(row);
      totalRevenue += val;
      if (cat.includes("sim")) {
        totalUnits += toNumber(row.Number ?? row.number ?? row.qty ?? 1);
      } else {
        totalUnits += 1;
      }
    });
    
    const totalDays = parsedReport.branches.reduce((acc, b) => Math.max(acc, b.totalDays || 30), 30);
    const totalTarget = parsedReport.branches.reduce((acc, b) => acc + (b.target || 0), 0);
    const dailyTarget = totalTarget / totalDays;
    const ach = dailyTarget ? (totalRevenue / dailyTarget) * 100 : 0;
    
    const momVal = parsedReport.branches.reduce((acc, b) => acc + (typeof b.momPercent === "number" ? b.momPercent : 0), 0) / (parsedReport.branches.length || 1);
    const yoyVal = parsedReport.branches.reduce((acc, b) => acc + (typeof b.yoyPercent === "number" ? b.yoyPercent : 0), 0) / (parsedReport.branches.length || 1);
    
    const cats = ["Grand Total", "iPhone", "Mac", "iPad", "Apple Watch", "BTB", "3rd Party"];
    const catStats = cats.map(cName => {
      let catRevenue = 0;
      let catUnits = 0;
      
      todayRows.forEach(row => {
        const mapped = getCategory(row);
        let match = false;
        if (cName === "Grand Total") {
          match = true;
        } else if (cName === "3rd Party") {
          match = mapped.toLowerCase().includes("accessories") || mapped.toLowerCase().includes("other") || mapped.toLowerCase().includes("3rd");
        } else {
          match = mapped.toLowerCase().includes(cName.toLowerCase());
        }
        
        if (match) {
          catRevenue += getCategoryValue(row);
          const cat = String(row["Category (Name)"] ?? "").toLowerCase();
          if (cat.includes("sim")) {
            catUnits += toNumber(row.Number ?? row.number ?? row.qty ?? 1);
          } else {
            catUnits += 1;
          }
        }
      });
      
      let catDailyTarget = 0;
      if (cName === "Grand Total") {
        catDailyTarget = dailyTarget;
      } else {
        const catTargetSum = parsedReport.categories.find(item => item.category.toLowerCase().includes(cName.toLowerCase()))?.target || 0;
        catDailyTarget = catTargetSum / totalDays;
      }
      const catAch = catDailyTarget ? (catRevenue / catDailyTarget) * 100 : 0;
      
      return {
        name: cName,
        actual: catRevenue,
        units: catUnits,
        target: catDailyTarget,
        ach: catAch
      };
    });
    
    const rawDateStr = String(todayRows[0]?.["Doc Date"] ?? "");
    const dateStr = formatTodayDateLabel(rawDateStr);
    
    return {
      revenue: totalRevenue,
      units: totalUnits,
      target: dailyTarget,
      ach,
      mom: momVal,
      yoy: yoyVal,
      categories: catStats,
      dateStr
    };
  }, [todayRows, parsedReport, getCategory, getCategoryValue]);

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

  const currentStaff =
    staffData.find((s) => s.id === activeStaffId) || staffData[0];
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
    if (!displayUploads.current.length && Number(activeStaffId) <= 3) {
      return currentStaff.languages;
    }
    const branch = activeOfficer?.branch ?? "";
    if (branch.includes("World") || branch.includes("Paragon") || branch.includes("Iconsiam")) {
      return (activeOfficerIndex % 2 === 0) ? "TH / EN / CN" : "TH / EN / JP";
    }
    return "TH / EN";
  }, [displayUploads.current, activeOfficer, activeOfficerIndex, activeStaffId, currentStaff]);

  const dynamicExperience = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3) {
      return currentStaff.experience;
    }
    const target = activeOfficer?.target ?? 0;
    if (target > 1500000) return "5+ Years";
    if (target > 800000) return "3-5 Years";
    return "1-2 Years";
  }, [displayUploads.current, activeOfficer, activeStaffId, currentStaff]);

  const dynamicRole = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3) {
      return currentStaff.role;
    }
    const target = activeOfficer?.target ?? 0;
    if (target > 1500000) return "Senior Sales Spec.";
    if (target > 800000) return "Sales Specialist";
    return "Sales Associate";
  }, [displayUploads.current, activeOfficer, activeStaffId, currentStaff]);

  const dynamicExpertise = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3) {
      return currentStaff.expertise;
    }
    if (!displayUploads.current.length || !activeOfficer) {
      return "All Products";
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
  }, [displayUploads.current, activeOfficer, activeStaffId, currentStaff]);

  const activeOfficerCategoryPerformance = useMemo<CategoryPerformanceRow[]>(() => {
    if (!activeOfficer) return [];
    
    const categoriesList: KpiCategoryKey[] = ["Mac", "iPad", "iPhone", "Apple Watch", "BTB", "BTB(Apple)"];
    const hasData = displayUploads.current.length > 0;
    const targetRecords = rawTargetRowsToRecords(displayUploads.target);

    // Identify the "current" date for the period. Prefer the latest data
    // date present in the current uploads (so the daily target / forecast
    // reflects the data we actually have), but fall back to today.
    let periodYear = new Date().getFullYear();
    let periodMonth = new Date().getMonth();
    const latestDateFromData = (() => {
      if (!displayUploads.current.length) return null;
      let best: { year: number; month: number; day: number; time: number } | null = null;
      for (const row of displayUploads.current) {
        const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
        if (!rawDate) continue;
        const parsed = parseDocDate(rawDate);
        if (!parsed) continue;
        const ymd = {
          year: parsed.getFullYear(),
          month: parsed.getMonth(),
          day: parsed.getDate(),
          time: parsed.getTime(),
        };
        if (!best || ymd.time > best.time) best = ymd;
      }
      return best;
    })();
    if (latestDateFromData) {
      periodYear = latestDateFromData.year;
      periodMonth = latestDateFromData.month;
    }

    const periodTotalDays = new Date(periodYear, periodMonth + 1, 0).getDate();
    const periodMonthStr = String(periodMonth + 1).padStart(2, "0");
    const periodStart = `${periodYear}-${periodMonthStr}-01`;
    const periodEnd = `${periodYear}-${periodMonthStr}-${String(periodTotalDays).padStart(2, "0")}`;
    const officerTargetRow = displayUploads.target.find((row) => {
      const name = `${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim();
      return matchesOfficer(name, activeOfficer.name);
    });
    const officerId = resolveOfficerId(
      activeOfficer.name,
      displayUploads.target,
      targetRecords,
      displayUploads.current,
      matchesOfficer,
    );

    // Use the day-of-month from the latest data date (or today if no data)
    // so the daily target / forecast reflects the data we actually have.
    const currentMonthTotalDays = new Date(periodYear, periodMonth + 1, 0).getDate();
    const currentDay = Math.min(
      latestDateFromData?.day ?? new Date().getDate(),
      currentMonthTotalDays,
    );
    const totalDays = currentMonthTotalDays;
    
    const todaySourceRows = todayRows.length ? todayRows : [];
    // Find latest data date by PARSED TIME so different string formats
    // for the same day (e.g. "26/06/2026" vs "26/06/2569") all match.
    let maxDateTime = 0;
    if (!todaySourceRows.length && hasData) {
      displayUploads.current.forEach((row) => {
        const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
        if (!rawDate) return;
        const parsed = parseDocDate(rawDate);
        if (parsed) {
          const time = parsed.getTime();
          if (time > maxDateTime) maxDateTime = time;
        }
      });
    }

    // 3. For each category, compute target, actual, forecast, lastMonth, lastYear, actualDay
    const rows: CategoryPerformanceRow[] = categoriesList.map((catName) => {
      let target = 0;
      let actual = 0;
      let lastMonth = 0;
      let lastYear = 0;
      let actualDay = 0;
      
      if (hasData) {
        const kpi = getOfficerCategoryKpi({
          category: catName,
          officerName: activeOfficer.name,
          officerId,
          officerTargetRow,
          targetRecords,
          currentRows: displayUploads.current,
          lastMonthRows: displayUploads.lastMonth,
          lastYearRows: displayUploads.lastYear,
          periodStart,
          periodEnd,
          getCategory,
          matchesOfficer,
        });
        target = kpi.target;
        actual = kpi.actual;
        lastMonth = kpi.lastMonth;
        lastYear = kpi.lastYear;

        const dailyRows = todaySourceRows.length ? todaySourceRows : displayUploads.current;
        dailyRows.forEach((row) => {
          const rowOfficerId = String(row["STAFF ID"] ?? row.emp_id ?? "").trim();
          const officer = String(row["Officer (Name)"] ?? "").trim();
          const officerMatch =
            (officerId && rowOfficerId && normalizeId(rowOfficerId) === normalizeId(officerId)) ||
            matchesOfficer(officer, activeOfficer.name);
          if (!officerMatch) return;
          const rowCat = getCategory(row);
          if (rowCat !== catName) return;
          if (!todaySourceRows.length) {
            // Compare by parsed time, not by raw string, so rows that
            // represent the same calendar day but in slightly different
            // formats (e.g. "26/06/2026" vs "26/06/2569") all match.
            const rawDate = String(row["Doc Date"] ?? row["doc date"] ?? "");
            const parsed = parseDocDate(rawDate);
            const time = parsed ? parsed.getTime() : 0;
            if (!(time && time === maxDateTime)) return;
          }
          actualDay +=
            kpi.measureType === "quantity"
              ? toNumber(row.Number ?? row.number ?? row.qty ?? 0)
              : getCategoryValue(row);
        });
      } else if (!hasData) {
        // Fallback/Mock distribution matching activeOfficer total values!
        const targetRates: Record<string, number> = {
          "iPhone": 0.54,
          "Mac": 0.11,
          "iPad": 0.18,
          "Apple Watch": 0.05,
          "BTB(Apple)": 0.07,
          "BTB": 0.05,
        };
        const actualRates: Record<string, number> = {
          "iPhone": 0.53,
          "Mac": 0.10,
          "iPad": 0.20,
          "Apple Watch": 0.05,
          "BTB(Apple)": 0.07,
          "BTB": 0.05,
        };
        
        target = Math.round(activeOfficer.target * (targetRates[catName] ?? 0.1));
        actual = Math.round(activeOfficer.actual * (actualRates[catName] ?? 0.1));
        lastMonth = 0;
        lastYear = 0;
        actualDay = Math.round(activeOfficer.actualDay * (actualRates[catName] ?? 0.1));
      }
      
      const achPercent = calcAchievementPct(actual, target);
      const forecast = calcForecastByDays(actual, currentDay, totalDays);
      const forecastPercent = calcAchievementPct(forecast, target);
      
      let momPercent: number | string = "New";
      if (lastMonth > 0) {
        momPercent = ((actual - lastMonth) / lastMonth) * 100;
      }
      
      let yoyPercent: number | string = "New";
      if (lastYear > 0) {
        yoyPercent = ((actual - lastYear) / lastYear) * 100;
      }
      
      const targetDay = calcTargetToDate(target, currentDay, totalDays);
      const diffDay = actualDay - targetDay;
      const achDayPercent = calcTodayAchievementPct(actualDay, targetDay);
      
      return {
        category: catName,
        target,
        actual,
        achPercent,
        forecast,
        forecastPercent,
        lastMonth,
        momPercent,
        lastYear,
        yoyPercent,
        targetDay,
        actualDay,
        diffDay,
        achDayPercent,
      };
    });
    
    // 4. Calculate Total row
    const totalTarget = rows.reduce((s, r) => s + r.target, 0);
    const totalActual = rows.reduce((s, r) => s + r.actual, 0);
    const totalAchPercent = totalTarget ? (totalActual / totalTarget) * 100 : 0;
    const totalForecast = rows.reduce((s, r) => s + r.forecast, 0);
    const totalForecastPercent = totalTarget ? (totalForecast / totalTarget) * 100 : 0;
    const totalLastMonth = rows.reduce((s, r) => s + r.lastMonth, 0);
    let totalMomPercent: number | string = "New";
    if (totalLastMonth > 0) {
      totalMomPercent = ((totalActual - totalLastMonth) / totalLastMonth) * 100;
    }
    const totalLastYear = rows.reduce((s, r) => s + r.lastYear, 0);
    let totalYoyPercent: number | string = "New";
    if (totalLastYear > 0) {
      totalYoyPercent = ((totalActual - totalLastYear) / totalLastYear) * 100;
    }
    const totalTargetDay = rows.reduce((s, r) => s + r.targetDay, 0);
    const totalActualDay = rows.reduce((s, r) => s + r.actualDay, 0);
    const totalDiffDay = totalActualDay - totalTargetDay;
    const totalAchDayPercent = calcTodayAchievementPct(totalActualDay, totalTargetDay);
    
    const totalRow: CategoryPerformanceRow = {
      category: "Total",
      target: totalTarget,
      actual: totalActual,
      achPercent: totalAchPercent,
      forecast: totalForecast,
      forecastPercent: totalForecastPercent,
      lastMonth: totalLastMonth,
      momPercent: totalMomPercent,
      lastYear: totalLastYear,
      yoyPercent: totalYoyPercent,
      targetDay: totalTargetDay,
      actualDay: totalActualDay,
      diffDay: totalDiffDay,
      achDayPercent: totalAchDayPercent,
    };
    
    return [...rows, totalRow];
  }, [activeOfficer, displayUploads, parsedReport, getCategory, todayRows]);

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

  // Compute KPI results for presets marked showInStaffProfile
  const activeOfficerPresetResults = useMemo<PresetResult[]>(() => {
    if (activeOfficerBills.length === 0) return [];
    const staffPresets = kpiPresets.filter((p) => p.showInStaffProfile);
    if (staffPresets.length === 0) return [];
    return staffPresets.map((p) => calcPreset(activeOfficerBills, p));
  }, [activeOfficerBills, kpiPresets]);

  const activeOfficer7WondersPerformance = useMemo<CategoryPerformanceRow[]>(() => {
    if (!activeOfficer) return [];
    const officerName = activeOfficer?.name ?? currentStaff.name;
    const officerIndex = activeOfficerIndex;
    const hasData = displayUploads.current.length > 0;
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

    // Fallback: no preset marked — show mock data for first 3 staff
    if (!hasData) {
      const mockBase = [45, 22, 5.5, 13, 78, 12, 46, 35, 28, 42];
      const mockOffset = [
        (officerIndex % 3) * 3,
        (officerIndex % 5) * 1.5,
        (officerIndex % 4) * 0.3,
        (officerIndex % 3) * 1.5,
        (officerIndex % 3) * 4,
        (officerIndex % 3) * 2,
        (officerIndex % 5) * 2,
        (officerIndex % 4) * 1.2,
        (officerIndex % 3) * 2.5,
        (officerIndex % 4) * 3,
      ];
      const rows: CategoryPerformanceRow[] = mockBase.map((base, idx) => {
        const actualVal = base + (mockOffset[idx] ?? 0);
        return {
          category: `${idx + 1}. Wonder ${idx + 1}`,
          target: 0,
          actual: actualVal,
          achPercent: 0,
          forecast: actualVal,
          forecastPercent: 0,
          lastMonth: 0,
          momPercent: "New",
          lastYear: 0,
          yoyPercent: "New",
          targetDay: 0,
          actualDay: actualVal,
          diffDay: actualVal,
          achDayPercent: 0,
        };
      });
      return rows;
    }

    return [];
  }, [activeOfficer, displayUploads.current, activeOfficerIndex, currentStaff.name, activeOfficerPresetResults, kpiPresets]);

  const sevenWondersScore = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3) {
      return currentStaff.score;
    }
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
        row.calcType === "catAttach";
      const v = isPercentPreset && row.target > 0
        ? (row.actual / row.target) * 100
        : row.achPercent;
      return acc + (v || 0);
    }, 0);
    const avg = sum / wondersRows.length;
    return Math.min(100, Math.max(0, Math.round(avg)));
  }, [activeOfficer7WondersPerformance, displayUploads.current, activeStaffId, currentStaff]);

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
        row.calcType === "catAttach";
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

    const lookup = buildCatDailyLookup(displayUploads.categoryMaster);
    const enriched = enrichSalesRowsWithCatDaily(displayUploads.current, lookup);
    const allBills = parseBills(enriched);

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
          const results: Record<string, number> = {};
          branchPresets.forEach((p) => {
            const r = calcPreset(officerBills, p);
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
  }, [kpiPresets, displayUploads.current, displayUploads.categoryMaster, parsedReport.officers]);

  const dynamicRadarData = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3 && activeStat === "csat") {
      return currentStaff.radar;
    }
    
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
          row.calcType === "catAttach";
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
    displayUploads.current,
    activeStaffId,
    currentStaff
  ]);

  const dynamicScore = useMemo(() => {
    if (!displayUploads.current.length && Number(activeStaffId) <= 3 && activeStat === "csat") {
      return currentStaff.score;
    }
    if (dynamicRadarData.length === 0) return 0;
    const sum = dynamicRadarData.reduce((acc, curr) => acc + curr.value, 0);
    return Math.round(sum / dynamicRadarData.length);
  }, [dynamicRadarData, displayUploads.current, activeStaffId, currentStaff, activeStat]);

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
    const totalBranches = parsedReport.branches.length;
    const lastMonthTotal = parsedReport.branches.reduce((sum, branch) => sum + branch.lastMonth, 0);
    const trendPercent = lastMonthTotal ? ((totalSales - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return [
      {
        label: "Total Sales",
        value: `฿${Math.round(totalSales).toLocaleString()}`,
        trend: `${trendPercent >= 0 ? "+" : ""}${Math.round(trendPercent)}%`,
        icon: DollarSign,
        isUp: trendPercent >= 0,
      },
      {
        label: "Store Target",
        value: `${Math.round(avgAch)}%`,
        trend: `${avgAch >= 100 ? "+" : ""}${Math.round(avgAch - 100)}%`,
        icon: Star,
        isUp: avgAch >= 100,
      },
      {
        label: "Avg Staff Ach %",
        value: `${Math.round(avgRate)}%`,
        trend: `${avgRate >= 100 ? "+" : ""}${Math.round(avgRate)}%`,
        icon: Smile,
        isUp: true,
      },
      {
        label: "Active Staff",
        value: `${totalOfficers.toLocaleString()}`,
        trend: `${totalBranches.toLocaleString()} branches`,
        icon: Users,
        isUp: true,
      },
    ];
  }, [parsedReport]);

  const monthlyPerformance = useMemo(() => {
    const hasData = displayUploads.current.length > 0;
    
    // Dynamic calculations or fallback mock values matching user's image exactly!
    
    // Card 1: Overall Score
    let avgScore = 70;
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
    let gradeDist = { A: 0, B: 9, C: 3, D: 1 };
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
    let lowForecastCount = 2;
    if (parsedReport.officers.length > 0) {
      lowForecastCount = parsedReport.officers.filter(o => o.rate < 70).length;
    }

    // Card 2: Actual Sales
    const totalSales = parsedReport.branches.reduce((sum, b) => sum + b.actual, 0);
    const totalTarget = parsedReport.branches.reduce((sum, b) => sum + b.target, 0);
    const salesAchRate = calcAchievementPct(totalSales, totalTarget);
    
    // Card 3: True Sim
    const simCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("sim")) : 153;
    const iphoneCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("iphone")) : 744;
    const simRate = iphoneCount > 0 ? (simCount / iphoneCount) * 100 : 20.56;
    
    // Card 4: Case iPhone
    const caseCount = hasData ? countRows(displayUploads.current, (cat, prod, sub) => cat.includes("case") || prod.includes("case") || sub.includes("case")) : 353;
    const caseRate = iphoneCount > 0 ? (caseCount / iphoneCount) * 100 : 47.45;
    
    // Card 5: UFUND PERSONAL
    const ufundCount = hasData ? countRows(displayUploads.current, (cat, prod, sub, row) => isUfundRow(row)) : 47;
    const ufundBase = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ufund") || cat.includes("personal")) : iphoneCount;
    const ufundRate = ufundBase > 0 ? (ufundCount / ufundBase) * 100 : 6.32;
    
    // Card 6: COVER + (solid card)
    const coverCount = hasData ? countRows(displayUploads.current, (cat, prod) => cat.includes("cover") || cat.includes("care") || prod.includes("cover") || prod.includes("care")) : 104;
    const coverRate = iphoneCount > 0 ? (coverCount / iphoneCount) * 100 : 13.98;
    
    // Card 7: KPIs Pencil 85%
    const pencilCount = hasData ? countRows(displayUploads.current, (cat, prod) => prod.includes("pencil") || prod.includes("pen")) : 325;
    const ipadCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ipad")) : 471;
    const pencilRate = ipadCount > 0 ? (pencilCount / ipadCount) * 100 : 69.00;
    
    // Card 8: KPIs Mac 10%
    const macCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("mac")) : 119;
    const macRate = iphoneCount > 0 ? (macCount / iphoneCount) * 100 : 15.99;
    
    // Card 9: KPIs iPad 30%
    const ipadAttachCount = hasData ? countRows(displayUploads.current, (cat) => cat.includes("ipad")) : 471;
    const ipadRate = iphoneCount > 0 ? (ipadAttachCount / iphoneCount) * 100 : 63.31;
    
    // Card 10: KPIs BTB Mix 10%
    const btbSales = hasData ? sumSales(displayUploads.current, (cat) => cat.includes("btb")) : 6850000;
    const btbTotalSales = totalSales || 54300000;
    const btbRate = btbTotalSales > 0 ? (btbSales / btbTotalSales) * 100 : 12.61;
    
    // Card 11: Mac Growth YoY
    const currentMacSales = hasData
      ? parsedReport.categories.find((c) => c.category.toLowerCase() === "mac")?.actual ?? sumSales(displayUploads.current, (cat) => cat.includes("mac"))
      : 5160000;
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
      actualSales: { actual: totalSales || 54810000, target: totalTarget || 86220000, rate: salesAchRate || 63.57 },
      trueSim: { count: simCount, base: iphoneCount, rate: simRate, target: 15 },
      caseIphone: { count: caseCount, base: iphoneCount, rate: caseRate, target: 60 },
      ufundPersonal: { count: ufundCount, base: ufundBase, rate: ufundRate, target: 7 },
      coverPlus: { count: coverCount, base: iphoneCount, rate: coverRate, target: 25 },
      pencil: { count: pencilCount, base: ipadCount, rate: pencilRate, target: 85 },
      kpisMac: { count: macCount, base: iphoneCount, rate: macRate, target: 10 },
      kpisIpad: { count: ipadAttachCount, base: iphoneCount, rate: ipadRate, target: 30 },
      btbMix: { btbSales, totalSales: btbTotalSales, rate: btbRate, target: 10 },
      macYoY: { actual: currentMacSales, target: lastYearMacSales || 7270000, rate: macYoYRate, targetRate: 10 },
      totalYoY: { actual: currentTotalSales, target: lastYearTotalSales || 77240000, rate: totalSalesYoYRate, targetRate: 10 },
      gradeDist,
      lowForecast: lowForecastCount,
    };
  }, [displayUploads, parsedReport, attachOfficerRows]);

  // Enrich sales rows with `catDaily` (from the Category Master) so
  // rowMatchesKpiCategory can use the most reliable signal when picking
  // rows into BTB / BTB(Apple) / COVER+ / AC+ / SIM.
  const enrichedCurrentRows = useMemo(() => {
    if (!displayUploads.categoryMaster?.length) return displayUploads.current;
    const lookup = buildCatDailyLookup(displayUploads.categoryMaster);
    return enrichSalesRowsWithCatDaily(displayUploads.current, lookup);
  }, [displayUploads.current, displayUploads.categoryMaster]);

  const enrichedTodayRows = useMemo(() => {
    if (!displayUploads.categoryMaster?.length) return displayUploads.today;
    const lookup = buildCatDailyLookup(displayUploads.categoryMaster);
    return enrichSalesRowsWithCatDaily(displayUploads.today, lookup);
  }, [displayUploads.today, displayUploads.categoryMaster]);

  const categorySnapshotData = useMemo(
    () =>
      buildCategorySnapshots({
        targetRows: displayUploads.target,
        currentRows: enrichedCurrentRows,
        todayRows: enrichedTodayRows,
        lastMonthRows: displayUploads.lastMonth,
        lastYearRows: displayUploads.lastYear,
        targetOverrides: categoryTargetOverrides,
        tradeInData,
      }),
    [
      displayUploads.target,
      enrichedCurrentRows,
      enrichedTodayRows,
      displayUploads.lastMonth,
      displayUploads.lastYear,
      categoryTargetOverrides,
      tradeInData,
    ],
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
  }, [displayUploads.current, parsedReport.branches]);

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

  const displayStaffAvatar = useMemo(() => {
    if (!activeOfficer) return currentStaff.image;
    const attachRow = attachOfficerRows.find((row) =>
      attachMatchesOfficer(row.name, activeOfficer.name),
    );
    return getStaffAvatar(staffPhotos, {
      staffId: attachRow?.staffId,
      officerKey: cleanOfficerName(activeOfficer.name),
      fallbackIndex: activeOfficerIndex,
    });
  }, [
    activeOfficer,
    attachOfficerRows,
    staffPhotos,
    activeOfficerIndex,
    currentStaff.image,
  ]);

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
    const officerName = activeOfficer?.name ?? currentStaff.name;
    if (!displayUploads.current.length) return interactionsData;

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

    if (!rows.length) return interactionsData;
    return {
      sales: rows,
      csat: rows,
      target: rows,
    };
  }, [displayUploads.current, activeOfficer?.name, currentStaff.name]);

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
    const filteredTarget = filterRowsByBranch(nextUploads.target, selectedBranch);
    const filteredCurrent = filterRowsByBranch(nextUploads.current, selectedBranch);
    const filteredToday = filterRowsByBranch(nextUploads.today ?? [], selectedBranch);
    const filteredLastMonth = filterRowsByBranch(nextUploads.lastMonth, selectedBranch);
    const filteredLastYear = filterRowsByBranch(nextUploads.lastYear, selectedBranch);

    const report = buildReport(
      filteredTarget,
      filteredCurrent,
      filteredLastMonth,
      filteredLastYear,
      nextUploads.categoryMaster,
      "uploaded-data",
      filteredToday,
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
        setSelectedBranchLoaded(true);
      }

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
  }, [selectedBranch, selectedBranchLoaded]);

  useEffect(() => {
    if (!selectedBranchLoaded) return;
    void loadCategoryTargetOverrides();
  }, [selectedBranch, selectedBranchLoaded, loadCategoryTargetOverrides]);

  useEffect(() => {
    if (!selectedBranchLoaded) return;
    const branchCode =
      tradeBranchMapping[selectedBranch] ||
      getBranchCodeFromTarget(displayUploads.target) ||
      getBranchCodeFromString(selectedBranch);
    console.log(
      "[TradeIn] selectedBranch:",
      selectedBranch,
      "branchCode:",
      branchCode,
    );
    if (!branchCode) {
      setTradeInData(undefined);
      return;
    }
    let cancelled = false;
    fetchTradeInData(branchCode)
      .then((result) => {
        console.log("[TradeIn] API result for", branchCode, ":", result);
        if (!cancelled) {
          setTradeInData({ actual: result.count, today: result.todayCount });
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
  }, [
    selectedBranch,
    selectedBranchLoaded,
    displayUploads.target,
    tradeBranchMapping,
  ]);

  // When the user uploads data for a branch that isn't currently
  // selected, auto-switch to the first uploaded branch so the rest of
  // the dashboard immediately reflects the new data.
  useEffect(() => {
    if (!selectedBranchLoaded) return;
    if (!uploadedBranches.length) return;
    const current = (selectedBranch || "").trim().toLowerCase();
    const isInUploaded = current && uploadedBranches.some(
      (b) => b.trim().toLowerCase() === current
        || b.trim().toLowerCase().includes(current)
        || current.includes(b.trim().toLowerCase()),
    );
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

  const captureScreen = async () => {
    // On home view, capture only the Category KPI Snapshot section
    const el = currentView === "home" && categorySnapshotRef.current
      ? categorySnapshotRef.current
      : mainRef.current;
    if (!el) return;
    const w = Math.max((el as HTMLElement).scrollWidth, (el as HTMLElement).offsetWidth);
    // Inject a <style> element as a CHILD of the element so it travels
    // with the clone into the SVG foreignObject. This hides scrollbars
    // and box-shadows on all descendants during capture only.
    const innerStyle = document.createElement("style");
    innerStyle.textContent = `
      *::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      * { --tw-ring-shadow: 0 0 #0000 !important; --tw-ring-offset-shadow: 0 0 #0000 !important; }
      * { --tw-shadow: 0 0 #0000 !important; }
    `;
    el.appendChild(innerStyle);
    try {
      const dataUrl = await toJpeg(el, {
        quality: 0.94,
        pixelRatio: 1.5,
        cacheBust: false,
        backgroundColor: "#1c2722",
        width: w,
        style: {
          width: `${w}px`,
          height: "auto",
          boxSizing: "border-box",
          overflow: "visible",
        },
        // Drop mix-blend-overlay nodes from the clone — they render as a
        // dark rectangle when html-to-image uses SVG foreignObject.
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList?.contains("mix-blend-overlay")) {
            return false;
          }
          return true;
        },
        fetchRequestInit: { mode: "cors" },
      });
      const ts = new Date().toISOString().slice(0, 10);
      const label = currentView === "staff" ? "staff" : currentView;
      const link = document.createElement("a");
      link.download = `dashboard-${label}-${ts}.jpeg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("[captureScreen] failed:", e);
    } finally {
      innerStyle.remove();
    }
  };

  return (
    <div className="min-h-screen bg-[#1c2722] p-4 font-sans text-white md:p-8 flex flex-col items-center">
      {isInitialLoading && (
        <div className="fixed inset-0 z-[999] bg-[#1c2722] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-white/60 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-[1440px] h-auto min-h-[90vh] bg-gradient-to-br from-[#1b5d44] to-[#123627] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col relative overflow-x-hidden">
        {/* Logo (Absolute Left) */}
        <div className="absolute top-6 left-8 z-50 flex items-center gap-4 pointer-events-auto">
          <img src="/site-logo.09b5daa.svg" alt="Logo" className="h-8" />
          {currentView === "home" && (
            <div className="hidden lg:flex flex-col ml-4">
              <h1 className="text-xl font-bold tracking-tight drop-shadow-md">
                {parsedStoreHeader.name}
              </h1>
              <span className="text-xs text-white/80 drop-shadow-md">
                Store ID: {parsedStoreHeader.id} • Opening Hours: 10:00 - 22:00
              </span>
            </div>
          )}
        </div>

        {/* Top Navigation (Floating Right) */}
        <header className="absolute top-6 right-8 w-1/2 flex justify-end items-center z-50 pointer-events-none">
          <div className="flex items-center gap-6 pointer-events-auto">
            <nav className="flex items-center space-x-2 lg:space-x-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-xl hidden md:flex">
              <button
                onClick={() => setCurrentView("home")}
                className={`p-2 rounded-full transition-colors ${currentView === "home" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
                title="Home"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("staff")}
                className={`p-2 rounded-full transition-colors ${currentView === "staff" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
                title="Staff Profile"
              >
                <User className="w-5 h-5" />
              </button>
              {!isPia && (
                <>
                  <button
                    onClick={() => setCurrentView("reports")}
                    className={`p-2 rounded-full transition-colors ${currentView === "reports" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
                    title="Reports"
                  >
                    <PieChart className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("kpi_preset")}
                    className={`p-2 rounded-full transition-colors ${currentView === "kpi_preset" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
                    title="KPI Preset"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentView("settings")}
                    className={`p-2 rounded-full transition-colors ${currentView === "settings" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
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
                onClick={captureScreen}
                title="บันทึกภาพหน้าจอ"
                className="p-2 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* User info + logout */}
            <div className="pointer-events-auto flex items-center gap-3 pl-2 ml-2 border-l border-white/10">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-white/90 font-medium leading-tight">
                  {user?.name ?? "Guest"}
                </span>
                <span className="text-[10px] text-emerald-300 leading-tight">
                  {user?.role === "admin" ? "Branch Sales Manager" : "PIA"}
                </span>
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
                    <img
                      src={displayStaffAvatar}
                      alt={currentStaff.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <AnimatePresence>
                    {showDropdown && !isPia && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-48 bg-[#0c3123]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                      >
                        {(parsedReport.officers.length > 0
                          ? parsedReport.officers
                          : staffData.map((s) => ({ name: s.name, branch: s.store }))
                        ).map((officer, idx) => (
                          <button
                            key={`${officer.name}-${idx}`}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${idx === activeOfficerIndex ? "bg-white/5" : ""}`}
                            onClick={() => {
                              setActiveStaffId(String(idx + 1));
                              setShowDropdown(false);
                            }}
                          >
                            <img
                              src={getStaffAvatar(staffPhotos, {
                                officerKey: cleanOfficerName(officer.name),
                                fallbackIndex: idx,
                              })}
                              className="w-8 h-8 rounded-full object-cover object-top bg-emerald-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">
                                {officer.name}
                              </div>
                              <div className="text-[10px] text-white/60 truncate">
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
          className={`relative flex-1 flex flex-col px-4 md:px-8 pb-8 gap-6 z-20 overflow-x-hidden ${currentView === "home" ? "pt-28" : "pt-24"}`}
        >
          <AnimatePresence mode="wait">
            {currentView === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <HomeDashboardSection
                  derivedHomeStats={derivedHomeStats}
                  monthlyPerformance={monthlyPerformance}
                  categorySnapshots={categorySnapshotData}
                  branchOverviewKpiData={branchOverviewKpiData}
                  categorySnapshotRef={categorySnapshotRef}
                />
              </motion.div>
            )}
            {currentView === "staff" && (
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
                activeOfficer7WondersPerformance={activeOfficer7WondersPerformance}
                activeOfficerCategoryPerformance={activeOfficerCategoryPerformance}
                todaySalesTotal={activeOfficerTodaySales}
                todayDateLabel={todayStats.dateStr}
                 categoryPerformanceHint={categoryPerformanceHint}
                 onSetActiveStaffId={setActiveStaffId}
                 piaIndices={piaIndices}
                 homeCaptureRef={homeCaptureRef}
              />
            )}
            {!isPia && currentView === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
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
            {!isPia && currentView === "kpi_preset" && (
              <motion.div
                key="kpi_preset"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
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
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <SettingsSection
                  selectedBranch={selectedBranch}
                  onBranchChange={handleBranchChange}
                  sheetBranches={combinedBranches}
                  staffRoster={staffRoster}
                  staffPhotos={Object.fromEntries(
                    Object.entries(staffPhotos).map(([id, record]) => [id, (record as any).photoUrl]),
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
                  onCategoryTargetsChanged={loadCategoryTargetOverrides}
                  tradeBranchMapping={tradeBranchMapping}
                  onTradeBranchMappingChange={setTradeBranchMapping}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Hidden home view for Telegram screenshot capture (always rendered,
            visible in DOM but invisible via opacity:0 so charts render).
            Placed outside <main> so main content capture doesn't include it. */}
        <div
          ref={homeCaptureRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "1200px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
            background: "#1c2722",
          }}
        >
          <div style={{ width: "1200px", minHeight: "900px", padding: "24px" }}>
            <HomeDashboardSection
              derivedHomeStats={derivedHomeStats}
              monthlyPerformance={monthlyPerformance}
              categorySnapshots={categorySnapshotData}
              branchOverviewKpiData={branchOverviewKpiData}
              categorySnapshotRef={categorySnapshotRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
