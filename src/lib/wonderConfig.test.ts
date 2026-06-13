import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcWonderForRows,
  calcWonderRate,
  migrateLegacyWonderConfig,
  normalizeWonderConfig,
  normalizeWonderConfigs,
  rowMatchesFilter,
  rowMatchesFilters,
  type WonderItemConfig,
} from "./wonderConfig";

const iphone = (overrides: Record<string, unknown> = {}) => ({
  "Category (Name)": "iPhone",
  "Sub Category": "IPHONE 16",
  "Product (Name)": "Apple iPhone 16 Pro",
  "Number": 1,
  "ราคาขายตามบิล": 40000,
  "Product Type": "Inventory Item",
  ...overrides,
});

const ufundRow = (overrides: Record<string, unknown> = {}) => ({
  "Category (Name)": "iPhone",
  "Sub Category": "IPHONE 16 PRO",
  "Product (Name)": "Apple iPhone 16 Pro",
  "Number": 1,
  "ราคาขายตามบิล": 40000,
  "Customer Code": "UFUND PERSONAL",
  "Product Type": "Inventory Item",
  ...overrides,
});

const simRow = (overrides: Record<string, unknown> = {}) => ({
  "Category (Name)": "Promo Operator",
  "Sub Category": "",
  "Product (Name)": "DTAC SIM",
  "Number": 1,
  "ราคาขายตามบิล": 0,
  "Product Type": "Service",
  ...overrides,
});

const ufundWonder: WonderItemConfig = {
  id: "w6",
  name: "UFUND P",
  targetPercent: 6,
  calcType: "attach",
  labelA: "",
  labelB: "",
  filtersA: [
    {
      categories: ["iPhone", "iPad", "Mac"],
      customerCodes: ["UFUND PERSONAL"],
      subCategories: [],
      models: [],
      brands: [],
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
};

describe("wonderConfig", () => {
  it("UFUND filter matches only rows with customer code UFUND PERSONAL", () => {
    const rows = [
      ufundRow(),
      iphone({ "Customer Code": "" }),
      iphone({ "Customer Code": "STU-PAYATSTORE" }),
    ];
    const result = calcWonderForRows(rows, ufundWonder);
    assert.equal(result.numerator, 1, "numerator counts only ufund rows");
    assert.equal(result.denominator, 3, "denominator counts all iPhone rows");
    const rate = calcWonderRate(result);
    assert.ok(rate > 0 && rate < 100, "rate is a percentage");
  });

  it("attach calc counts each non-SIM row as 1 (legacy countRows behavior)", () => {
    const w: WonderItemConfig = {
      ...ufundWonder,
      id: "test",
      filtersA: [
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
    };
    const rows = [
      iphone({ Number: 2 }),
      iphone({ Number: 3 }),
      iphone({ Number: 5 }),
    ];
    const result = calcWonderForRows(rows, w);
    assert.equal(result.numerator, 3, "each non-SIM row counts as 1, regardless of quantity");
    assert.equal(result.denominator, 3);
    assert.equal(calcWonderRate(result), 100);
  });

  it("attach calc uses quantity for SIM rows (legacy countRows behavior)", () => {
    const w: WonderItemConfig = {
      id: "test",
      name: "SIM",
      targetPercent: 15,
      calcType: "attach",
      labelA: "",
      labelB: "",
      filtersA: [
        {
          categories: ["Promo Operator", "SIM"],
          subCategories: [],
          models: [],
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
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
    };
    const rows = [
      simRow({ Number: 5 }),
      simRow({ Number: 3 }),
      iphone({ Number: 1 }),
    ];
    const result = calcWonderForRows(rows, w);
    assert.equal(result.numerator, 8, "SIM rows contribute their quantity (5+3)");
    assert.equal(result.denominator, 1, "iPhone row counted as 1");
  });

  it("bahtRate uses revenue not quantity", () => {
    const w: WonderItemConfig = {
      id: "test",
      name: "PVL Mix",
      targetPercent: 12,
      calcType: "bahtRate",
      labelA: "",
      labelB: "",
      filtersA: [
        {
          categories: [],
          subCategories: [],
          models: [],
          brands: ["TECHPRO"],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
      filtersB: [
        {
          categories: ["Cases"],
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
    };
    const rows = [
      iphone({ "ราคาขายตามบิล": 1000, Brand: "TECHPRO" }),
      iphone({ "ราคาขายตามบิล": 2000, "Category (Name)": "Cases" }),
    ];
    const result = calcWonderForRows(rows, w);
    assert.equal(result.numerator, 1000, "numerator is revenue of TECHPRO brand");
    assert.equal(result.denominator, 2000, "denominator is revenue of Cases");
    assert.equal(calcWonderRate(result), 50);
  });

  it("includeNonInventory=false drops non-inventory rows", () => {
    const w: WonderItemConfig = {
      id: "test",
      name: "SIM",
      targetPercent: 15,
      calcType: "attach",
      labelA: "",
      labelB: "",
      filtersA: [
        {
          categories: ["Promo Operator"],
          subCategories: [],
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
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
    };
    const rows = [simRow({ "Product Type": "Service" })];
    const result = calcWonderForRows(rows, w);
    assert.equal(result.numerator, 0, "non-inventory row excluded when includeNonInventory=false");
    assert.equal(result.denominator, 0);
  });

  it("includeNonInventory=true keeps service rows", () => {
    const w: WonderItemConfig = {
      id: "test",
      name: "SIM",
      targetPercent: 15,
      calcType: "attach",
      labelA: "",
      labelB: "",
      filtersA: [
        {
          categories: ["Promo Operator"],
          subCategories: [],
          models: [],
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
          subCategories: [],
          models: [],
          brands: [],
          customerCodes: [],
          productNames: [],
          docTypes: [],
        },
      ],
    };
    const rows = [simRow({ "Product Type": "Service" })];
    const result = calcWonderForRows(rows, w);
    assert.equal(result.numerator, 1, "service row counted when includeNonInventory=true");
  });

  it("migrates legacy matchKeywords UFUND to customerCode + productNames filter (2 groups OR'd)", () => {
    const legacy = {
      id: "w3",
      name: "UFUND Personal",
      targetPercent: 6,
      divisor: "iPhone",
      matchKeywords: ["ufund", "personal"],
      baseCategories: [],
      divisorCategories: [],
    };
    const migrated = migrateLegacyWonderConfig(legacy);
    assert.equal(migrated.calcType, "attach");
    // Group 1: customer code match
    assert.equal(migrated.filtersA[0].customerCodes?.[0], "UFUND PERSONAL");
    // Group 2: product name match (legacy isUfundRow fallback)
    const productNames = (migrated.filtersA[1]?.productNames ?? []) as string[];
    assert.ok(
      productNames.includes("ufund"),
      "ufund productNames fallback included in group 2",
    );
    // divisor base now matches iPhone + UFUND/Personal category rows
    assert.ok(
      (migrated.filtersB[0].categories ?? []).includes("iPhone"),
    );
    assert.ok(
      (migrated.filtersB[0].categories ?? []).includes("UFUND"),
    );
  });

  it("migrates legacy matchKeywords Pencil to multi-field filter", () => {
    const legacy = {
      id: "w5",
      name: "Pencil Attach",
      targetPercent: 85,
      divisor: "iPad",
      matchKeywords: ["pencil"],
      baseCategories: [],
      divisorCategories: [],
    };
    const migrated = migrateLegacyWonderConfig(legacy);
    assert.deepEqual(migrated.filtersA[0].categories, [
      "Apple Acc for iPad & iPhone",
      "Apple Acc for iPad and iPhone",
      "Apple Acc",
      "Accessories",
    ]);
    assert.ok(migrated.filtersA[0].productNames?.includes("Apple Pencil"));
    assert.ok(migrated.filtersA[0].productNames?.includes("Pencil"));
    assert.deepEqual(migrated.filtersB[0].categories, ["iPad"]);
  });

  it("migrates legacy baseCategories Cat||Sub into categories and subCategories", () => {
    const legacy = {
      id: "w_custom",
      name: "Custom",
      targetPercent: 30,
      divisor: "iPhone",
      matchKeywords: [],
      baseCategories: ["iPhone||Pro", "iPad||Pro"],
      divisorCategories: ["iPhone"],
    };
    const migrated = migrateLegacyWonderConfig(legacy);
    assert.deepEqual(migrated.filtersA[0].categories, ["iPhone", "iPad"]);
    assert.deepEqual(migrated.filtersA[0].subCategories, ["Pro"]);
    assert.deepEqual(migrated.filtersB[0].categories, ["iPhone"]);
  });

  it("normalizeWonderConfigs drops invalid items but keeps valid", () => {
    const items = [
      { id: "", name: "bad" },
      null,
      {
        id: "w1",
        name: "OK",
        targetPercent: 10,
        calcType: "attach",
        labelA: "x",
        labelB: "y",
        filtersA: [],
        filtersB: [],
      },
    ];
    const result = normalizeWonderConfigs(items);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "w1");
  });

  it("rowMatchesFilter returns true when all listed fields are empty", () => {
    const row = { "Category (Name)": "Anything" };
    assert.equal(rowMatchesFilter(row, { categories: [] }), true);
    assert.equal(rowMatchesFilter(row, undefined), true);
  });

  it("rowMatchesFilters uses OR across filter groups", () => {
    const row = iphone({ "Sub Category": "FILM IPHONE", "Category (Name)": "Film for Mobile and Tablet" });
    const filters = [
      { categories: ["Cases"], subCategories: [], models: [], brands: [], customerCodes: [], productNames: [], docTypes: [] },
      { categories: ["Film for Mobile and Tablet"], subCategories: ["FILM IPHONE"], models: [], brands: [], customerCodes: [], productNames: [], docTypes: [] },
    ];
    assert.equal(rowMatchesFilters(row, filters), true);
  });

  it("normalizeWonderConfig treats new-schema items as-is", () => {
    const item = {
      id: "w1",
      name: "COVER+",
      targetPercent: 60,
      calcType: "attach",
      labelA: "Smile",
      labelB: "iPhone",
      filtersA: [{ categories: ["Smile"], subCategories: [], models: [], brands: [], customerCodes: [], productNames: [], docTypes: [] }],
      filtersB: [{ categories: ["iPhone"], subCategories: [], models: [], brands: [], customerCodes: [], productNames: [], docTypes: [] }],
    };
    const out = normalizeWonderConfig(item);
    assert.equal(out?.id, "w1");
    assert.equal(out?.calcType, "attach");
    assert.equal(out?.filtersA[0].categories?.[0], "Smile");
  });

  it("rowMatchesFilter reads brand from multiple header aliases", () => {
    const filter = {
      categories: [],
      subCategories: [],
      models: [],
      brands: ["TECHPRO"],
      customerCodes: [],
      productNames: [],
      docTypes: [],
    };
    assert.equal(
      rowMatchesFilter({ "Category (Name)": "Cases", Brand: "TECHPRO" }, filter),
      true,
    );
    assert.equal(
      rowMatchesFilter({ "Category (Name)": "Cases", brand: "techpro" }, filter),
      true,
      "lowercase brand header",
    );
    assert.equal(
      rowMatchesFilter({ "Category (Name)": "Cases", "Brand Name": "TECHPRO" }, filter),
      true,
      "Brand Name header",
    );
  });

  it("rowMatchesFilter reads customer code from multiple header aliases", () => {
    const filter = {
      categories: [],
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: ["UFUND PERSONAL"],
      productNames: [],
      docTypes: [],
    };
    assert.equal(
      rowMatchesFilter(
        { "Category (Name)": "iPhone", "Customer Code": "UFUND PERSONAL" },
        filter,
      ),
      true,
    );
    assert.equal(
      rowMatchesFilter(
        { "Category (Name)": "iPhone", customerCodes: "UFUND PERSONAL" },
        filter,
      ),
      true,
      "lowercase customerCodes header",
    );
    assert.equal(
      rowMatchesFilter(
        { "Category (Name)": "iPhone", customer_code: "UFUND PERSONAL" },
        filter,
      ),
      true,
      "snake_case customer_code header",
    );
    assert.equal(
      rowMatchesFilter({ "Category (Name)": "iPhone", "Customer Code": "STU-PAYATSTORE" }, filter),
      false,
      "different customer code does not match",
    );
    assert.equal(
      rowMatchesFilter({ "Category (Name)": "iPhone" }, filter),
      false,
      "missing customer code does not match",
    );
  });

  it("Trade In filter (productNames-based) does NOT over-match all iPhone rows", () => {
    const migrated = migrateLegacyWonderConfig({
      id: "w1",
      name: "Trade In",
      targetPercent: 50,
      divisor: "iPhone",
      matchKeywords: ["trade", "เทรด"],
      baseCategories: [],
      divisorCategories: [],
    });
    const rows = [
      iphone({ "Product (Name)": "Apple iPhone 16 Pro" }),
      iphone({ "Product (Name)": "Trade In iPhone 14" }),
      iphone({ "Product (Name)": "iPhone เทรด 15" }),
    ];
    const result = calcWonderForRows(rows, migrated);
    assert.equal(result.numerator, 2, "only rows with 'trade' or 'เทรด' in product name");
    assert.equal(result.denominator, 3);
  });

  it("Mac APP filter (productNames-based) does NOT over-match all Mac rows", () => {
    const migrated = migrateLegacyWonderConfig({
      id: "w6",
      name: "Mac APP",
      targetPercent: 15,
      divisor: "Mac",
      matchKeywords: ["applecare", "care"],
      baseCategories: [],
      divisorCategories: [],
    });
    const rows = [
      iphone({ "Product (Name)": "MacBook Pro 14", "Category (Name)": "Mac" }),
      iphone({ "Product (Name)": "AppleCare for MacBook", "Category (Name)": "Mac" }),
      iphone({ "Product (Name)": "Magic Mouse", "Category (Name)": "Mac" }),
    ];
    const result = calcWonderForRows(rows, migrated);
    assert.equal(result.numerator, 1, "only AppleCare rows counted");
    assert.equal(result.denominator, 3);
  });

  it("reproduces legacy Trade In countRows behavior: prod contains 'trade' or 'เทรด'", () => {
    const migrated = migrateLegacyWonderConfig({
      id: "w1",
      name: "Trade In",
      targetPercent: 50,
      divisor: "iPhone",
      matchKeywords: ["trade", "เทรด"],
      baseCategories: [],
      divisorCategories: [],
    });
    const rows = [
      iphone({ "Product (Name)": "iPhone 16 Pro" }),
      iphone({ "Product (Name)": "iPhone Trade In 15" }),
      iphone({ "Product (Name)": "iPhone เทรด 14" }),
      { ...iphone(), "Category (Name)": "iPad", "Product (Name)": "iPad Pro" },
    ];
    const result = calcWonderForRows(rows, migrated);
    assert.equal(result.numerator, 2, "only rows with 'trade' or 'เทรด' in product name");
    // base counts iPhone rows = 3 (not iPad)
    assert.equal(result.denominator, 3);
  });

  it("reproduces legacy Cover Plus behavior: cat/prod contains 'cover' or 'care'", () => {
    const migrated = migrateLegacyWonderConfig({
      id: "w2",
      name: "Cover Plus",
      targetPercent: 25,
      divisor: "iPhone",
      matchKeywords: ["cover+", "care"],
      baseCategories: [],
      divisorCategories: [],
    });
    const rows = [
      iphone({ "Category (Name)": "Smile", "Product (Name)": "COVER+ iPhone 16" }),
      iphone({ "Category (Name)": "Apple Care", "Product (Name)": "AppleCare+ 1Y" }),
      iphone({ "Category (Name)": "iPhone", "Product (Name)": "iPhone 16" }),
    ];
    const result = calcWonderForRows(rows, migrated);
    assert.equal(result.numerator, 2, "rows where cat or prod contains cover/care");
    // base = divisor = iPhone → only 1 row (the iPhone category row)
    assert.equal(result.denominator, 1);
  });

  it("reproduces legacy UFUND behavior: customer code UFUND PERSONAL or text contains ufund", () => {
    const migrated = migrateLegacyWonderConfig({
      id: "w6",
      name: "UFUND P",
      targetPercent: 6,
      divisor: "iPhone",
      matchKeywords: ["ufund", "personal"],
      baseCategories: [],
      divisorCategories: [],
    });
    const rows = [
      iphone({ "Customer Code": "UFUND PERSONAL", "Product (Name)": "iPhone 16" }),
      iphone({ "Customer Code": "", "Product (Name)": "iPhone 16 UFUND" }),
      iphone({ "Customer Code": "STU-PAYATSTORE", "Product (Name)": "iPhone 16" }),
    ];
    const result = calcWonderForRows(rows, migrated);
    assert.equal(result.numerator, 2, "UFUND PERSONAL customer code + ufund in product name");
    // base = divisor categories: ["iPhone", "UFD", "UFUND", "Personal"]
    // all 3 rows have Category (Name) = "iPhone" → all 3 match
    assert.equal(result.denominator, 3);
  });
});
