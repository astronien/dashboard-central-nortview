import {
  Apple,
  Building2,
  Calendar,
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
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
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
    score: 95,
    radar: [
      { subject: "Product Knowledge|98", value: 98, fullMark: 100 },
      { subject: "Customer Service|95", value: 95, fullMark: 100 },
      { subject: "Upselling|88", value: 88, fullMark: 100 },
      { subject: "Communication|92", value: 92, fullMark: 100 },
      { subject: "Tech Support|90", value: 90, fullMark: 100 },
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
    score: 98,
    radar: [
      { subject: "Product Knowledge|99", value: 99, fullMark: 100 },
      { subject: "Customer Service|98", value: 98, fullMark: 100 },
      { subject: "Upselling|95", value: 95, fullMark: 100 },
      { subject: "Communication|97", value: 97, fullMark: 100 },
      { subject: "Tech Support|92", value: 92, fullMark: 100 },
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
    score: 92,
    radar: [
      { subject: "Product Knowledge|94", value: 94, fullMark: 100 },
      { subject: "Customer Service|97", value: 97, fullMark: 100 },
      { subject: "Upselling|85", value: 85, fullMark: 100 },
      { subject: "Communication|96", value: 96, fullMark: 100 },
      { subject: "Tech Support|88", value: 88, fullMark: 100 },
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

const salesTrendData = [
  { date: "1 Nov", sales: 420 },
  { date: "2 Nov", sales: 280 },
  { date: "3 Nov", sales: 550 },
  { date: "4 Nov", sales: 480 },
  { date: "5 Nov", sales: 620 },
  { date: "6 Nov", sales: 850 },
  { date: "7 Nov", sales: 780 },
];

const homeStats = [
  {
    label: "Total Sales",
    value: "฿12.4M",
    trend: "+14.5%",
    icon: DollarSign,
    isUp: true,
  },
  {
    label: "Store Target",
    value: "112%",
    trend: "+5.2%",
    icon: Star,
    isUp: true,
  },
  {
    label: "Average CSAT",
    value: "4.8",
    trend: "+0.1",
    icon: Smile,
    isUp: true,
  },
  {
    label: "Total Visits",
    value: "8,429",
    trend: "-2.4%",
    icon: Users,
    isUp: false,
  },
];

const attachRateData = [
  {
    id: "1",
    name: "Sarut",
    appleCare: 82,
    accessories: 145,
    services: 40,
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100",
  },
  {
    id: "2",
    name: "Nadech",
    appleCare: 95,
    accessories: 155,
    services: 65,
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&h=100",
  },
  {
    id: "3",
    name: "Yaya",
    appleCare: 45,
    accessories: 90,
    services: 20,
    avatar:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=100&h=100",
  },
];

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

const renderCustomTick = ({ payload, x, y, textAnchor }: any) => {
  const [name, val] = payload.value.split("|");
  const words = name.split(" ");
  const dyTop = words.length > 1 ? -10 : -4;
  return (
    <g transform={`translate(${x},${y})`}>
      {words.length > 1 && (
        <text
          x={0}
          y={0}
          dy={-16}
          textAnchor={textAnchor}
          fill="rgba(255,255,255,0.9)"
          fontSize={11}
          fontWeight="600"
        >
          {words[0]}
        </text>
      )}
      <text
        x={0}
        y={0}
        dy={words.length > 1 ? 0 : -4}
        textAnchor={textAnchor}
        fill="rgba(255,255,255,0.9)"
        fontSize={11}
        fontWeight="600"
      >
        {words.length > 1 ? words.slice(1).join(" ") : words[0]}
      </text>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor={textAnchor}
        fill="#34d399"
        fontSize={14}
        fontWeight="bold"
      >
        {val}
      </text>
    </g>
  );
};

type RawRow = Record<string, string | number | undefined>;
type ParsedReport = {
  branches: Array<{ label: string; target: number; actual: number; lastMonth: number; lastYear: number; achPercent?: number; forecast?: number; forecastPercent?: number; momPercent?: number; yoyPercent?: number; targetPerDay?: number; diffPerDay?: number }>;
  categories: Array<{ category: string; actual: number; target: number; share: number }>;
  officers: Array<{ name: string; branch: string; actual: number; target: number; rate: number }>;
  fileName: string;
};
type UploadKind = "target" | "current" | "lastMonth" | "lastYear" | "categoryMaster";

const normalizeText = (value: unknown) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();
const toNumber = (value: unknown) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { "แพวนภา": "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};
const getCategoryValue = (row: RawRow) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};
const getSalesDate = (row: RawRow) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = Date.parse(raw.replace(/^\S+\.\s*/, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const getUploadKind = (headers: string[]): UploadKind => {
  const normalized = headers.map(normalizeText);
  if (normalized.some((h) => h.includes("cat & sub cat") || h.includes("cat daily"))) return "categoryMaster";
  if (normalized.some((h) => h.includes("staff id") || h.includes("branch name"))) return "target";
  return "current";
};
const mapTargetCategoryKey = (category: string, subCategory = "", productName = "") => {
  const text = normalizeText(`${category} ${subCategory} ${productName}`);
  if (text.includes("iphone") || text.includes("iphone")) return "iPhone";
  if (text.includes("mac") || text.includes("macbook") || text.includes("imac") || text.includes("desktop") || text.includes("notebook")) return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("sim")) return "SIM";
  if (text.includes("btb") || text.includes("business") || text.includes("accessory") || text.includes("apple acc") || text.includes("care") || text.includes("service") || text.includes("insurance") || text.includes("smile")) return "BTB";
  if (text.includes("smartphone")) return "Smartphone";
  return category || "Other";
};
const calculateMetrics = (target: number, actual: number, currentDay: number, totalDays: number, lastMonth: number, lastYear: number) => {
  const achPercent = target ? (actual / target) * 100 : 0;
  const forecast = currentDay ? (actual / currentDay) * totalDays : 0;
  const forecastPercent = target ? (forecast / target) * 100 : 0;
  const momPercent = lastMonth ? ((actual - lastMonth) / lastMonth) * 100 : 0;
  const yoyPercent = lastYear ? ((actual - lastYear) / lastYear) * 100 : 0;
  const targetPerDay = totalDays ? (target / totalDays) * currentDay : 0;
  const diffPerDay = actual - targetPerDay;
  return { achPercent, forecast, forecastPercent, momPercent, yoyPercent, targetPerDay, diffPerDay };
};
const buildReport = (targetRows: RawRow[], currentRows: RawRow[], lastMonthRows: RawRow[], lastYearRows: RawRow[], categoryRows: RawRow[], fileName: string): ParsedReport => {
  const categoryMap = new Map<string, string>();
  categoryRows.forEach((row) => {
    const key = normalizeText(row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory);
    const value = String(row["CAT Daily"] ?? row["Category (Name)"] ?? "Other").trim();
    if (key) categoryMap.set(key, value);
  });
  const targetByBranch = new Map<string, RawRow>();
  const targetByOfficer = new Map<string, RawRow[]>();
  targetRows.forEach((row) => {
    const branchKey = normalizeText(row["BRANCH NAME"]);
    const officerKey = cleanOfficerName(`${row.NAME ?? ""} ${row.SURNAME ?? ""}`.trim());
    targetByBranch.set(branchKey, row);
    targetByOfficer.set(officerKey, [...(targetByOfficer.get(officerKey) ?? []), row]);
  });
  const branchSummary = new Map<string, { label: string; target: number; actual: number; lastMonth: number; lastYear: number; currentDay: number; totalDays: number }>();
  const officerSummary = new Map<string, { name: string; branch: string; actual: number; target: number; rate: number }>();
  const categorySummary = new Map<string, { actual: number; target: number }>();
  const mergeSales = (rows: RawRow[], period: "current" | "lastMonth" | "lastYear") => {
    [...rows].sort((a, b) => getSalesDate(b) - getSalesDate(a)).forEach((row) => {
      const branch = String(row["Branch (Name)"] ?? "Unknown Branch").trim();
      const officer = String(row["Officer (Name)"] ?? "Unknown Officer").trim();
      const categoryName = String(row["Category (Name)"] ?? "Other").trim();
      const sub = String(row["Sub Category"] ?? "").trim();
      const product = String(row["Product (Name)"] ?? "").trim();
      const mapped = categoryMap.get(normalizeText(`${categoryName}${sub}`)) ?? categoryMap.get(normalizeText(categoryName)) ?? categoryMap.get(normalizeText(product)) ?? mapTargetCategoryKey(categoryName, sub, product);
      const branchKey = normalizeText(branch);
      const targetRow = targetByBranch.get(branchKey);
      const totalDays = toNumber(targetRow?.DAY) || 1;
      const currentDay = Math.min(totalDays, new Date().getDate());
      const actual = getCategoryValue(row);
      const branchItem = branchSummary.get(branchKey) ?? { label: branch, target: 0, actual: 0, lastMonth: 0, lastYear: 0, currentDay, totalDays };
      branchItem.target = targetRow ? toNumber(targetRow.Total) : branchItem.target;
      if (period === "current") branchItem.actual += actual; else if (period === "lastMonth") branchItem.lastMonth += actual; else branchItem.lastYear += actual;
      branchSummary.set(branchKey, branchItem);
      const catKey = normalizeText(mapped);
      const catItem = categorySummary.get(catKey) ?? { actual: 0, target: 0 };
      catItem.actual += actual;
      if (period === "current") {
        const targetLabel = mapTargetCategoryKey(categoryName, sub, product);
        const targetFromBranch = toNumber(targetRow?.[targetLabel] ?? targetRow?.Total);
        catItem.target += targetFromBranch || actual;
      }
      categorySummary.set(catKey, catItem);
      const officerItem = [...targetByOfficer.entries()].find(([name]) => matchesOfficer(name, officer))?.[1]?.[0];
      const officerKey = cleanOfficerName(officer);
      const officerTargetRow = officerItem;
      const officerState = officerSummary.get(officerKey) ?? { name: officer, branch, actual: 0, target: 0, rate: 0 };
      officerState.target = toNumber(officerTargetRow?.Total ?? 0);
      if (period === "current") officerState.actual += actual;
      officerState.rate = officerState.target ? Math.round((officerState.actual / officerState.target) * 100) : 0;
      officerSummary.set(officerKey, officerState);
    });
  };
  mergeSales(currentRows, "current"); mergeSales(lastMonthRows, "lastMonth"); mergeSales(lastYearRows, "lastYear");
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
    { name: "Sarut Jitranon", branch: "Mega Bangna", actual: 142, target: 123, rate: 115 },
    { name: "Nadech Kugimiya", branch: "Central World", actual: 256, target: 205, rate: 125 },
    { name: "Yaya Urassaya", branch: "Iconsiam", actual: 118, target: 112, rate: 105 },
  ],
};

export default function App() {
  const [currentView, setCurrentView] = useState<
    "home" | "staff" | "staff_overview" | "settings" | "reports"
  >("home");
  const [parsedReport, setParsedReport] = useState<ParsedReport>(fallbackReport);
  const [uploadedFiles, setUploadedFiles] = useState<Record<UploadKind, RawRow[]>>({ target: [], current: [], lastMonth: [], lastYear: [], categoryMaster: [] });
  const [activeTab, setActiveTab] = useState("Store");
  const [activeStat, setActiveStat] = useState<"sales" | "csat" | "target">(
    "sales",
  );
  const [activeStaffId, setActiveStaffId] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);
  const [attachFilters, setAttachFilters] = useState<string[]>([
    "appleCare",
    "accessories",
  ]);
  const [selectedDevice, setSelectedDevice] = useState("iPhone");
  const [isAttachDropdownOpen, setIsAttachDropdownOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const toggleAttachFilter = (id: string) => {
    setAttachFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const currentStaff =
    staffData.find((s) => s.id === activeStaffId) || staffData[0];

  const uploadStats = useMemo(() => {
    const branches = parsedReport.branches.length;
    const categories = parsedReport.categories.length;
    const officers = parsedReport.officers.length;
    return { branches, categories, officers };
  }, [parsedReport]);

  const rebuildReport = (nextUploads: Record<UploadKind, RawRow[]>) => {
    const report = buildReport(nextUploads.target, nextUploads.current, nextUploads.lastMonth, nextUploads.lastYear, nextUploads.categoryMaster, "uploaded-data");
    setParsedReport(report);
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
      ...parsedReport.officers.map((row) => [row.name, row.branch, row.actual, row.target, `${row.rate}%`]),
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

  const removeUploadedFile = (kind: UploadKind) => {
    const nextUploads = { ...uploadedFiles, [kind]: [] };
    setUploadedFiles(nextUploads);
    rebuildReport(nextUploads);
  };

  const acceptDetected = (fileName: string, kind: UploadKind): UploadKind => {
    const n = fileName.toLowerCase();
    if (n.includes("staff")) return "target";
    if (n.includes("current")) return "current";
    if (n.includes("last mom")) return "lastMonth";
    if (n.includes("last yoy") || n.includes("yoy")) return "lastYear";
    if (n.includes("category")) return "categoryMaster";
    return kind;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, forcedKind?: UploadKind) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadError(null);
    setIsParsing(true);
    try {
      const nextUploads: Record<UploadKind, RawRow[]> = { target: [], current: [], lastMonth: [], lastYear: [], categoryMaster: [] };
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
        const detectedKind = forcedKind ?? acceptDetected(file.name, getUploadKind(Object.keys(rows[0] ?? {})));
        nextUploads[detectedKind] = rows;
      }
      setUploadedFiles(nextUploads);
      rebuildReport(nextUploads);
      setCurrentView("reports");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ");
      setParsedReport(fallbackReport);
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#1c2722] p-4 font-sans text-white md:p-8 flex flex-col items-center">
      <div className="w-full max-w-[1440px] h-auto min-h-[90vh] bg-gradient-to-br from-[#1b5d44] to-[#123627] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Logo (Absolute Left) */}
        <div className="absolute top-6 left-8 z-50 flex items-center gap-4 pointer-events-auto">
          <img src="/site-logo.09b5daa.svg" alt="Logo" className="h-8" />
          {currentView === "home" && (
            <div className="hidden lg:flex flex-col ml-4">
              <h1 className="text-xl font-bold tracking-tight drop-shadow-md">
                iStudio Mega Bangna
              </h1>
              <span className="text-xs text-white/80 drop-shadow-md">
                Store ID: 10452 • Opening Hours: 10:00 - 22:00
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
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("staff_overview")}
                className={`p-2 rounded-full transition-colors ${currentView === "staff_overview" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("staff")}
                className={`p-2 rounded-full transition-colors ${currentView === "staff" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("reports")}
                className={`p-2 rounded-full transition-colors ${currentView === "reports" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
              >
                <PieChart className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("reports")}
                className="p-2 rounded-full transition-colors text-white/60 hover:text-white"
                title="Go to Reports"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView("settings")}
                className={`p-2 rounded-full transition-colors ${currentView === "settings" ? "bg-[#0f4430] shadow-inner text-white" : "text-white/60 hover:text-white"}`}
              >
                <Settings className="w-5 h-5" />
              </button>
            </nav>

            {currentView === "staff" && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-10 h-10 border-2 border-white/20 rounded-full overflow-hidden shrink-0 cursor-pointer hover:border-white/40 transition-colors bg-emerald-500/20"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <img
                      src={currentStaff.image}
                      alt={currentStaff.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-48 bg-[#0c3123]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                      >
                        {staffData.map((staff) => (
                          <button
                            key={staff.id}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${staff.id === activeStaffId ? "bg-white/5" : ""}`}
                            onClick={() => {
                              setActiveStaffId(staff.id);
                              setShowDropdown(false);
                            }}
                          >
                            <img
                              src={staff.image}
                              className="w-8 h-8 rounded-full object-cover object-top bg-emerald-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium truncate">
                                {staff.name}
                              </div>
                              <div className="text-[10px] text-white/60 truncate">
                                {staff.role}
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
                className="flex flex-col gap-6 w-full h-full"
              >
                {/* Dashboard Top Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {homeStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col justify-between hover:bg-white/[0.15] transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                          <stat.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${stat.isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"} flex items-center gap-1`}
                        >
                          {stat.isUp ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : null}{" "}
                          {stat.trend}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-white/60 mb-1">
                          {stat.label}
                        </div>
                        <div className="text-3xl font-bold tracking-tight">
                          {stat.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Middle Charts */}
                <div className="flex flex-col lg:flex-row gap-6 min-h-[300px]">
                  <div className="lg:w-2/3 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-semibold tracking-tight">
                        Sales Trend (Last 7 Days)
                      </h2>
                    </div>
                    <div className="flex-1 w-full min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={salesTrendData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorSales"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.5}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{
                              fill: "rgba(255,255,255,0.6)",
                              fontSize: 12,
                            }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            tick={{
                              fill: "rgba(255,255,255,0.6)",
                              fontSize: 12,
                            }}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                            tickFormatter={(value) => `${value}k`}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "rgba(12, 49, 35, 0.9)",
                              borderColor: "rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                              color: "#fff",
                            }}
                            itemStyle={{ color: "#10b981" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSales)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:w-1/3 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] justify-between">
                    <h2 className="text-lg font-semibold tracking-tight mb-4">
                      Top Performing Products
                    </h2>
                    <div className="flex flex-col gap-4 flex-1 justify-center">
                      {[
                        {
                          name: "iPhone 15 Pro Max",
                          value: 85,
                          color: "bg-emerald-400",
                        },
                        {
                          name: 'MacBook Pro 16"',
                          value: 65,
                          color: "bg-emerald-500",
                        },
                        {
                          name: "AirPods Pro 2",
                          value: 45,
                          color: "bg-white/40",
                        },
                      ].map((prod, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-white/90">{prod.name}</span>
                            <span className="text-white/60 font-medium">
                              {prod.value}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full ${prod.color} rounded-full`}
                              style={{ width: `${prod.value}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium border border-white/5">
                      View Full Report
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === "staff_overview" && (
              <motion.div
                key="staff_overview"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 w-full h-full"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative z-20">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Staff Attach Rate Performance
                    </h2>
                    <p className="text-sm text-white/60 mt-1">
                      Compare how well the team is attaching secondary products
                      to main units
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    {/* Device Dropdown */}
                    <div className="relative z-30">
                      <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        className="appearance-none bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 pr-10 outline-none focus:border-emerald-500 cursor-pointer text-sm font-medium"
                      >
                        {deviceOptions.map((d) => (
                          <option
                            key={d.id}
                            value={d.id}
                            className="text-gray-900"
                          >
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                    </div>

                    {/* Attachments Checkbox Dropdown */}
                    <div className="relative z-30">
                      <button
                        onClick={() =>
                          setIsAttachDropdownOpen(!isAttachDropdownOpen)
                        }
                        className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 flex items-center gap-2 outline-none focus:border-emerald-500 cursor-pointer text-sm font-medium"
                      >
                        Attachments ({attachFilters.length})
                        <ChevronDown
                          className={`w-4 h-4 text-white/60 transition-transform ${isAttachDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isAttachDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a4431] border border-white/20 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1">
                          {attachOptions.map((opt) => (
                            <label
                              key={opt.id}
                              className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={attachFilters.includes(opt.id)}
                                onChange={() => toggleAttachFilter(opt.id)}
                              />
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${attachFilters.includes(opt.id) ? "bg-emerald-500 border-emerald-500" : "border-white/40"}`}
                              >
                                {attachFilters.includes(opt.id) && (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: opt.color }}
                                />
                                <span className="text-sm text-white/90">
                                  {opt.label}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)] h-[450px] relative z-10 w-full shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attachRateData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      barGap={6}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="rgba(255,255,255,0.3)"
                        tick={{
                          fill: "rgba(255,255,255,0.6)",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        contentStyle={{
                          backgroundColor: "rgba(12, 49, 35, 0.95)",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      {attachFilters.includes("appleCare") && (
                        <Bar
                          dataKey="appleCare"
                          name="AppleCare+"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                      {attachFilters.includes("accessories") && (
                        <Bar
                          dataKey="accessories"
                          name="Accessories"
                          fill="#3b82f6"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                      {attachFilters.includes("services") && (
                        <Bar
                          dataKey="services"
                          name="Services"
                          fill="#8b5cf6"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                  <h3 className="text-lg font-semibold mb-4 tracking-tight">
                    Staff Performance Details
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-sm">
                          <th className="pb-3 font-medium px-4">Staff Name</th>
                          {attachOptions.map((opt) => (
                            <th key={opt.id} className="pb-3 font-medium px-4">
                              {opt.label} Rate
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attachRateData.map((staff) => (
                          <tr
                            key={staff.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 flex items-center gap-3">
                              <img
                                src={staff.avatar}
                                alt={staff.name}
                                className="w-8 h-8 rounded-full bg-white/20 object-cover"
                              />
                              <span className="font-medium text-white/90">
                                {staff.name}
                              </span>
                            </td>
                            {attachOptions.map((opt) => (
                              <td
                                key={opt.id}
                                className="py-3 px-4 text-white/80"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-12 text-sm">
                                    {staff[opt.id as keyof typeof staff]}%
                                  </span>
                                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${staff[opt.id as keyof typeof staff]}%`,
                                        backgroundColor: opt.color,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === "staff" && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col w-full h-full gap-6 relative"
              >
                {/* TOP HALF: Person | Radar | Stats */}
                <div className="flex-1 flex flex-col lg:flex-row min-h-[280px] shrink-0 gap-6 lg:gap-0">
                  {/* Left Column - Image */}
                  <div className="lg:w-[35%] relative flex items-end justify-center rounded-[2rem] lg:rounded-none z-30 min-h-[250px] lg:min-h-0 pointer-events-none">
                    {/* Dimensional Glow Behind Image */}
                    <div className="absolute bottom-10 lg:bottom-1/4 -left-[20%] lg:-left-[50%] w-[120%] lg:w-[200%] h-[50%] lg:h-[80%] bg-emerald-500/10 blur-[80px] lg:blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentStaff.id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          y: 10,
                          scale: 0.95,
                          filter: "blur(10px)",
                        }}
                        transition={{
                          duration: 0.5,
                          type: "spring",
                          bounce: 0.4,
                        }}
                        src={currentStaff.image}
                        alt={currentStaff.name}
                        className="absolute -bottom-8 lg:-bottom-16 -left-[30%] lg:-left-[100%] z-20 w-[160%] lg:w-[300%] max-w-none h-auto object-contain object-bottom drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)] origin-bottom pointer-events-none"
                        style={{
                          minHeight: "calc(100% + 240px)",
                          maxHeight: "none",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
                          maskImage:
                            "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
                        }}
                      />
                    </AnimatePresence>
                  </div>

                  {/* Center Column - Radar Chart */}
                  <div className="lg:w-[30%] relative flex items-center justify-center py-4 lg:py-0 z-40">
                    <div className="w-full max-w-[260px] aspect-square relative text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="65%"
                          data={currentStaff.radar}
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
                        <div className="w-16 h-16 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={currentStaff.score}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="text-white/60 text-3xl font-bold tracking-tighter"
                            >
                              {currentStaff.score}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Stats Grid */}
                  <div className="lg:w-[35%] flex flex-col justify-center lg:justify-end pb-4 relative z-40">
                    <div className="text-center lg:text-right mb-4">
                      <AnimatePresence mode="wait">
                        <motion.h1
                          key={currentStaff.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight"
                        >
                          {currentStaff.name.split(" ")[0]}
                          <br className="hidden lg:block" />{" "}
                          {currentStaff.name.split(" ")[1] || ""}
                        </motion.h1>
                      </AnimatePresence>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentStaff.store}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center lg:justify-end gap-2 text-white/80 font-medium"
                        >
                          <Apple className="w-4 h-4" /> {currentStaff.store}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Top 3 Stats */}
                    <div className="flex justify-center lg:justify-end gap-3 mb-3">
                      <button
                        onClick={() => setActiveStat("sales")}
                        className={`rounded-2xl p-4 w-28 text-center border shadow-lg transition-all ${activeStat === "sales" ? "bg-[#0c3123] border-white/20 ring-1 ring-emerald-500/50" : "bg-black/20 border-white/5 hover:bg-black/30"}`}
                      >
                        <ShoppingBag
                          className={`w-5 h-5 mx-auto mb-2 ${activeStat === "sales" ? "text-white" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/70 mb-1 font-medium">
                          Monthly Sales
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.stats.sales}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-2xl font-bold"
                          >
                            {currentStaff.stats.sales}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                      <button
                        onClick={() => setActiveStat("csat")}
                        className={`backdrop-blur-md rounded-2xl p-4 w-28 text-center border shadow-inner transition-all ${activeStat === "csat" ? "bg-white/[0.15] border-white/30 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        <Smile
                          className={`w-5 h-5 mx-auto mb-2 ${activeStat === "csat" ? "text-emerald-300 fill-emerald-300/20" : "text-white/60"}`}
                        />
                        <div className="text-[10px] text-white/80 mb-1 font-medium">
                          CSAT
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.stats.csat}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-2xl font-bold"
                          >
                            {currentStaff.stats.csat}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                      <button
                        onClick={() => setActiveStat("target")}
                        className={`backdrop-blur-xl rounded-2xl p-4 w-28 text-center border shadow-xl relative overflow-hidden transition-all ${activeStat === "target" ? "bg-white/20 border-white/40 ring-1 ring-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                      >
                        {activeStat === "target" && (
                          <div className="absolute inset-0 bg-emerald-400/20 mix-blend-overlay"></div>
                        )}
                        <Star
                          className={`w-5 h-5 mx-auto mb-2 relative z-10 ${activeStat === "target" ? "text-emerald-200 fill-emerald-200" : "text-white/60"}`}
                        />
                        <div className="text-[10px] relative z-10 text-emerald-100 mb-1 font-medium">
                          Target Hit
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.stats.target}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-2xl font-bold text-white relative z-10"
                          >
                            {currentStaff.stats.target}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                    </div>

                    {/* Bottom 2x2 Stats */}
                    <div className="grid grid-cols-2 gap-2 lg:gap-3 justify-center lg:justify-end max-w-[340px] w-full mx-auto lg:mx-0 lg:ml-auto">
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center">
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Role
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.role}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] lg:text-xs font-semibold w-full truncate"
                          >
                            {currentStaff.role}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center">
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Experience
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.experience}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] lg:text-xs font-semibold w-full truncate"
                          >
                            {currentStaff.experience}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center overflow-hidden min-w-0 flex flex-col items-center justify-center">
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5 w-full truncate">
                          Expertise
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.expertise}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] lg:text-xs font-semibold w-full truncate"
                          >
                            {currentStaff.expertise}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2 lg:px-4 py-2.5 text-center flex flex-col items-center justify-center overflow-hidden min-w-0">
                        <div className="text-[9px] uppercase tracking-wider text-white/60 mb-0.5">
                          Language
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentStaff.languages}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs font-semibold flex items-center gap-1.5 h-4"
                          >
                            <div className="w-[14px] h-[10px] bg-slate-800 rounded-[2px] overflow-hidden flex relative border border-white/20">
                              <div className="w-full flex flex-col justify-between">
                                <div className="h-[2px] bg-red-600"></div>
                                <div className="h-[2px] bg-white"></div>
                                <div className="h-[2px] bg-blue-800"></div>
                                <div className="h-[2px] bg-white"></div>
                                <div className="h-[2px] bg-red-600"></div>
                              </div>
                            </div>{" "}
                            {currentStaff.languages}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM HALF: Tables */}
                <div className="relative z-40 flex flex-col lg:flex-row gap-6 min-h-[260px]">
                  {/* Recent Customer Interactions */}
                  <div className="lg:w-2/3 bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {activeStat === "sales" &&
                          "Recent Customer Interactions"}
                        {activeStat === "csat" && "Recent Customer Feedback"}
                        {activeStat === "target" &&
                          "Recent Target Achievements"}
                      </h2>
                      <button className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                        By Date <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto -mx-2 px-2">
                      <table className="w-full text-left text-[13px] border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-white/50 border-b border-white/10">
                            <th className="pb-3 px-3 font-medium">Date</th>
                            <th className="pb-3 px-3 font-medium">
                              Customer Type
                            </th>
                            <th className="pb-3 px-3 font-medium">
                              Product Focus
                            </th>
                            <th className="pb-3 px-3 font-medium">Status</th>
                            <th className="pb-3 px-3 font-medium text-right">
                              Value (THB)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-white/90">
                          {interactionsData[activeStat].map(
                            (interaction, idx) => (
                              <tr
                                key={idx}
                                className={
                                  idx === 1
                                    ? "bg-white/[0.04] hover:bg-white/[0.06] transition-colors rounded-xl border border-white/5 shadow-sm"
                                    : "bg-white/0 hover:bg-white/5 transition-colors group rounded-xl"
                                }
                              >
                                <td
                                  className={`py-2.5 px-3 rounded-l-xl ${idx === 1 ? "text-white" : ""}`}
                                >
                                  {interaction.date}
                                </td>
                                <td
                                  className={`py-2.5 px-3 flex items-center gap-2 ${idx === 1 ? "" : "text-white"}`}
                                >
                                  {getIcon(interaction.typeIcon)}{" "}
                                  {interaction.type}
                                </td>
                                <td className="py-2.5 px-3 text-white/80">
                                  {interaction.product}
                                </td>
                                <td
                                  className={`py-2.5 px-3 ${getStatusColor(interaction.status)}`}
                                >
                                  {interaction.status}
                                </td>
                                <td className="py-2.5 px-3 text-right rounded-r-xl font-medium">
                                  {interaction.value}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="lg:w-1/3 flex flex-col gap-4">
                    {/* Header Tabs */}
                    <div className="flex items-center gap-6 text-sm font-medium px-2">
                      <button
                        onClick={() => setActiveTab("Store")}
                        className={`flex items-center gap-2 transition-colors ${activeTab === "Store" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        {activeTab === "Store" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        )}
                        Top Performers
                      </button>
                      <button
                        onClick={() => setActiveTab("Region")}
                        className={`transition-colors ${activeTab === "Region" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        Store
                      </button>
                      <button
                        onClick={() => setActiveTab("Area")}
                        className={`transition-colors ${activeTab === "Area" ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        Region
                      </button>
                    </div>

                    {/* Performers List */}
                    <div className="flex-1 flex flex-col gap-2.5 relative">
                      {/* Performer 1 */}
                      <div
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 flex items-center border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-white/[0.15] transition-colors"
                        onClick={() => setActiveStaffId("1")}
                      >
                        <div className="bg-emerald-500 rounded-full w-9 h-9 flex items-center justify-center font-bold text-base mr-3 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                          1
                        </div>
                        <div>
                          <div className="text-[9px] text-white/60 uppercase tracking-wider mb-0.5">
                            This Month
                          </div>
                          <div className="font-semibold text-[13px] text-white">
                            Sarut Jitranon
                          </div>
                        </div>
                        <div className="ml-auto text-right flex flex-col items-end">
                          <div className="font-bold text-lg leading-tight">
                            142
                          </div>
                          <div className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 mt-1 leading-none">
                            115%
                          </div>
                        </div>
                      </div>

                      {/* Performer 2 */}
                      <div
                        className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 flex items-center border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setActiveStaffId("2")}
                      >
                        <div className="bg-white/10 rounded-full w-9 h-9 flex items-center justify-center font-bold text-base text-white/80 border border-white/5 mr-3">
                          2
                        </div>
                        <div>
                          <div className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">
                            This Month
                          </div>
                          <div className="font-medium text-[13px] text-white/90">
                            Nadech K.
                          </div>
                        </div>
                        <div className="ml-auto text-right flex flex-col items-end">
                          <div className="font-bold text-lg leading-tight text-white/90">
                            256
                          </div>
                          <div className="bg-white/5 text-white/60 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 mt-1 leading-none">
                            125%
                          </div>
                        </div>
                      </div>

                      {/* Performer 3 */}
                      <div
                        className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 flex items-center border border-white/5 h-[72px] overflow-hidden relative cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setActiveStaffId("3")}
                      >
                        <div className="bg-white/10 rounded-full w-9 h-9 flex items-center justify-center font-bold text-base text-white/60 border border-white/5 mr-3">
                          3
                        </div>
                        <div>
                          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">
                            This Month
                          </div>
                          <div className="font-medium text-[13px] text-white/70">
                            Yaya U.
                          </div>
                        </div>
                        <div className="ml-auto text-right mr-2">
                          <div className="font-bold text-lg leading-tight text-white/70">
                            118
                          </div>
                        </div>
                        {/* Fade out mask to match the UI screenshot */}
                        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[rgba(18,54,39,1)] to-transparent pointer-events-none rounded-b-2xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {currentView === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                    <span className="font-semibold text-white">Upload files:</span>
                    <label className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15 transition-colors">
                      <input type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                      Choose Excel/CSV files
                    </label>
                    <span className="text-white/50">or use the search icon in the top bar.</span>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">
                        Admin Settings (Placeholder)
                      </h2>
                      <p className="text-sm text-white/60 mt-1">
                        Configure options and roles later.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-8 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative z-10 w-full min-h-[400px]">
                  <Settings className="w-16 h-16 text-white/20 mb-4 animate-[spin_4s_linear_infinite]" />
                  <h3 className="text-2xl font-semibold mb-2">
                    Settings Coming Soon
                  </h3>
                  <p className="text-white/60 max-w-md">
                    This is a placeholder for the settings page where admins can
                    manage staff roles, access permissions, and store
                    configurations.
                  </p>
                </div>
              </motion.div>
            )}
            {currentView === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-6 w-full h-full relative z-20"
              >
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                  {(["target", "current", "lastMonth", "lastYear", "categoryMaster"] as UploadKind[]).map((kind) => (
                    <label key={kind} className="group flex min-h-[110px] cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <input type="file" multiple={kind === "current"} accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFileUpload(e, kind)} />
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">{kind.replace(/([A-Z])/g, " $1")}</div>
                        <div className="mt-1 text-xs text-white/50">Drop or click to upload</div>
                      </div>
                      <div className="text-xs text-emerald-300">{uploadedFiles[kind].length} file(s)</div>
                    </label>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Upload จุดเดียวอยู่ที่หน้า Reports แล้ว ส่วนไอคอนแว่นขยายด้านบนเป็นทางลัดไปหน้า Reports เท่านั้น
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">
                        Backend Report Logic Preview
                      </h2>
                      <p className="text-sm text-white/60 mt-1">
                        Summary of branch, category, and officer calculations from the backend logic doc.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-2">
                    <button onClick={exportCsv} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
                      Export CSV
                    </button>
                    <div className="text-xs text-white/50">
                      {isParsing ? "Parsing Excel file..." : `Loaded ${uploadStats.branches} branches • ${uploadStats.categories} categories • ${uploadStats.officers} officers`}
                      <div className="mt-1 text-[11px] text-white/40">Files: Target {uploadedFiles.target.length} • Current {uploadedFiles.current.length} • Last Month {uploadedFiles.lastMonth.length} • Last Year {uploadedFiles.lastYear.length} • Category Master {uploadedFiles.categoryMaster.length}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {Object.entries(uploadedFiles).map(([kind, rows]) => (
                        <button key={kind} onClick={() => removeUploadedFile(kind as UploadKind)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10">
                          Clear {kind} ({rows.length})
                        </button>
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
                                <td className="py-3 px-3 text-white/80">฿{row.target.toLocaleString()}</td>
                                <td className="py-3 px-3 text-white/80">฿{row.actual.toLocaleString()}</td>
                                <td className={`py-3 px-3 font-semibold ${achPercent >= 100 ? "text-emerald-400" : "text-yellow-400"}`}>{achPercent.toFixed(1)}%</td>
                                <td className={`py-3 px-3 font-semibold ${momPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{momPercent.toFixed(1)}%</td>
                                <td className={`py-3 px-3 font-semibold ${yoyPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{yoyPercent.toFixed(1)}%</td>
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
                            <span className="text-white/70">Actual ฿{item.actual.toLocaleString()}</span>
                            <span className="text-white/70">Target ฿{item.target.toLocaleString()}</span>
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
                              <td className="py-3 px-4 text-white/70">{item.actual}</td>
                              <td className="py-3 px-4 text-white/70">{item.target}</td>
                              <td className="py-3 px-4 font-semibold text-emerald-400">{item.rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
