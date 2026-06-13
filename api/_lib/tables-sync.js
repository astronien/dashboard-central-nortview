const SALES_KINDS = ["current", "today", "lastMonth", "lastYear"];

const pick = (row, keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

const usedKeys = (row, keysUsed) => {
  const used = new Set(keysUsed.flat());
  const extra = {};
  for (const [key, value] of Object.entries(row)) {
    if (!used.has(key) && value !== undefined && value !== null && String(value).trim() !== "") {
      extra[key] = value;
    }
  }
  return Object.keys(extra).length ? JSON.stringify(extra) : "";
};

const mergeExtra = (base, extraJson) => {
  if (!extraJson) return base;
  try {
    return { ...JSON.parse(extraJson), ...base };
  } catch {
    return base;
  }
};

const mapSalesRow = (row, period) => {
  const keysUsed = [
    ["Product (Code)"],
    ["Product (Name)"],
    ["Category (Name)", "category"],
    ["Sub Category", "subcategory"],
    ["Brand", "brand", "Brands", "Brand Name"],
    ["Customer Code", "customerCodes", "customer_code", "CustomerCode", "Cust Code", "Customer Code "],
    ["Model", "model", "Models", "Model Name"],
    ["Doc Type", "doc_type", "DocType"],
    ["Product Type", "product_type", "ProductType"],
    ["Branch (Name)", "branch"],
    ["Officer (Name)", "Officer", "officer"],
    ["Doc No"],
    ["Doc Date", "doc date"],
    ["Total Price", "totalPrice"],
    ["ราคาขายตามบิล"],
    ["Number", "number", "qty"],
    ["Customer (Name)"],
  ];

  return {
    period,
    product_code: pick(row, keysUsed[0]),
    product_name: pick(row, keysUsed[1]),
    category_name: pick(row, keysUsed[2]),
    sub_category: pick(row, keysUsed[3]),
    brand: pick(row, keysUsed[4]),
    customer_code: pick(row, keysUsed[5]),
    model: pick(row, keysUsed[6]),
    doc_type: pick(row, keysUsed[7]),
    product_type: pick(row, keysUsed[8]),
    branch_name: pick(row, keysUsed[9]),
    officer_name: pick(row, keysUsed[10]),
    doc_no: pick(row, keysUsed[11]),
    doc_date: pick(row, keysUsed[12]),
    total_price: pick(row, keysUsed[13]),
    bill_amount: pick(row, keysUsed[14]),
    quantity: pick(row, keysUsed[15]),
    customer_name: pick(row, keysUsed[16]),
    extra_json: usedKeys(row, keysUsed),
  };
};

const toSalesRawRow = (cells) => {
  const [
    _period,
    product_code,
    product_name,
    category_name,
    sub_category,
    brand,
    customer_code,
    model,
    doc_type,
    product_type,
    branch_name,
    officer_name,
    doc_no,
    doc_date,
    total_price,
    bill_amount,
    quantity,
    customer_name,
    extra_json,
  ] = cells;

  return mergeExtra(
    {
      "Product (Code)": product_code ?? "",
      "Product (Name)": product_name ?? "",
      "Category (Name)": category_name ?? "",
      "Sub Category": sub_category ?? "",
      "Brand": brand ?? "",
      "Customer Code": customer_code ?? "",
      "Model": model ?? "",
      "Doc Type": doc_type ?? "",
      "Product Type": product_type ?? "Inventory Item",
      "Branch (Name)": branch_name ?? "",
      "Officer (Name)": officer_name ?? "",
      "Doc No": doc_no ?? "",
      "Doc Date": doc_date ?? "",
      "Total Price": total_price ?? "",
      "ราคาขายตามบิล": bill_amount ?? "",
      Number: quantity ?? "",
      "Customer (Name)": customer_name ?? "",
    },
    extra_json,
  );
};

const mapTargetRow = (row) => {
  const keysUsed = [
    ["BRANCH NAME", "branch"],
    ["STAFF ID"],
    ["NAME"],
    ["SURNAME"],
    ["DAY"],
    ["Total"],
    ["iPhone"],
    ["Mac"],
    ["iPad"],
    ["Apple Watch"],
    ["SIM"],
    ["BTB"],
    ["Smartphone"],
  ];

  return {
    branch_name: pick(row, keysUsed[0]),
    staff_id: pick(row, keysUsed[1]),
    first_name: pick(row, keysUsed[2]),
    last_name: pick(row, keysUsed[3]),
    day: pick(row, keysUsed[4]),
    total_target: pick(row, keysUsed[5]),
    iphone: pick(row, keysUsed[6]),
    mac: pick(row, keysUsed[7]),
    ipad: pick(row, keysUsed[8]),
    apple_watch: pick(row, keysUsed[9]),
    sim: pick(row, keysUsed[10]),
    btb: pick(row, keysUsed[11]),
    smartphone: pick(row, keysUsed[12]),
    extra_json: usedKeys(row, keysUsed),
  };
};

const toTargetRawRow = (cells) => {
  const [
    branch_name,
    staff_id,
    first_name,
    last_name,
    day,
    total_target,
    iphone,
    mac,
    ipad,
    apple_watch,
    sim,
    btb,
    smartphone,
    extra_json,
  ] = cells;

  return mergeExtra(
    {
      "BRANCH NAME": branch_name ?? "",
      "STAFF ID": staff_id ?? "",
      NAME: first_name ?? "",
      SURNAME: last_name ?? "",
      DAY: day ?? "",
      Total: total_target ?? "",
      iPhone: iphone ?? "",
      Mac: mac ?? "",
      iPad: ipad ?? "",
      "Apple Watch": apple_watch ?? "",
      SIM: sim ?? "",
      BTB: btb ?? "",
      Smartphone: smartphone ?? "",
    },
    extra_json,
  );
};

const mapCategoryRow = (row) => {
  const keysUsed = [["Cat & Sub Cat", "Category (Name)", "SubCategory"], ["CAT Daily", "Category (Name)"]];
  return {
    cat_sub_cat: pick(row, keysUsed[0]),
    cat_daily: pick(row, keysUsed[1]),
    extra_json: usedKeys(row, keysUsed),
  };
};

const toCategoryRawRow = (cells) => {
  const [cat_sub_cat, cat_daily, extra_json] = cells;
  return mergeExtra(
    {
      "Cat & Sub Cat": cat_sub_cat ?? "",
      "CAT Daily": cat_daily ?? "",
    },
    extra_json,
  );
};

const RELATIONAL_DDL = [
  `CREATE TABLE IF NOT EXISTS upload_meta (
    kind TEXT PRIMARY KEY,
    row_count INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS data_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    product_code TEXT,
    product_name TEXT,
    category_name TEXT,
    sub_category TEXT,
    brand TEXT,
    customer_code TEXT,
    model TEXT,
    doc_type TEXT,
    product_type TEXT,
    branch_name TEXT,
    officer_name TEXT,
    doc_no TEXT,
    doc_date TEXT,
    total_price TEXT,
    bill_amount TEXT,
    quantity TEXT,
    customer_name TEXT,
    extra_json TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_data_sales_period ON data_sales(period)`,
  `CREATE INDEX IF NOT EXISTS idx_data_sales_customer_code ON data_sales(customer_code)`,
  `CREATE INDEX IF NOT EXISTS idx_data_sales_brand ON data_sales(brand)`,
  `CREATE TABLE IF NOT EXISTS data_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_name TEXT,
    staff_id TEXT,
    first_name TEXT,
    last_name TEXT,
    day TEXT,
    total_target TEXT,
    iphone TEXT,
    mac TEXT,
    ipad TEXT,
    apple_watch TEXT,
    sim TEXT,
    btb TEXT,
    smartphone TEXT,
    extra_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS data_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_sub_cat TEXT,
    cat_daily TEXT,
    extra_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS staff_photos (
    staff_id TEXT PRIMARY KEY,
    officer_key TEXT,
    display_name TEXT,
    branch_name TEXT,
    photo_url TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_photos_officer_key ON staff_photos(officer_key)`,
  `CREATE TABLE IF NOT EXISTS wonder_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_percent REAL NOT NULL DEFAULT 0.0,
    base_categories TEXT,
    divisor_categories TEXT,
    divisor_column TEXT,
    divisor_value TEXT
  )`,
];

const SALES_COLUMNS = [
  "period",
  "product_code",
  "product_name",
  "category_name",
  "sub_category",
  "brand",
  "customer_code",
  "model",
  "doc_type",
  "product_type",
  "branch_name",
  "officer_name",
  "doc_no",
  "doc_date",
  "total_price",
  "bill_amount",
  "quantity",
  "customer_name",
  "extra_json",
];

const TARGET_COLUMNS = [
  "branch_name",
  "staff_id",
  "first_name",
  "last_name",
  "day",
  "total_target",
  "iphone",
  "mac",
  "ipad",
  "apple_watch",
  "sim",
  "btb",
  "smartphone",
  "extra_json",
];

const CATEGORY_COLUMNS = ["cat_sub_cat", "cat_daily", "extra_json"];

// In-process cache for table column introspection.
// Cleared whenever ensureRelationalSchema runs an ALTER.
const columnCache = new Map();

const ensureRelationalSchema = async (tursoExecute) => {
  for (const sql of RELATIONAL_DDL) {
    await tursoExecute(sql);
  }
  try {
    await tursoExecute("ALTER TABLE wonder_configs ADD COLUMN divisor_column TEXT");
  } catch (e) {
    // Ignore if column already exists
  }
  try {
    await tursoExecute("ALTER TABLE wonder_configs ADD COLUMN divisor_value TEXT");
  } catch (e) {
    // Ignore if column already exists
  }
  // Backfill brand / customer_code / model / doc_type / product_type columns
  // for older data_sales tables that predate Wonder filter multi-field support.
  const optionalAlter = [
    "ALTER TABLE data_sales ADD COLUMN brand TEXT",
    "ALTER TABLE data_sales ADD COLUMN customer_code TEXT",
    "ALTER TABLE data_sales ADD COLUMN model TEXT",
    "ALTER TABLE data_sales ADD COLUMN doc_type TEXT",
    "ALTER TABLE data_sales ADD COLUMN product_type TEXT",
  ];
  for (const sql of optionalAlter) {
    try {
      await tursoExecute(sql);
    } catch (e) {
      // Ignore if column already exists
    }
  }
  // Invalidate column cache so subsequent calls re-detect the schema.
  columnCache.clear();
};

/**
 * Return the subset of `desiredColumns` that actually exist on the given
 * `table`. Used so SELECT/INSERT statements stay valid against older
 * databases that predate the multi-field Wonder filter columns.
 */
const intersectWithExistingColumns = async (
  tursoExecute,
  table,
  desiredColumns,
) => {
  const cacheKey = `${table}|${desiredColumns.join(",")}`;
  if (columnCache.has(cacheKey)) return columnCache.get(cacheKey);

  let existing = new Set(desiredColumns);
  try {
    const result = await tursoExecute(`PRAGMA table_info(${table})`);
    const present = new Set(
      (result.rows ?? [])
        .map((row) => rowValues(row)[1])
        .filter(Boolean)
        .map((name) => String(name)),
    );
    existing = new Set(desiredColumns.filter((c) => present.has(c)));
  } catch (e) {
    // If PRAGMA fails (e.g. table missing), keep all desired columns and let
    // the calling query surface the underlying error.
  }
  columnCache.set(cacheKey, existing);
  return existing;
};

const textArg = (value) => ({ type: "text", value: value ?? "" });

const insertBatch = async (tursoExecute, tursoPipeline, getExecuteResult, table, columns, rows, batchSize = 200) => {
  if (!rows.length) return;

  // Restrict INSERT to columns that actually exist on the table so legacy
  // databases without brand/customer_code/model/doc_type still work.
  const presentColumns = await intersectWithExistingColumns(
    tursoExecute,
    table,
    columns,
  );
  if (!presentColumns.size) {
    throw new Error(`Table ${table} has no matching columns for INSERT.`);
  }

  // Split into sub-pipelines of max ~500 rows to avoid Turso HTTP body size limits
  const MAX_ROWS_PER_PIPELINE = 500;
  
  for (let pipeStart = 0; pipeStart < rows.length; pipeStart += MAX_ROWS_PER_PIPELINE) {
    const pipeSlice = rows.slice(pipeStart, pipeStart + MAX_ROWS_PER_PIPELINE);
    const requests = [];
    requests.push({ type: "execute", stmt: { sql: "BEGIN TRANSACTION" } });

    for (let offset = 0; offset < pipeSlice.length; offset += batchSize) {
      const slice = pipeSlice.slice(offset, offset + batchSize);
      const placeholders = `(${presentColumns.map(() => "?").join(", ")})`;
      const sql = `INSERT INTO ${table} (${Array.from(presentColumns).join(", ")}) VALUES ${slice
        .map(() => placeholders)
        .join(", ")}`;

      const args = [];
      for (const row of slice) {
        for (const col of presentColumns) {
          args.push(textArg(row[col]));
        }
      }

      requests.push({ type: "execute", stmt: { sql, args } });
    }

    requests.push({ type: "execute", stmt: { sql: "COMMIT" } });

    const payload = await tursoPipeline(requests);
    for (let i = 0; i < requests.length; i += 1) {
      getExecuteResult(payload, i);
    }
  }
};

const clearRelationalKind = async (kind, tursoExecute) => {
  if (SALES_KINDS.includes(kind)) {
    await tursoExecute("DELETE FROM data_sales WHERE period = ?", [kind]);
    return;
  }
  if (kind === "target") {
    await tursoExecute("DELETE FROM data_targets");
    return;
  }
  if (kind === "categoryMaster") {
    await tursoExecute("DELETE FROM data_categories");
  }
};

const insertMappedRows = async (kind, rows, deps) => {
  const { tursoExecute, tursoPipeline, getExecuteResult } = deps;
  if (!rows.length) return;

  if (SALES_KINDS.includes(kind)) {
    const mapped = rows.map((row) => mapSalesRow(row, kind));
    await insertBatch(tursoExecute, tursoPipeline, getExecuteResult, "data_sales", SALES_COLUMNS, mapped);
    return;
  }

  if (kind === "target") {
    const mapped = rows.map(mapTargetRow);
    await insertBatch(tursoExecute, tursoPipeline, getExecuteResult, "data_targets", TARGET_COLUMNS, mapped);
    return;
  }

  if (kind === "categoryMaster") {
    const mapped = rows.map(mapCategoryRow);
    await insertBatch(tursoExecute, tursoPipeline, getExecuteResult, "data_categories", CATEGORY_COLUMNS, mapped);
  }
};

const saveRowsToTurso = async (kind, rows, deps) => {
  const { tursoExecute } = deps;
  await ensureRelationalSchema(tursoExecute);
  await clearRelationalKind(kind, tursoExecute);
  await insertMappedRows(kind, rows, deps);
};

const appendRowsToTurso = async (kind, rows, deps) => {
  const { tursoExecute } = deps;
  await ensureRelationalSchema(tursoExecute);
  await insertMappedRows(kind, rows, deps);
};

const loadRowsFromTurso = async (kind, tursoExecute, rowValues) => {
  await ensureRelationalSchema(tursoExecute);

  if (SALES_KINDS.includes(kind)) {
    const presentColumns = await intersectWithExistingColumns(
      tursoExecute,
      "data_sales",
      SALES_COLUMNS,
    );
    const cols = presentColumns.size
      ? Array.from(presentColumns).join(", ")
      : "*";
    const result = await tursoExecute(
      `SELECT ${cols} FROM data_sales WHERE period = ? ORDER BY id ASC`,
      [kind],
    );
    return (result.rows ?? []).map((row) => {
      // For legacy DBs missing brand/customer_code/model, fill empty strings
      // so the frontend gets the full schema it expects.
      const cells = rowValues(row);
      const padded = {};
      SALES_COLUMNS.forEach((c, i) => {
        padded[c] = cells[i] ?? "";
      });
      return toSalesRawRow(Object.values(padded));
    });
  }

  if (kind === "target") {
    const result = await tursoExecute(
      `SELECT ${TARGET_COLUMNS.join(", ")} FROM data_targets ORDER BY id ASC`,
    );
    return (result.rows ?? []).map((row) => toTargetRawRow(rowValues(row)));
  }

  if (kind === "categoryMaster") {
    const result = await tursoExecute(
      `SELECT ${CATEGORY_COLUMNS.join(", ")} FROM data_categories ORDER BY id ASC`,
    );
    return (result.rows ?? []).map((row) => toCategoryRawRow(rowValues(row)));
  }

  return [];
};

const countRowsInTurso = async (kind, tursoExecute, rowValues) => {
  if (SALES_KINDS.includes(kind)) {
    const result = await tursoExecute(
      "SELECT COUNT(*) FROM data_sales WHERE period = ?",
      [kind],
    );
    return Number(rowValues(result.rows?.[0] ?? [])[0]) || 0;
  }
  if (kind === "target") {
    const result = await tursoExecute("SELECT COUNT(*) FROM data_targets");
    return Number(rowValues(result.rows?.[0] ?? [])[0]) || 0;
  }
  if (kind === "categoryMaster") {
    const result = await tursoExecute("SELECT COUNT(*) FROM data_categories");
    return Number(rowValues(result.rows?.[0] ?? [])[0]) || 0;
  }
  return 0;
};

module.exports = {
  SALES_KINDS,
  appendRowsToTurso,
  clearRelationalKind,
  countRowsInTurso,
  ensureRelationalSchema,
  loadRowsFromTurso,
  saveRowsToTurso,
};
