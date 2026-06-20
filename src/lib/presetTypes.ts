/**
 * KPI Preset types
 *
 * Ported from /Users/astronien/Downloads/studio7-sales-dashboard-main/types/index.ts
 * (Next.js source repo). Adapted to the current Vite/React dashboard which uses
 * RawRow (Record<string, primitive>) instead of typed SaleLineItem.
 */

export type PresetCalcType =
  | "attach"
  | "unit"
  | "baht"
  | "bahtRate"
  | "catBaht"
  | "catQty"
  | "catAttach";

export type PresetColor = "green" | "amber" | "blue" | "teal" | "purple" | "coral";

export const PRESET_COLORS: PresetColor[] = [
  "green",
  "amber",
  "blue",
  "teal",
  "purple",
  "coral",
];

export interface ItemFilter {
  categories: string[];
  subCategories: string[];
  models: string[];
  brands: string[];
  customerCodes: string[];
  productNames: string[];
  docTypes: string[];
  includeNonInventory?: boolean;
}

export const emptyItemFilter = (): ItemFilter => ({
  categories: [],
  subCategories: [],
  models: [],
  brands: [],
  customerCodes: [],
  productNames: [],
  docTypes: [],
  includeNonInventory: false,
});

export interface Preset {
  id: string;
  name: string;
  calcType?: PresetCalcType;
  labelA: string;
  labelB: string;
  filtersA: ItemFilter[];
  filtersB: ItemFilter[];
  /** @deprecated kept for migration only */
  filterA?: ItemFilter;
  /** @deprecated kept for migration only */
  filterB?: ItemFilter;
  color: PresetColor;
  catDailyFilter?: string;
  catDailyFilterB?: string;
}

export interface PresetResult {
  presetId: string;
  presetName: string;
  calcType?: PresetCalcType;
  color: string;
  billsWithB: number;
  billsWithAandB: number;
  attachRate: number;
  totalBaht: number;
  totalBahtB: number;
  bahtRate: number;
}

export const DEFAULT_PRESETS: Omit<Preset, "id">[] = [
  {
    name: "Attach Smile",
    labelA: "Smile (Insurance)",
    labelB: "iPhone + iPad",
    filtersA: [
      {
        categories: ["Smile"],
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
        categories: ["iPhone", "iPad"],
        subCategories: [],
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
    name: "Attach Film",
    labelA: "Film",
    labelB: "iPhone + iPad",
    filtersA: [
      {
        categories: ["Film"],
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
        categories: ["iPhone", "iPad"],
        subCategories: [],
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
    name: "Attach Case",
    labelA: "Cases",
    labelB: "iPhone + iPad",
    filtersA: [
      {
        categories: ["Cases"],
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
        categories: ["iPhone", "iPad"],
        subCategories: [],
        models: [],
        brands: [],
        customerCodes: [],
        productNames: [],
        docTypes: [],
        includeNonInventory: false,
      },
    ],
    color: "blue",
  },
];
