export const DEFAULT_BASE_CATEGORIES = [
  "iPhone",
  "Mac",
  "iPad",
  "Apple Watch",
];

export const DEFAULT_ATTACH_CATEGORIES = ["Apple Care", "Cover+", "SIM"];

export type SpreadsheetRow = Record<string, string | number | undefined>;

export type AttachMapEntry = { units: number; rate: number; isHit: boolean };

export type AttachOfficerRow = {
  id: string;
  name: string;
  branch: string;
  staffId: number;
  baseUnits: number;
  attachMap: Record<string, AttachMapEntry>;
  totalAttachUnitsForSorting: number;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

const toNumber = (value: unknown) =>
  Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

export const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { แพวนภา: "แพรวนภา" };
  let cleaned = normalizeText(name)
    .replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "")
    .replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from)))
      cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

export const matchesOfficer = (a: string, b: string) => {
  const left = cleanOfficerName(a);
  const right = cleanOfficerName(b);
  return left === right || left.includes(right) || right.includes(left);
};

export function buildCategoryLookup(categoryMaster: SpreadsheetRow[]) {
  const lookup = new Map<string, string>();
  categoryMaster.forEach((row) => {
    const key = normalizeText(
      row["Cat & Sub Cat"] ?? row["Category (Name)"] ?? row.SubCategory,
    );
    const value = String(
      row["CAT Daily"] ??
        row["Category (Name)"] ??
        row["Group Category"] ??
        "",
    ).trim();
    if (key && value) lookup.set(key, value);
  });
  return lookup;
}

function mapGroupCategoryFallback(
  categoryName: string,
  subCategory = "",
  productName = "",
) {
  const text = normalizeText(`${categoryName} ${subCategory} ${productName}`);
  if (productName.toUpperCase().includes("COVER+") || text.includes("cover+"))
    return "Cover+";
  if (text.includes("apple care") || text.includes("applecare"))
    return "Apple Care";
  if (text.includes("iphone")) return "iPhone";
  if (
    text.includes("macbook") ||
    text.includes("imac") ||
    (text.includes("mac") && !text.includes("machine"))
  )
    return "Mac";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("smartphone")) return "Smartphone";
  if (text.includes("desktop")) return "Desktop";
  if (text.includes("notebook") || text.includes("laptop")) return "Notebook";
  if (text.includes("tablet")) return "Tablet";
  if (text.includes("sim")) return "SIM";
  if (text.includes("diy")) return "DIY";
  if (text.includes("btb") && text.includes("apple")) return "BTB(Apple)";
  if (text.includes("btb") || text.includes("business")) return "BTB";
  return categoryName.trim() || "Other";
}

export function getGroupCategory(
  categoryName: string,
  subCategory: string,
  categoryLookup: Map<string, string>,
  productName = "",
) {
  if (productName.toUpperCase().includes("COVER+")) return "Cover+";

  const keys = [
    normalizeText(`${categoryName}${subCategory}`),
    normalizeText(subCategory),
    normalizeText(categoryName),
    normalizeText(productName),
  ];
  for (const key of keys) {
    if (key && categoryLookup.has(key)) return categoryLookup.get(key)!;
  }
  return mapGroupCategoryFallback(categoryName, subCategory, productName);
}

function findOfficerRow<T extends { name: string; staffId: number }>(
  rows: T[],
  salesRow: SpreadsheetRow,
) {
  const officerId = toNumber(
    salesRow["Officer ID"] ?? salesRow.officerId ?? salesRow["Staff ID"],
  );
  const officerName = String(
    salesRow["Officer (Name)"] ?? salesRow.Officer ?? salesRow.officer ?? "",
  ).trim();

  if (officerId > 0) {
    const byId = rows.find((o) => o.staffId === officerId);
    if (byId) return byId;
  }

  if (!officerName) return null;

  const normalized = officerName.toLowerCase();
  return (
    rows.find((o) => o.name.toLowerCase() === normalized) ??
    rows.find((o) => {
      const first = o.name.toLowerCase().split(" ")[0];
      return normalized.startsWith(`${first} `);
    }) ??
    rows.find((o) => matchesOfficer(o.name, officerName)) ??
    null
  );
}

export function computeAttachRateRows(params: {
  currentRows: SpreadsheetRow[];
  targetRows: SpreadsheetRow[];
  categoryMaster: SpreadsheetRow[];
  baseCategories: string[];
  attachCategories: string[];
  kpiTarget?: number;
  filterBranch?: string;
}): AttachOfficerRow[] {
  const {
    currentRows,
    targetRows,
    categoryMaster,
    baseCategories,
    attachCategories,
    kpiTarget = 20,
    filterBranch = "All Branches",
  } = params;

  if (!currentRows.length) return [];

  const categoryLookup = buildCategoryLookup(categoryMaster);
  const filteredTargets =
    filterBranch !== "All Branches"
      ? targetRows.filter(
          (t) =>
            String(t["BRANCH NAME"] ?? t.branch ?? "").trim() === filterBranch,
        )
      : targetRows;

  const officersMap = new Map<
    string,
    {
      name: string;
      branch: string;
      staffId: number;
      baseUnits: number;
      attachMap: Record<string, AttachMapEntry>;
    }
  >();

  filteredTargets.forEach((t) => {
    const name = `${String(t.NAME ?? "").trim()} ${String(t.SURNAME ?? "").trim()}`.trim();
    if (!name) return;
    const key = cleanOfficerName(name);
    if (!officersMap.has(key)) {
      const attachMap: Record<string, AttachMapEntry> = {};
      attachCategories.forEach((cat) => {
        attachMap[cat] = { units: 0, rate: 0, isHit: false };
      });
      officersMap.set(key, {
        name,
        branch: String(t["BRANCH NAME"] ?? "").trim(),
        staffId: toNumber(t["STAFF ID"] ?? t.staffId),
        baseUnits: 0,
        attachMap,
      });
    }
  });

  const officerRows = Array.from(officersMap.values());

  currentRows.forEach((row) => {
    const branch = String(row["Branch (Name)"] ?? row.branch ?? "").trim();
    if (filterBranch !== "All Branches" && branch !== filterBranch) return;

    const mappedOfficer = findOfficerRow(officerRows, row);
    if (!mappedOfficer) return;

    const categoryName = String(row["Category (Name)"] ?? row.category ?? "").trim();
    const subCategory = String(row["Sub Category"] ?? row.subcategory ?? "").trim();
    const productName = String(row["Product (Name)"] ?? row.product ?? "").trim();
    let gc = getGroupCategory(
      categoryName,
      subCategory,
      categoryLookup,
      productName,
    );
    if (productName.toUpperCase().includes("COVER+")) gc = "Cover+";

    const units = Math.max(toNumber(row.Number ?? row.number ?? row.qty), 0);
    if (!units) return;

    if (baseCategories.includes(gc) || baseCategories.includes(subCategory)) {
      mappedOfficer.baseUnits += units;
    }

    attachCategories.forEach((cat) => {
      if (gc === cat || subCategory === cat) {
        if (!mappedOfficer.attachMap[cat]) {
          mappedOfficer.attachMap[cat] = { units: 0, rate: 0, isHit: false };
        }
        mappedOfficer.attachMap[cat].units += units;
      }
    });
  });

  return officerRows
    .map((o) => {
      let totalAttachUnitsForSorting = 0;
      attachCategories.forEach((cat) => {
        const units = o.attachMap[cat]?.units || 0;
        const rate = o.baseUnits > 0 ? (units / o.baseUnits) * 100 : 0;
        if (o.attachMap[cat]) {
          o.attachMap[cat].rate = rate;
          o.attachMap[cat].isHit = rate >= kpiTarget;
        }
        totalAttachUnitsForSorting += units;
      });
      return {
        id: cleanOfficerName(o.name),
        name: o.name,
        branch: o.branch,
        staffId: o.staffId,
        baseUnits: o.baseUnits,
        attachMap: o.attachMap,
        totalAttachUnitsForSorting,
      };
    })
    .sort(
      (a, b) => b.totalAttachUnitsForSorting - a.totalAttachUnitsForSorting,
    );
}

export function toLegacyAttachRates(row: AttachOfficerRow) {
  const pickRate = (names: string[]) => {
    for (const name of names) {
      const rate = row.attachMap[name]?.rate;
      if (rate != null && rate > 0) return Math.min(Math.round(rate), 160);
    }
    return 0;
  };
  return {
    appleCare: pickRate(["Apple Care", "Cover+"]),
    accessories: pickRate(["DIY", "BTB", "BTB(Apple)", "Tablet", "Smartphone"]),
    services: pickRate(["SIM"]),
  };
}

export function overallAttachRate(row: AttachOfficerRow) {
  if (!row.baseUnits) return 0;
  return Math.round((row.totalAttachUnitsForSorting / row.baseUnits) * 100);
}
