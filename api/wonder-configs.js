const { ensureRelationalSchema } = require("./_lib/tables-sync");
const {
  getTursoConfig,
  loadWonderConfigsDb,
  saveWonderConfigsDb,
  tursoExecute,
} = require("./_lib/turso");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const FILTER_FIELDS = [
  "categories",
  "subCategories",
  "models",
  "brands",
  "customerCodes",
  "productNames",
  "docTypes",
];

const normalizeFilter = (filter) => {
  if (!filter || typeof filter !== "object") return null;
  const out = {};
  FILTER_FIELDS.forEach((f) => {
    if (Array.isArray(filter[f])) {
      out[f] = filter[f].map((v) => String(v)).filter(Boolean);
    }
  });
  if (typeof filter.includeNonInventory === "boolean") {
    out.includeNonInventory = filter.includeNonInventory;
  }
  return Object.keys(out).length > 0 ? out : null;
};

const isLegacy = (item) => {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.filtersA) && Array.isArray(item.filtersB)) return false;
  return (
    Array.isArray(item.matchKeywords) ||
    Array.isArray(item.baseCategories) ||
    typeof item.divisor === "string" ||
    (typeof item.divisorColumn === "string" && item.divisorColumn)
  );
};

const DEFAULT_WONDER_CONFIGS = [
  {
    id: "w1",
    name: "COVER+",
    targetPercent: 60,
    calcType: "attach",
    labelA: "Smile > Cover+ with Apple Care Services (1+1)/Cover+ with Apple Care Services (2Y)/Cover+ with Apple Care Services (3Y)/COVER PLUS",
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Smile"],
        subCategories: [],
        models: [
          "Cover+ with Apple Care Services (1+1)",
          "Cover+ with Apple Care Services (2Y)",
          "Cover+ with Apple Care Services (3Y)",
          "COVER PLUS",
        ],
        brands: [],
        customerCodes: [],
        productNames: [
          "COVER+ with AppleCare Services for Apple iPhone (1-Year)",
          "COVER+ with AppleCare Services for Apple iPhone (2-Year)",
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
    labelA: "Promo Operator",
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Promo Operator"],
        brands: [],
        customerCodes: [],
        productNames: [],
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
    labelA: "Apple Acc for iPad & iPhone > APPLE PENCIL AND IPAD MAGIC KEYBOARD > Pencil",
    labelB: "iPad",
    filtersA: [
      {
        categories: ["Apple Acc for iPad & iPhone"],
        subCategories: ["APPLE PENCIL AND IPAD MAGIC KEYBOARD"],
        models: ["Pencil"],
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
    labelA: "PVL third-party accessory brands",
    labelB: "iPhone / iPad / Mac / Apple Watch",
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
    labelA: "Brand: BASEUS/BLUE BOX/FOX/IKARAO/JOYROOM/KING KONG/MCDODO/MUTURAL/QPLUS/TECHPRO/TITANV/WIWU",
    labelB: "Adapter / Cases / Mobile Cable / Power Bank / etc.",
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
    labelA: "ทุกสินค้า",
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["iPhone", "iPad", "Mac"],
        subCategories: [
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
        models: [],
        brands: [],
        customerCodes: ["UFUND PERSONAL"],
        productNames: [],
        docTypes: [],
      },
    ],
    filtersB: [
      {
        categories: ["iPhone"],
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
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Film for Mobile and Tablet"],
        subCategories: ["FILM IPHONE"],
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
    labelB: "iPad",
    filtersA: [
      {
        categories: ["Film for Mobile and Tablet"],
        subCategories: ["FILM IPAD"],
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
    labelB: "iPad",
    filtersA: [
      {
        categories: ["Case Club", "Cases"],
        subCategories: ["CASE IPAD"],
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
    labelB: "iPhone",
    filtersA: [
      {
        categories: ["Cases", "Case Club"],
        subCategories: ["CASE IPHONE"],
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

const LEGACY_KEYWORD_MAP = [
  { kw: "trade", divisor: "iPhone", divisorCats: ["iPhone"] },
  { kw: "cover", divisor: "iPhone", divisorCats: ["iPhone"] },
  { kw: "ufund", divisor: "iPhone", divisorCats: ["iPhone"] },
  { kw: "sim", divisor: "iPhone", divisorCats: ["iPhone"] },
  { kw: "pencil", divisor: "iPad", divisorCats: ["iPad"] },
  { kw: "applecare", divisor: "Mac", divisorCats: ["Mac"] },
  { kw: "case", divisor: "iPhone+iPad", divisorCats: ["iPhone", "iPad"] },
];

function inferLegacyKeyword(item) {
  const kws = Array.isArray(item.matchKeywords) ? item.matchKeywords : [];
  for (const kw of kws) {
    const norm = String(kw).toLowerCase();
    for (const m of LEGACY_KEYWORD_MAP) {
      if (norm.includes(m.kw)) return m;
    }
  }
  return null;
}

function migrateLegacyItem(item) {
  if (!isLegacy(item)) return null;
  const m = inferLegacyKeyword(item);
  const id = String(item.id || `w_${Date.now()}`);
  const name = String(item.name || m?.kw || "Wonder");
  const target = Number(item.targetPercent) || 0;
  const baseCats = Array.isArray(item.baseCategories) ? item.baseCategories : [];
  const baseFilter = { categories: [], subCategories: [], brands: [], customerCodes: [], productNames: [], docTypes: [], includeNonInventory: false };
  baseCats.forEach((b) => {
    const [c, s] = String(b).split("||");
    if (c) baseFilter.categories.push(c);
    if (s) baseFilter.subCategories.push(s);
  });
  const divFilter = {
    categories: m?.divisorCats || [],
    subCategories: [],
    brands: [],
    customerCodes: [],
    productNames: [],
    docTypes: [],
    includeNonInventory: false,
  };
  if (item.divisorColumn && item.divisorValue) {
    divFilter.brands = [String(item.divisorValue)];
  }
  return {
    id,
    name,
    targetPercent: target,
    calcType: "attach",
    labelA: name,
    labelB: m?.divisor || "iPhone",
    filtersA: [baseFilter],
    filtersB: [divFilter],
    color: "green",
  };
}

const parseConfigsBody = (body) => {
  if (!body || !Array.isArray(body)) return null;
  const out = [];
  for (const raw of body) {
    if (!raw || typeof raw !== "object") continue;
    let item = raw;
    if (isLegacy(item)) {
      const migrated = migrateLegacyItem(item);
      if (!migrated) continue;
      item = migrated;
    }
    if (!item.id || !item.name) continue;
    const filtersA = Array.isArray(item.filtersA)
      ? item.filtersA.map(normalizeFilter).filter(Boolean)
      : [];
    const filtersB = Array.isArray(item.filtersB)
      ? item.filtersB.map(normalizeFilter).filter(Boolean)
      : [];
    out.push({
      id: String(item.id),
      name: String(item.name),
      targetPercent: Number(item.targetPercent) || 0,
      calcType: item.calcType === "bahtRate" ? "bahtRate" : "attach",
      labelA: String(item.labelA || ""),
      labelB: String(item.labelB || ""),
      filtersA,
      filtersB,
      color: typeof item.color === "string" ? item.color : "green",
    });
  }
  return out.length > 0 ? out : null;
};

async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    getTursoConfig();
    await ensureRelationalSchema(tursoExecute);

    if (req.method === "GET") {
      let configs = await loadWonderConfigsDb(tursoExecute);
      if (configs.length === 0) {
        await saveWonderConfigsDb(tursoExecute, DEFAULT_WONDER_CONFIGS);
        configs = DEFAULT_WONDER_CONFIGS;
      }
      return res.status(200).json({ configs });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const records = parseConfigsBody(req.body);
      if (!records) {
        return res.status(400).json({
          error: "Invalid payload. Expect array of WonderItemConfig.",
        });
      }
      await saveWonderConfigsDb(tursoExecute, records);
      return res.status(200).json({ ok: true, count: records.length });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const missingCreds =
      message.includes("Turso credentials") ||
      message.includes("TURSO_DATABASE_URL");
    console.error("[api/wonder-configs]", message);
    if (req.method === "GET" && missingCreds) {
      return res.status(200).json({ configs: DEFAULT_WONDER_CONFIGS });
    }
    return res.status(missingCreds ? 503 : 500).json({ error: message });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};
module.exports.DEFAULT_WONDER_CONFIGS = DEFAULT_WONDER_CONFIGS;
