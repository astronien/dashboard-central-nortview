/**
 * Preset calculation engine
 *
 * Ported from /Users/astronien/Downloads/studio7-sales-dashboard-main/utils/presetEngine.ts
 * Adapted to use RawRow (Record<string, primitive>) and the ROW_READERS from presetBills.ts.
 */

import type { BillSummary } from "./presetBills";
import { ROW_READERS } from "./presetBills";
import type { ItemFilter, Preset, PresetResult } from "./presetTypes";

/**
 * Check if a single line item matches any of the given filters (OR logic).
 */
export function matchesAnyFilter(
  row: Record<string, unknown>,
  filters: ItemFilter[],
): boolean {
  if (filters.length === 0) return false;
  return filters.some((filter) => {
    const cats = filter?.categories ?? [];
    const subs = filter?.subCategories ?? [];
    const mods = filter?.models ?? [];
    const brnds = filter?.brands ?? [];
    const prodNames = filter?.productNames ?? [];

    const cat = ROW_READERS.getCategoryName(row as any);
    const sub = ROW_READERS.getSubCategory(row as any);
    const mod = ROW_READERS.getModel(row as any);
    const brand = ROW_READERS.getBrand(row as any);
    const prod = ROW_READERS.getProductName(row as any);
    const catDaily = ROW_READERS.getCatDaily(row as any);

    const categoryMatch =
      cats.length === 0 || cats.includes(cat) || (catDaily && cats.includes(catDaily));
    const subCategoryMatch = subs.length === 0 || subs.includes(sub);
    const modelMatch = mods.length === 0 || mods.includes(mod);
    const brandMatch = brnds.length === 0 || brnds.includes(brand);
    const productMatch = prodNames.length === 0 || prodNames.includes(prod);

    return categoryMatch && subCategoryMatch && modelMatch && brandMatch && productMatch;
  });
}

function rowMatchesFilter(
  row: Record<string, unknown>,
  filter: ItemFilter,
  customerCode: string,
): boolean {
  const cats = filter?.categories ?? [];
  const subs = filter?.subCategories ?? [];
  const mods = filter?.models ?? [];
  const brnds = filter?.brands ?? [];
  const custCodes = filter?.customerCodes ?? [];
  const prodNames = filter?.productNames ?? [];
  const docTypes = filter?.docTypes ?? [];

  const cat = ROW_READERS.getCategoryName(row as any);
  const sub = ROW_READERS.getSubCategory(row as any);
  const mod = ROW_READERS.getModel(row as any);
  const brand = ROW_READERS.getBrand(row as any);
  const prod = ROW_READERS.getProductName(row as any);
  const docType = ROW_READERS.getDocType(row as any);
  const catDaily = ROW_READERS.getCatDaily(row as any);

  const categoryMatch =
    cats.length === 0 || cats.includes(cat) || (catDaily && cats.includes(catDaily));
  const subCategoryMatch = subs.length === 0 || subs.includes(sub);
  const modelMatch = mods.length === 0 || mods.includes(mod);
  const brandMatch = brnds.length === 0 || brnds.includes(brand);
  const customerMatch = custCodes.length === 0 || custCodes.includes(customerCode);
  const productMatch = prodNames.length === 0 || prodNames.includes(prod);
  const docTypeMatch = docTypes.length === 0 || docTypes.includes(docType);

  return (
    categoryMatch &&
    subCategoryMatch &&
    modelMatch &&
    brandMatch &&
    customerMatch &&
    productMatch &&
    docTypeMatch
  );
}

/**
 * Count total quantity of items matching the filter, for a single bill.
 * Returns 1 for non-SIM rows and `quantity` for SIM rows (legacy parity).
 */
function countItemQuantityForBill(bill: BillSummary, filter: ItemFilter): number {
  const inventoryItems = bill.lineItems.filter((li) => ROW_READERS.isInventoryItem(li));
  return inventoryItems.reduce((sum, li) => {
    if (!rowMatchesFilter(li as any, filter, bill.customerCode)) return sum;
    return sum + 1; // non-SIM = 1 unit per row (parity with source)
  }, 0);
}

function countSIMQuantityForBill(bill: BillSummary, filter: ItemFilter): number {
  return bill.lineItems.reduce((sum, li) => {
    const cat = ROW_READERS.getCategoryName(li as any).toLowerCase();
    if (!cat.includes("sim")) return sum;
    if (!rowMatchesFilter(li as any, filter, bill.customerCode)) return sum;
    return sum + ROW_READERS.getQuantity(li);
  }, 0);
}

/**
 * Count total quantity matching ANY of the given filters (OR logic), for a single bill.
 * Uses unique item key to avoid double counting.
 */
export function countItemQuantityAnyFilter(bill: BillSummary, filters: ItemFilter[]): number {
  if (filters.length === 0) return 0;
  const matchedItems = new Map<string, number>();

  filters.forEach((filter) => {
    const items = filter?.includeNonInventory
      ? bill.lineItems
      : bill.lineItems.filter((li) => ROW_READERS.isInventoryItem(li));

    items.forEach((li) => {
      if (!rowMatchesFilter(li as any, filter, bill.customerCode)) return;
      const code = ROW_READERS.getProductCode(li as any);
      const serial = ROW_READERS.getSerial(li as any);
      const name = ROW_READERS.getProductName(li as any);
      const itemKey = `${code}-${serial || "no-serial"}-${name}`;
      if (!matchedItems.has(itemKey)) {
        // Match source repo: use li.quantity for ALL items, not just SIM
        // (handles line items with Number > 1, e.g. iPhone 2 units in 1 row)
        matchedItems.set(itemKey, ROW_READERS.getQuantity(li));
      }
    });
  });

  return Array.from(matchedItems.values()).reduce((sum, qty) => sum + qty, 0);
}

/**
 * Sum total revenue (totalPrice) of items matching ANY of the given filters (OR logic).
 */
export function sumItemRevenueAnyFilter(bill: BillSummary, filters: ItemFilter[]): number {
  if (filters.length === 0) return 0;
  const matchedItems = new Map<string, number>();

  filters.forEach((filter) => {
    const items = filter?.includeNonInventory
      ? bill.lineItems
      : bill.lineItems.filter((li) => ROW_READERS.isInventoryItem(li));

    items.forEach((li) => {
      if (!rowMatchesFilter(li as any, filter, bill.customerCode)) return;
      const code = ROW_READERS.getProductCode(li as any);
      const serial = ROW_READERS.getSerial(li as any);
      const name = ROW_READERS.getProductName(li as any);
      const itemKey = `${code}-${serial || "no-serial"}-${name}`;
      if (!matchedItems.has(itemKey)) {
        matchedItems.set(itemKey, ROW_READERS.getTotalPrice(li));
      }
    });
  });

  return Array.from(matchedItems.values()).reduce((sum, rev) => sum + rev, 0);
}

/**
 * Calculate attach rate for a single preset.
 */
export function calcPreset(bills: BillSummary[], preset: Preset): PresetResult {
  const calcType = preset.calcType || "attach";

  if (calcType === "catBaht" || calcType === "catQty" || calcType === "catAttach") {
    const catA = preset.catDailyFilter ?? "";
    const catB = preset.catDailyFilterB ?? "";
    let catBaht = 0;
    let catQty = 0;
    let catBahtB = 0;
    let catQtyB = 0;

    bills.forEach((bill) => {
      bill.lineItems.forEach((li) => {
        const cat = ROW_READERS.getCategoryName(li as any);
        const catDaily = ROW_READERS.getCatDaily(li as any);
        const matchA = !catA || catDaily === catA || (!catDaily && cat === catA);
        const matchB = !catB || catDaily === catB || (!catDaily && cat === catB);

        if (matchA) {
          catBaht += ROW_READERS.getTotalPrice(li);
          catQty += ROW_READERS.getQuantity(li) || 1;
        }
        if (calcType === "catAttach" && matchB) {
          catBahtB += ROW_READERS.getTotalPrice(li);
          catQtyB += ROW_READERS.getQuantity(li) || 1;
        }
      });
    });

    const attachRate = catQtyB > 0 ? (catQty / catQtyB) * 100 : 0;
    return {
      presetId: preset.id,
      presetName: preset.name,
      calcType,
      color: preset.color,
      billsWithB: catQtyB,
      billsWithAandB: catQty,
      attachRate,
      totalBaht: catBaht,
      totalBahtB: catBahtB,
      bahtRate: 0,
    };
  }

  const filtersA = preset.filtersA ?? (preset.filterA ? [preset.filterA] : []);
  const filtersB = preset.filtersB ?? (preset.filterB ? [preset.filterB] : []);

  let quantityA = 0;
  let quantityB = 0;
  let totalBaht = 0;
  let totalBahtB = 0;

  bills.forEach((bill) => {
    quantityA += countItemQuantityAnyFilter(bill, filtersA);
    quantityB += countItemQuantityAnyFilter(bill, filtersB);
    totalBaht += sumItemRevenueAnyFilter(bill, filtersA);
    totalBahtB += sumItemRevenueAnyFilter(bill, filtersB);
  });

  const attachRate = quantityB > 0 ? (quantityA / quantityB) * 100 : 0;
  const bahtRate = totalBahtB > 0 ? (totalBaht / totalBahtB) * 100 : 0;

  return {
    presetId: preset.id,
    presetName: preset.name,
    calcType,
    color: preset.color,
    billsWithB: quantityB,
    billsWithAandB: quantityA,
    attachRate,
    totalBaht,
    totalBahtB,
    bahtRate,
  };
}

export function calcAllPresets(bills: BillSummary[], presets: Preset[]): PresetResult[] {
  return presets.map((preset) => calcPreset(bills, preset));
}

export function presetDisplayValue(result: PresetResult): number {
  switch (result.calcType) {
    case "bahtRate":
      return result.bahtRate;
    case "baht":
    case "catBaht":
      return result.totalBaht;
    case "unit":
    case "catQty":
      return result.billsWithAandB;
    case "catAttach":
      return result.attachRate;
    default:
      return result.attachRate;
  }
}

export function formatPresetValue(result: PresetResult): string {
  switch (result.calcType) {
    case "bahtRate":
    case "catAttach":
      return `${result.attachRate.toFixed(1)}%`;
    case "baht":
    case "catBaht":
      return `฿${Math.round(result.totalBaht).toLocaleString("th-TH")}`;
    case "unit":
    case "catQty":
      return result.billsWithAandB.toLocaleString("th-TH");
    default:
      return `${result.attachRate.toFixed(1)}%`;
  }
}
