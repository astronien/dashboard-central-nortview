import { getItem, setItem } from "./storage";

/**
 * Wonder / KPI Config — structured filter system.
 *
 * Each Wonder has:
 *   - id, name, targetPercent: basic metadata
 *   - calcType: "attach" (count-based attach rate A/B) | "bahtRate" (revenue-based rate A/B)
 *   - labelA / labelB: human-readable summaries of each filter
 *   - color: UI badge color
 *   - filtersA / filtersB: array of filter groups (OR within group, AND across groups)
 *     Each filter has multi-value arrays; a row matches the filter when for every non-empty
 *     array the row value (normalized) is included in the array.
 *   - includeNonInventory: if true, include rows whose Product Type is not "Inventory Item"
 *
 * Backward compatibility: legacy configs (matchKeywords / baseCategories / divisor / etc.)
 * are auto-converted to the new schema via `migrateLegacyWonderConfig()`.
 */

export type WonderCalcType = "attach" | "bahtRate";

export type WonderFilter = {
  categories?: string[];
  subCategories?: string[];
  models?: string[];
  brands?: string[];
  customerCodes?: string[];
  productNames?: string[];
  docTypes?: string[];
  includeNonInventory?: boolean;
};

export type WonderItemConfig = {
  id: string;
  name: string;
  targetPercent: number;
  calcType: WonderCalcType;
  labelA: string;
  labelB: string;
  filtersA: WonderFilter[];
  filtersB: WonderFilter[];
  color?: string;
};

export const DEFAULT_WONDER_CONFIGS: WonderItemConfig[] = [
  {
    id: "w1",
    name: "COVER+",
    targetPercent: 60,
    calcType: "attach",
    labelA:
      "Category/Product มีคำว่า 'cover' หรือ 'care' (เช่น COVER+, AppleCare, Cover Plus)",
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Smile", "Cover+", "Cases", "Apple Care"],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [
          "COVER+",
          "Cover+",
          "cover+",
          "Apple Care",
          "AppleCare",
          "applecare",
          "APPLECARE",
          "APPLE CARE",
          "Care+",
        ],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPhone"],
        subCategories: [
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 15",
          "IPHONE 15 PLUS",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 16E",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
  {
    id: "w2",
    name: "SIM",
    targetPercent: 15,
    calcType: "attach",
    labelA: "Promo Operator / SIM (นับจากจำนวน)",
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Promo Operator", "SIM", "Sim", "sim"],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: ["sim", "SIM", "Sim", "promo operator", "true sim"],
        docTypes: [],
        includeNonInventory: true,
      },
    ],
    filtersB: [
      {
        categories: ["iPhone"],
        subCategories: [
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 15",
          "IPHONE 15 PLUS",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 16E",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
  {
    id: "w3",
    name: "%ATT PENCIL",
    targetPercent: 85,
    calcType: "attach",
    labelA:
      "Product Name มีคำว่า 'pencil' หรือ 'pen' (เช่น Apple Pencil, Pencil Pro)",
    labelB:
      "iPad (ทุกรุ่น)",
    filtersA: [
      {
        categories: [
          "Apple Acc for iPad & iPhone",
          "Apple Acc for iPad and iPhone",
          "Apple Acc",
          "Accessories",
        ],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [
          "Pencil",
          "Apple Pencil",
          "Pen",
          "pencil",
          "PENCIL",
        ],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPad"],
        subCategories: [
          "IPAD 11TH GEN (2025)",
          "IPAD AIR 11 M3 5TH GEN (2025)",
          "IPAD AIR 11 M4 6TH GEN (2026)",
          "IPAD AIR 13 M3 2ND GEN (2025)",
          "IPAD AIR 13 M4 3RD GEN (2026)",
          "IPAD MINI 7 (2024)",
          "IPAD PRO 11 M4 5TH GEN (2024)",
          "IPAD PRO 11 M5 6TH GEN (2025)",
          "IPAD PRO 13 M4 7TH GEN (2024)",
          "IPAD PRO 13 M5 8TH GEN (2025)",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
  {
    id: "w4",
    name: "PVL",
    targetPercent: 30,
    calcType: "attach",
    labelA:
      "Adapter/Cases/Mobile Cable/Power Bank/Film for Mobile and Tablet/Film for Computer > ADAPTERS/CAR CHARGER/CASE ACCESSORIES/CASE AIRPODS/CASE APPLE WATCH/CASE IPAD/CASE IPHONE/CASE MACBOOK/... (PVL third-party accessories)",
    labelB:
      "iPhone/iPad > IPAD 11TH GEN (2025)/IPAD AIR 11 M3 5TH GEN (2025)/.../IPHONE AIR",
    filtersA: [
      {
        categories: [],
        subCategories: [],
        models: [],
        brands: [
          "BLUE BOX",
          "FOX",
          "IKARAO",
          "KING KONG",
          "MCDODO",
          "MUTURAL",
          "QPLUS",
          "TECHPRO",
          "TITANV",
          "BASEUS",
          "JOYROOM",
          "CASE CLUB",
        ],
        customerCodes: [],
        productNames: [],
        docTypes: [],
      },
    ],
    filtersB: [
      {
        categories: ["iPhone", "iPad", "Mac", "Apple Watch"],
        subCategories: [
          "CTO",
          "IMAC",
          "IPAD 11TH GEN (2025)",
          "IPAD AIR 11 M3 5TH GEN (2025)",
          "IPAD AIR 11 M4 6TH GEN (2026)",
          "IPAD AIR 13 M3 2ND GEN (2025)",
          "IPAD AIR 13 M4 3RD GEN (2026)",
          "IPAD MINI 7 (2024)",
          "IPAD PRO 11 M4 5TH GEN (2024)",
          "IPAD PRO 11 M5 6TH GEN (2025)",
          "IPAD PRO 13 M4 7TH GEN (2024)",
          "IPAD PRO 13 M5 8TH GEN (2025)",
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 15",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 16E",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
          "MAC MINI",
          "MACBOOK AIR",
          "MACBOOK NEO",
          "MACBOOK PRO RETINA",
          "SE (2024) GPS - 2ND GEN",
          "SE 3 (2025) CELLULAR - 3RD GEN",
          "SE 3 (2025) GPS - 3RD GEN",
          "SERIES 10 WATCH SPORT GPS",
          "SERIES 11 WATCH SPORT GPS",
          "WATCH ULTRA 3 (2025)",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
      },
    ],
    color: "purple",
  },
  {
    id: "w5",
    name: "PVL Mix Btb 3rd 12%",
    targetPercent: 12,
    calcType: "bahtRate",
    labelA:
      "Brand: BASEUS/BLUE BOX/FOX/IKARAO/JOYROOM/KING KONG/MCDODO/MUTURAL/QPLUS/TECHPRO/TITANV/WIWU",
    labelB:
      "Adapter/Bag/Case Club/Cases/Console and Gaming Gadget/External Harddrive/Film for Computer/Film for Mobile and Tablet/Flash Drive and Memory Card/Gadget/...",
    filtersA: [
      {
        categories: [],
        subCategories: [],
        models: [],
        brands: [
          "BASEUS",
          "BLUE BOX",
          "FOX",
          "IKARAO",
          "JOYROOM",
          "KING KONG",
          "MCDODO",
          "MUTURAL",
          "QPLUS",
          "TECHPRO",
          "TITANV",
          "CASE CLUB",
        ],
        customerCodes: [],
        productNames: [],
        docTypes: [],
      },
    ],
    filtersB: [
      {
        categories: [
          "Adapter",
          "Bag",
          "Case Club",
          "Cases",
          "Console and Gaming Gadget",
          "External Harddrive",
          "Film for Computer",
          "Film for Mobile and Tablet",
          "Flash Drive and Memory Card",
          "Gadget",
          "Gaming Gear",
          "Graphic Card",
          "Headphone",
          "Health & Sport",
          "IT Accessories",
          "Mainboard",
          "Mobile Cable",
          "Mobile and Tablet Accessory",
          "Monitor",
          "Mouse & Keyboards",
          "Network",
          "Outdoor Activities",
          "Power Bank",
          "Security",
          "Smart Living",
          "Smartphone Acc",
          "Smartwatch",
          "Software",
          "Solid State Drive Internal (SSD)",
          "Speaker",
          "Streaming",
          "Stylus",
          "Techgift",
          "Xiaomi Eco",
          "Printer",
        ],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
      },
    ],
    color: "teal",
  },
  {
    id: "w6",
    name: "UFUND P",
    targetPercent: 6,
    calcType: "attach",
    labelA: "ทุกสินค้า (UFUND PERSONAL)",
    labelB: "iPhone ที่มี UFUND / Personal ใน Category",
    filtersA: [
      // Group 1: customer code = UFUND PERSONAL
      {
        categories: [
          "iPhone",
          "iPad",
          "Mac",
          "CTO",
          "DISPLAY",
          "IMAC",
          "IPAD 10TH GEN (2022)",
          "IPAD 11TH GEN (2025)",
          "IPAD 9TH GEN (2021)",
          "IPAD AIR 11 M2 4TH GEN (2024)",
          "IPAD AIR 11 M3 5TH GEN (2025)",
          "IPAD AIR 11 M4 6TH GEN (2026)",
          "IPAD AIR 13 M2 1ST GEN (2024)",
          "IPAD AIR 13 M3 2ND GEN (2025)",
          "IPAD AIR 13 M4 3RD GEN (2026)",
          "IPAD AIR 5TH GEN (2022)",
          "IPAD MINI 6 (2021)",
          "IPAD MINI 7 (2024)",
          "IPAD PRO 11 M4 5TH GEN (2024)",
          "IPAD PRO 11 M5 6TH GEN (2025)",
          "IPAD PRO 12.9-INCH 6TH GEN (2022)",
          "IPAD PRO 13 M4 7TH GEN (2024)",
          "IPAD PRO 13 M5 8TH GEN (2025)",
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 14 PLUS",
          "IPHONE 15",
          "IPHONE 15 PLUS",
          "IPHONE 15 PRO",
          "IPHONE 15 PRO MAX",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 16 PRO",
          "IPHONE 16 PRO MAX",
          "IPHONE 16E",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
          "IPHONE SE",
          "MAC MINI",
          "MAC STUDIO",
          "MACBOOK AIR",
          "MACBOOK NEO",
          "MACBOOK PRO RETINA",
        ],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: ["UFUND PERSONAL"],
        productNames: [],
        docTypes: [],
      },
      // Group 2: product name contains ufund (legacy isUfundRow fallback)
      {
        categories: [],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: ["ufund personal", "ufund", "UFUND"],
        docTypes: [],
      },
    ],
    filtersB: [
      {
        categories: ["iPhone", "UFD", "UFUND", "Personal"],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
      },
    ],
    color: "green",
  },
  {
    id: "w7",
    name: "Film/iPhone",
    targetPercent: 50,
    calcType: "attach",
    labelA: "Film for Mobile and Tablet > FILM IPHONE",
    labelB:
      "iPhone > IPHONE 13/IPHONE 14/IPHONE 15/IPHONE 15 PLUS/IPHONE 16/IPHONE 16 PLUS/IPHONE 16E/IPHONE 17/IPHONE 17 PRO/IPHONE 17 PRO MAX/IPHONE 17E/IPHONE AIR",
    filtersA: [
      {
        categories: ["Film for Mobile and Tablet"],
        subCategories: ["FILM IPHONE"],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPhone"],
        subCategories: [
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 15",
          "IPHONE 15 PLUS",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 16E",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "amber",
  },
  {
    id: "w8",
    name: "Film/iPad",
    targetPercent: 50,
    calcType: "attach",
    labelA: "Film for Mobile and Tablet > FILM IPAD",
    labelB:
      "iPad > IPAD 11TH GEN (2025)/IPAD AIR 11 M3 5TH GEN (2025)/IPAD AIR 11 M4 6TH GEN (2026)/IPAD AIR 13 M3 2ND GEN (2025)/IPAD AIR 13 M4 3RD GEN (2026)/IPAD MINI 7 (2024)/IPAD PRO 11 M4 5TH GEN (2024)/IPAD PRO 11 M5 6TH GEN (2025)/IPAD PRO 13 M4 7TH GEN (2024)/IPAD PRO 13 M5 8TH GEN (2025)",
    filtersA: [
      {
        categories: ["Film for Mobile and Tablet"],
        subCategories: ["FILM IPAD"],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPad"],
        subCategories: [
          "IPAD 11TH GEN (2025)",
          "IPAD AIR 11 M3 5TH GEN (2025)",
          "IPAD AIR 11 M4 6TH GEN (2026)",
          "IPAD AIR 13 M3 2ND GEN (2025)",
          "IPAD AIR 13 M4 3RD GEN (2026)",
          "IPAD MINI 7 (2024)",
          "IPAD PRO 11 M4 5TH GEN (2024)",
          "IPAD PRO 11 M5 6TH GEN (2025)",
          "IPAD PRO 13 M4 7TH GEN (2024)",
          "IPAD PRO 13 M5 8TH GEN (2025)",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
  {
    id: "w9",
    name: "Case iPad",
    targetPercent: 50,
    calcType: "attach",
    labelA: "Case Club/Cases > CASE IPAD",
    labelB:
      "iPad > IPAD 11TH GEN (2025)/IPAD AIR 11 M3 5TH GEN (2025)/IPAD AIR 11 M4 6TH GEN (2026)/IPAD AIR 13 M3 2ND GEN (2025)/IPAD AIR 13 M4 3RD GEN (2026)/IPAD MINI 7 (2024)/IPAD PRO 11 M5 6TH GEN (2025)/IPAD PRO 13 M5 8TH GEN (2025)",
    filtersA: [
      {
        categories: ["Case Club", "Cases"],
        subCategories: ["CASE IPAD"],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPad"],
        subCategories: [
          "IPAD 11TH GEN (2025)",
          "IPAD AIR 11 M3 5TH GEN (2025)",
          "IPAD AIR 11 M4 6TH GEN (2026)",
          "IPAD AIR 13 M3 2ND GEN (2025)",
          "IPAD AIR 13 M4 3RD GEN (2026)",
          "IPAD MINI 7 (2024)",
          "IPAD PRO 11 M5 6TH GEN (2025)",
          "IPAD PRO 13 M5 8TH GEN (2025)",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
  {
    id: "w10",
    name: "Case iPhone",
    targetPercent: 50,
    calcType: "attach",
    labelA: "Cases/Case Club > CASE IPHONE",
    labelB:
      "iPhone > IPHONE 13/IPHONE 14/IPHONE 15/IPHONE 16/IPHONE 16 PLUS/IPHONE 17/IPHONE 17 PRO/IPHONE 17 PRO MAX/IPHONE 17E/IPHONE AIR",
    filtersA: [
      {
        categories: ["Cases", "Case Club"],
        subCategories: ["CASE IPHONE"],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    filtersB: [
      {
        categories: ["iPhone"],
        subCategories: [
          "IPHONE 13",
          "IPHONE 14",
          "IPHONE 15",
          "IPHONE 16",
          "IPHONE 16 PLUS",
          "IPHONE 17",
          "IPHONE 17 PRO",
          "IPHONE 17 PRO MAX",
          "IPHONE 17E",
          "IPHONE AIR",
        ],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "green",
  },
];

const LOCAL_STORAGE_KEY = "dashboard_7wonder_configs";

const normalize = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeForCompare = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]/gi, "")
    .trim();

const rowField = (row: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val);
    }
  }
  return "";
};

const matchesAny = (rowValue: string, list: string[] | undefined): boolean => {
  if (!list || list.length === 0) return true;
  const norm = normalize(rowValue);
  const compact = normalizeForCompare(rowValue);
  if (!norm && !compact) return false;
  return list.some((item) => {
    const a = normalize(item);
    const b = normalizeForCompare(item);
    if (!a) return false;
    return norm === a || (norm && a.includes(norm)) || (norm && norm.includes(a)) || (b && compact && compact.includes(b));
  });
};

export function rowMatchesFilter(
  row: Record<string, unknown>,
  filter: WonderFilter | undefined,
): boolean {
  if (!filter) return true;

  if (filter.includeNonInventory === false) {
    const productType = String(
      row["Product Type"] ?? row.product_type ?? "Inventory Item",
    ).trim();
    if (productType && productType !== "Inventory Item") return false;
  }

  const category = rowField(
    row,
    "Category (Name)",
    "category",
    "Category",
    "category_name",
    "Cat",
  );
  const subCategory = rowField(
    row,
    "Sub Category",
    "sub_category",
    "SubCategory",
    "subcategory",
    "Sub_Category",
  );
  const model = rowField(
    row,
    "Model",
    "model",
    "Models",
    "Model Name",
    "model_name",
  );
  const brand = rowField(
    row,
    "Brand",
    "brand",
    "Brands",
    "Brand Name",
    "brand_name",
  );
  const customerCode = rowField(
    row,
    "Customer (Code)",
    "Customer Code",
    "customerCodes",
    "customer_code",
    "CustomerCode",
    "Cust Code",
    "Customer code",
    "Customer Code ",
  );
  const productName = rowField(
    row,
    "Product (Name)",
    "product_name",
    "Product",
    "Product Name",
  );
  const docType = rowField(row, "Doc Type", "doc_type", "DocType");

  if (!matchesAny(category, filter.categories)) return false;
  if (!matchesAny(subCategory, filter.subCategories)) return false;
  if (!matchesAny(model, filter.models)) return false;
  if (!matchesAny(brand, filter.brands)) return false;
  if (!matchesAny(customerCode, filter.customerCodes)) return false;
  if (!matchesAny(productName, filter.productNames)) return false;
  if (!matchesAny(docType, filter.docTypes)) return false;

  return true;
}

export function rowMatchesFilters(
  row: Record<string, unknown>,
  filters: WonderFilter[] | undefined,
): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.some((f) => rowMatchesFilter(row, f));
}

const toNumber = (value: unknown): number =>
  Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

const rowQuantity = (row: Record<string, unknown>): number => {
  const v = toNumber(
    row["Number"] ?? row.number ?? row.qty ?? row.quantity ?? 1,
  );
  return v > 0 ? v : 1;
};

const rowIsSim = (row: Record<string, unknown>): boolean => {
  const cat = String(row["Category (Name)"] ?? row.category ?? "").toLowerCase();
  const sub = String(row["Sub Category"] ?? row.sub_category ?? "").toLowerCase();
  const prod = String(row["Product (Name)"] ?? row.product_name ?? "").toLowerCase();
  const text = `${cat} ${sub} ${prod}`;
  return cat.includes("sim") || text.includes(" sim ") || text.startsWith("sim") || text.endsWith(" sim");
};

/**
 * Default per-row unit for "attach" calc.
 * Mirrors the legacy `countRows` logic in App.tsx:
 *   - SIM rows contribute their quantity (Number / number / qty)
 *   - every other row counts as 1 unit, regardless of quantity
 */
const rowDefaultUnits = (row: Record<string, unknown>): number => {
  if (rowIsSim(row)) return rowQuantity(row);
  return 1;
};

const rowRevenue = (row: Record<string, unknown>): number =>
  toNumber(
    row["ราคาขายตามบิล"] ??
      row.bill_amount ??
      row["Total Price"] ??
      row.totalPrice ??
      0,
  );

export interface WonderCalcResult {
  numerator: number;
  denominator: number;
  numeratorRows: number;
  denominatorRows: number;
}

export function calcWonderForRows(
  rows: Record<string, unknown>[],
  wonder: Pick<WonderItemConfig, "filtersA" | "filtersB" | "calcType">,
): WonderCalcResult {
  let numerator = 0;
  let denominator = 0;
  let numeratorRows = 0;
  let denominatorRows = 0;

  rows.forEach((row) => {
    const matchA = rowMatchesFilters(row, wonder.filtersA);
    const matchB = rowMatchesFilters(row, wonder.filtersB);

    if (wonder.calcType === "bahtRate") {
      if (matchA) numerator += rowRevenue(row);
      if (matchB) denominator += rowRevenue(row);
    } else {
      if (matchA) {
        numerator += rowDefaultUnits(row);
        numeratorRows += 1;
      }
      if (matchB) {
        denominator += rowDefaultUnits(row);
        denominatorRows += 1;
      }
    }
  });

  return { numerator, denominator, numeratorRows, denominatorRows };
}

export function calcWonderRate(result: WonderCalcResult): number {
  if (!result.denominator) return 0;
  return (result.numerator / result.denominator) * 100;
}

export function isLegacyWonderConfig(item: any): boolean {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.filtersA) && Array.isArray(item.filtersB)) return false;
  if (Array.isArray(item.matchKeywords)) return true;
  if (Array.isArray(item.baseCategories)) return true;
  if (typeof item.divisor === "string") return true;
  if (typeof item.divisorColumn === "string" && item.divisorColumn) return true;
  return false;
}

const LEGACY_KEYWORD_TO_FILTER: Record<
  string,
  { name: string; filter: WonderFilter; divisorFilter: WonderFilter }
> = {
  trade: {
    name: "Trade In",
    filter: {
      categories: [],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["trade", "เทรด", "Trade In", "Trade-In", "TRADE IN"],
      docTypes: [],
      includeNonInventory: false,
    },
    divisorFilter: {
      categories: ["iPhone"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
  coverplus: {
    name: "Cover Plus",
    filter: {
      categories: ["Smile", "Cover+", "Cases", "Apple Care"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [
        "COVER+",
        "Cover+",
        "cover+",
        "Apple Care",
        "AppleCare",
        "applecare",
        "APPLECARE",
        "APPLE CARE",
        "Care+",
      ],
      docTypes: [],
      includeNonInventory: false,
    },
    divisorFilter: {
      categories: ["iPhone"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
  ufund: {
    name: "UFUND P",
    filter: {
      // Group 1: customer code = UFUND PERSONAL
      categories: [
        "iPhone",
        "iPad",
        "Mac",
        "CTO",
        "DISPLAY",
        "IMAC",
        "IPAD 10TH GEN (2022)",
        "IPAD 11TH GEN (2025)",
        "IPAD 9TH GEN (2021)",
        "IPAD AIR 11 M2 4TH GEN (2024)",
        "IPAD AIR 11 M3 5TH GEN (2025)",
        "IPAD AIR 11 M4 6TH GEN (2026)",
        "IPAD AIR 13 M2 1ST GEN (2024)",
        "IPAD AIR 13 M3 2ND GEN (2025)",
        "IPAD AIR 13 M4 3RD GEN (2026)",
        "IPAD AIR 5TH GEN (2022)",
        "IPAD MINI 6 (2021)",
        "IPAD MINI 7 (2024)",
        "IPAD PRO 11 M4 5TH GEN (2024)",
        "IPAD PRO 11 M5 6TH GEN (2025)",
        "IPAD PRO 12.9-INCH 6TH GEN (2022)",
        "IPAD PRO 13 M4 7TH GEN (2024)",
        "IPAD PRO 13 M5 8TH GEN (2025)",
        "IPHONE 13",
        "IPHONE 14",
        "IPHONE 14 PLUS",
        "IPHONE 15",
        "IPHONE 15 PLUS",
        "IPHONE 15 PRO",
        "IPHONE 15 PRO MAX",
        "IPHONE 16",
        "IPHONE 16 PLUS",
        "IPHONE 16 PRO",
        "IPHONE 16 PRO MAX",
        "IPHONE 16E",
        "IPHONE 17",
        "IPHONE 17 PRO",
        "IPHONE 17 PRO MAX",
        "IPHONE 17E",
        "IPHONE AIR",
        "IPHONE SE",
        "MAC MINI",
        "MAC STUDIO",
        "MACBOOK AIR",
        "MACBOOK NEO",
        "MACBOOK PRO RETINA",
      ],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: ["UFUND PERSONAL"],
      productNames: [],
      docTypes: [],
    },
    // Group 2 (stored in a second preset entry merged at migration time)
    divisorFilter: {
      categories: ["iPhone", "UFD", "UFUND", "Personal"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
    },
  },
  ufund_text_fallback: {
    name: "UFUND P",
    filter: {
      categories: [],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["ufund personal", "ufund", "UFUND"],
      docTypes: [],
    },
    divisorFilter: {
      categories: [],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
    },
  },
  sim: {
    name: "SIM Attach",
    filter: {
      categories: ["Promo Operator", "SIM", "Sim", "sim"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["sim", "SIM", "Sim", "promo operator", "true sim"],
      docTypes: [],
      includeNonInventory: true,
    },
    divisorFilter: {
      categories: ["iPhone"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
  pencil: {
    name: "Pencil Attach",
    filter: {
      categories: [
        "Apple Acc for iPad & iPhone",
        "Apple Acc for iPad and iPhone",
        "Apple Acc",
        "Accessories",
      ],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["Pencil", "Apple Pencil", "PENCIL", "pencil", "Pen"],
      docTypes: [],
      includeNonInventory: false,
    },
    divisorFilter: {
      categories: ["iPad"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
  applecare: {
    name: "Mac APP",
    filter: {
      categories: [],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["AppleCare", "APPLECARE", "applecare", "Apple Care", "APPLE CARE"],
      docTypes: [],
      includeNonInventory: false,
    },
    divisorFilter: {
      categories: ["Mac"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
  case: {
    name: "Case iPhone+iPad",
    filter: {
      categories: ["Cases", "Case Club"],
      subCategories: ["CASE IPHONE", "CASE IPAD"],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: ["case", "Case", "CASE"],
      docTypes: [],
      includeNonInventory: false,
    },
    divisorFilter: {
      categories: ["iPhone", "iPad"],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: [],
      productNames: [],
      docTypes: [],
      includeNonInventory: false,
    },
  },
};

function inferKeywordFromLegacy(item: any): string {
  const keywords = Array.isArray(item?.matchKeywords) ? item.matchKeywords : [];
  for (const kw of keywords) {
    const norm = String(kw).toLowerCase();
    if (norm.includes("trade")) return "trade";
    if (norm.includes("cover")) return "coverplus";
    if (norm.includes("ufund")) return "ufund";
    if (norm.includes("sim")) return "sim";
    if (norm.includes("pencil")) return "pencil";
    if (norm.includes("applecare") || norm.includes("care")) return "applecare";
    if (norm.includes("case")) return "case";
  }
  return "";
}

export function migrateLegacyWonderConfig(item: any): WonderItemConfig {
  const kw = inferKeywordFromLegacy(item);
  const preset = LEGACY_KEYWORD_TO_FILTER[kw];
  const fallbackPreset =
    kw === "ufund" ? LEGACY_KEYWORD_TO_FILTER["ufund_text_fallback"] : null;

  const filterA: WonderFilter = preset
    ? { ...preset.filter }
    : {
        categories: [],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      };

  const filterB: WonderFilter = preset
    ? { ...preset.divisorFilter }
    : {
        categories: [],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      };

  const filterAExtra: WonderFilter | null = fallbackPreset
    ? { ...fallbackPreset.filter }
    : null;

  const baseCats = Array.isArray(item?.baseCategories) ? item.baseCategories : [];
  if (baseCats.length) {
    const cats: string[] = [];
    const subs: string[] = [];
    baseCats.forEach((b: string) => {
      const [c, s] = String(b).split("||");
      if (c) cats.push(c);
      if (s) subs.push(s);
    });
    if (cats.length) filterA.categories = Array.from(new Set([...(filterA.categories ?? []), ...cats]));
    if (subs.length) filterA.subCategories = Array.from(new Set([...(filterA.subCategories ?? []), ...subs]));
  }

  const divCats = Array.isArray(item?.divisorCategories) ? item.divisorCategories : [];
  if (divCats.length) {
    const cats: string[] = [];
    const subs: string[] = [];
    divCats.forEach((b: string) => {
      const [c, s] = String(b).split("||");
      if (c) cats.push(c);
      if (s) subs.push(s);
    });
    if (cats.length) filterB.categories = Array.from(new Set([...(filterB.categories ?? []), ...cats]));
    if (subs.length) filterB.subCategories = Array.from(new Set([...(filterB.subCategories ?? []), ...subs]));
  }

  if (item?.divisorColumn && item?.divisorValue) {
    filterB.productNames = filterB.productNames ?? [];
    filterB.brands = [...(filterB.brands ?? []), String(item.divisorValue)];
  }

  return {
    id: String(item?.id ?? `w_${Date.now()}`),
    name: String(item?.name ?? preset?.name ?? "Wonder"),
    targetPercent: Number(item?.targetPercent) || 0,
    calcType: "attach",
    labelA: preset?.name ?? item?.name ?? "ตัวเศษ",
    labelB: kw === "ufund" ? "iPhone" : item?.divisor ?? "iPhone",
    filtersA: filterAExtra ? [filterA, filterAExtra] : [filterA],
    filtersB: [filterB],
    color: "green",
  };
}

export function normalizeWonderConfig(item: any): WonderItemConfig | null {
  if (!item || typeof item !== "object") return null;
  if (isLegacyWonderConfig(item)) {
    return migrateLegacyWonderConfig(item);
  }
  if (!item.id || !item.name) return null;
  return {
    id: String(item.id),
    name: String(item.name),
    targetPercent: Number(item.targetPercent) || 0,
    calcType: item.calcType === "bahtRate" ? "bahtRate" : "attach",
    labelA: String(item.labelA ?? ""),
    labelB: String(item.labelB ?? ""),
    filtersA: Array.isArray(item.filtersA) ? item.filtersA : [],
    filtersB: Array.isArray(item.filtersB) ? item.filtersB : [],
    color: typeof item.color === "string" ? item.color : "green",
  };
}

export function normalizeWonderConfigs(items: unknown): WonderItemConfig[] {
  if (!Array.isArray(items)) return DEFAULT_WONDER_CONFIGS;
  const out: WonderItemConfig[] = [];
  for (const raw of items) {
    const norm = normalizeWonderConfig(raw);
    if (norm) out.push(norm);
  }
  return out.length > 0 ? out : DEFAULT_WONDER_CONFIGS;
}

export async function loadWonderConfigs(): Promise<WonderItemConfig[]> {
  try {
    const stored = await getItem<unknown>(LOCAL_STORAGE_KEY);
    if (stored === null) return DEFAULT_WONDER_CONFIGS;
    return normalizeWonderConfigs(stored);
  } catch {
    return DEFAULT_WONDER_CONFIGS;
  }
}

export async function saveWonderConfigs(configs: WonderItemConfig[]): Promise<void> {
  try {
    await setItem(LOCAL_STORAGE_KEY, configs);
  } catch {
    // silently fail
  }
}

export async function fetchWonderConfigs(): Promise<WonderItemConfig[]> {
  try {
    const res = await fetch("/api/wonder-configs");
    if (!res.ok) throw new Error("HTTP error");
    const data = await res.json();
    if (data && Array.isArray(data.configs) && data.configs.length > 0) {
      const mapped = normalizeWonderConfigs(data.configs);
      void saveWonderConfigs(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn(
      "Failed to fetch wonder configs from Turso, falling back to IDB:",
      err,
    );
  }
  return loadWonderConfigs();
}

export async function updateWonderConfigs(
  configs: WonderItemConfig[],
): Promise<boolean> {
  void saveWonderConfigs(configs);
  try {
    const res = await fetch("/api/wonder-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to save wonder configs to Turso:", err);
    return false;
  }
}
