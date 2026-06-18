import { useMemo } from "react";
import type { ItemFilter } from "../../lib/presetTypes";
import type { RawRow } from "../../lib/salesAggregations";

interface CategoryPickerProps {
  allLines: RawRow[];
  value: ItemFilter;
  onChange: (filter: ItemFilter) => void;
  label?: string;
}

const readStr = (row: RawRow, ...keys: string[]): string => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
};

export default function CategoryPicker({
  allLines,
  value,
  onChange,
  label,
}: CategoryPickerProps) {
  const allCategories = useMemo(() => {
    return Array.from(
      new Set(allLines.map((li) => readStr(li, "Category (Name)", "category_name", "Category"))),
    )
      .filter(Boolean)
      .sort();
  }, [allLines]);

  const allSubCategories = useMemo(() => {
    const filtered =
      !value || !value.categories || value.categories.length === 0
        ? allLines
        : allLines.filter((li) =>
            value.categories.includes(
              readStr(li, "Category (Name)", "category_name", "Category"),
            ),
          );
    return Array.from(new Set(filtered.map((li) => readStr(li, "Sub Category", "sub_category"))))
      .filter(Boolean)
      .sort();
  }, [allLines, value]);

  const allModels = useMemo(() => {
    let filtered = allLines;
    if (value && value.categories && value.categories.length > 0) {
      filtered = filtered.filter((li) =>
        value.categories.includes(readStr(li, "Category (Name)", "category_name")),
      );
    }
    if (value && value.subCategories && value.subCategories.length > 0) {
      filtered = filtered.filter((li) =>
        value.subCategories.includes(readStr(li, "Sub Category", "sub_category")),
      );
    }
    return Array.from(new Set(filtered.map((li) => readStr(li, "Model", "model"))))
      .filter(Boolean)
      .sort();
  }, [allLines, value]);

  const allBrands = useMemo(() => {
    let filtered = allLines;
    if (value?.categories && value.categories.length > 0) {
      filtered = filtered.filter((li) =>
        value.categories.includes(readStr(li, "Category (Name)", "category_name")),
      );
    }
    if (value?.subCategories && value.subCategories.length > 0) {
      filtered = filtered.filter((li) =>
        value.subCategories.includes(readStr(li, "Sub Category", "sub_category")),
      );
    }
    if (value?.models && value.models.length > 0) {
      filtered = filtered.filter((li) => value.models.includes(readStr(li, "Model", "model")));
    }
    return Array.from(new Set(filtered.map((li) => readStr(li, "Brand", "brand"))))
      .filter(Boolean)
      .sort();
  }, [allLines, value]);

  const allCustomerCodes = useMemo(() => {
    const codes = new Set<string>();
    allLines.forEach((li) => {
      const code = readStr(li, "Customer (Code)", "customer_code", "CustomerCode");
      if (code) codes.add(code);
    });
    return Array.from(codes).sort();
  }, [allLines]);

  const allProductNames = useMemo(() => {
    let filtered = allLines;
    if (value?.categories && value.categories.length > 0) {
      filtered = filtered.filter((li) =>
        value.categories.includes(readStr(li, "Category (Name)", "category_name")),
      );
    }
    if (value?.subCategories && value.subCategories.length > 0) {
      filtered = filtered.filter((li) =>
        value.subCategories.includes(readStr(li, "Sub Category", "sub_category")),
      );
    }
    if (value?.models && value.models.length > 0) {
      filtered = filtered.filter((li) => value.models.includes(readStr(li, "Model", "model")));
    }
    if (value?.brands && value.brands.length > 0) {
      filtered = filtered.filter((li) => value.brands.includes(readStr(li, "Brand", "brand")));
    }
    if (value?.customerCodes && value.customerCodes.length > 0) {
      filtered = filtered.filter((li) =>
        value.customerCodes.includes(readStr(li, "Customer (Code)", "customer_code")),
      );
    }
    return Array.from(new Set(filtered.map((li) => readStr(li, "Product (Name)", "product_name"))))
      .filter(Boolean)
      .sort();
  }, [allLines, value]);

  const allDocTypes = useMemo(() => {
    const types = new Set<string>();
    allLines.forEach((li) => {
      const t = readStr(li, "Doc Type", "doc_type");
      if (t) types.add(t);
    });
    return Array.from(types).sort();
  }, [allLines]);

  const handleCategoryToggle = (cat: string, checked: boolean) => {
    const current = value?.categories || [];
    let next: string[];
    if (cat === "ทั้งหมด") {
      next = checked ? [] : allCategories;
    } else {
      next = checked ? [...current, cat] : current.filter((c) => c !== cat);
      if (next.length === allCategories.length) next = [];
    }
    onChange({
      categories: next,
      subCategories: [],
      models: [],
      brands: [],
      customerCodes: value?.customerCodes || [],
      productNames: [],
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleSubCategoryToggle = (sub: string, checked: boolean) => {
    const current = value?.subCategories || [];
    let next: string[];
    if (sub === "ทั้งหมด") {
      next = checked ? [] : allSubCategories;
    } else {
      next = checked ? [...current, sub] : current.filter((s) => s !== sub);
      if (next.length === allSubCategories.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: next,
      models: [],
      brands: [],
      customerCodes: value?.customerCodes || [],
      productNames: [],
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleModelToggle = (mod: string, checked: boolean) => {
    const current = value?.models || [];
    let next: string[];
    if (mod === "ทั้งหมด") {
      next = checked ? [] : allModels;
    } else {
      next = checked ? [...current, mod] : current.filter((m) => m !== mod);
      if (next.length === allModels.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: next,
      brands: value?.brands || [],
      customerCodes: value?.customerCodes || [],
      productNames: value?.productNames || [],
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleBrandToggle = (brand: string, checked: boolean) => {
    const current = value?.brands || [];
    let next: string[];
    if (brand === "ทั้งหมด") {
      next = checked ? [] : allBrands;
    } else {
      next = checked ? [...current, brand] : current.filter((b) => b !== brand);
      if (next.length === allBrands.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: value?.models || [],
      brands: next,
      customerCodes: value?.customerCodes || [],
      productNames: value?.productNames || [],
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleCustomerCodeToggle = (code: string, checked: boolean) => {
    const current = value?.customerCodes || [];
    let next: string[];
    if (code === "ทั้งหมด") {
      next = checked ? [] : allCustomerCodes;
    } else {
      next = checked ? [...current, code] : current.filter((c) => c !== code);
      if (next.length === allCustomerCodes.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: value?.models || [],
      brands: value?.brands || [],
      customerCodes: next,
      productNames: value?.productNames || [],
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleProductNameToggle = (name: string, checked: boolean) => {
    const current = value?.productNames || [];
    let next: string[];
    if (name === "ทั้งหมด") {
      next = checked ? [] : allProductNames;
    } else {
      next = checked ? [...current, name] : current.filter((n) => n !== name);
      if (next.length === allProductNames.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: value?.models || [],
      brands: value?.brands || [],
      customerCodes: value?.customerCodes || [],
      productNames: next,
      docTypes: value?.docTypes || [],
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const handleDocTypeToggle = (docType: string, checked: boolean) => {
    const current = value?.docTypes || [];
    let next: string[];
    if (docType === "ทั้งหมด") {
      next = checked ? [] : allDocTypes;
    } else {
      next = checked ? [...current, docType] : current.filter((d) => d !== docType);
      if (next.length === allDocTypes.length) next = [];
    }
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: value?.models || [],
      brands: value?.brands || [],
      customerCodes: value?.customerCodes || [],
      productNames: value?.productNames || [],
      docTypes: next,
      includeNonInventory: value?.includeNonInventory,
    });
  };

  const getSummary = (selected: string[], all: string[]) => {
    if (selected.length === 0) return "ทั้งหมด";
    if (selected.length === all.length) return "ทั้งหมด";
    return selected.join(", ");
  };

  const handleIncludeNonInventoryToggle = (checked: boolean) => {
    onChange({
      categories: value?.categories || [],
      subCategories: value?.subCategories || [],
      models: value?.models || [],
      brands: value?.brands || [],
      customerCodes: value?.customerCodes || [],
      productNames: value?.productNames || [],
      docTypes: value?.docTypes || [],
      includeNonInventory: checked,
    });
  };

  const checkboxClass =
    "rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0";

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-white/80 block">{label}</label>
      )}

      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value?.includeNonInventory ?? false}
          onChange={(e) => handleIncludeNonInventoryToggle(e.target.checked)}
          className={checkboxClass}
        />
        <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
          รวม Non-Inventory Item (เช่น ซิม/Promo Operator)
        </span>
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Categories */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Category</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.categories || value.categories.length === 0}
                onChange={(e) => handleCategoryToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allCategories.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.categories.includes(cat) || false}
                  onChange={(e) => handleCategoryToggle(cat, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80">{cat}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.categories || [], allCategories)}
          </p>
        </div>

        {/* Sub Categories */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Sub Category</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.subCategories || value.subCategories.length === 0}
                onChange={(e) => handleSubCategoryToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allSubCategories.map((sub) => (
              <label
                key={sub}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.subCategories.includes(sub) || false}
                  onChange={(e) => handleSubCategoryToggle(sub, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80">{sub}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.subCategories || [], allSubCategories)}
          </p>
        </div>

        {/* Models */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Model</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.models || value.models.length === 0}
                onChange={(e) => handleModelToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allModels.map((mod) => (
              <label
                key={mod}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.models.includes(mod) || false}
                  onChange={(e) => handleModelToggle(mod, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80">{mod}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.models || [], allModels)}
          </p>
        </div>

        {/* Brands */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Brand</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.brands || value.brands.length === 0}
                onChange={(e) => handleBrandToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allBrands.map((brand) => (
              <label
                key={brand}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.brands?.includes(brand) || false}
                  onChange={(e) => handleBrandToggle(brand, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80">{brand}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.brands || [], allBrands)}
          </p>
        </div>

        {/* Customer Codes */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Customer Code</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.customerCodes || value.customerCodes.length === 0}
                onChange={(e) => handleCustomerCodeToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allCustomerCodes.map((code) => (
              <label
                key={code}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.customerCodes?.includes(code) || false}
                  onChange={(e) => handleCustomerCodeToggle(code, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80">{code}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.customerCodes || [], allCustomerCodes)}
          </p>
        </div>

        {/* Product Names */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Product Name</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.productNames || value.productNames.length === 0}
                onChange={(e) => handleProductNameToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allProductNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.productNames?.includes(name) || false}
                  onChange={(e) => handleProductNameToggle(name, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80 text-left">{name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.productNames || [], allProductNames)}
          </p>
        </div>

        {/* Document Types */}
        <div>
          <label className="text-xs text-emerald-400 font-bold block mb-1">Doc Type (หัวบิล)</label>
          <div className="border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto bg-white/5">
            <label className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={!value || !value.docTypes || value.docTypes.length === 0}
                onChange={(e) => handleDocTypeToggle("ทั้งหมด", e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm font-medium text-white">ทั้งหมด</span>
            </label>
            {allDocTypes.map((docType) => (
              <label
                key={docType}
                className="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value?.docTypes?.includes(docType) || false}
                  onChange={(e) => handleDocTypeToggle(docType, e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-sm text-white/80 text-left">{docType}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-400 mt-1 truncate">
            {getSummary(value?.docTypes || [], allDocTypes)}
          </p>
        </div>
      </div>
    </div>
  );
}
