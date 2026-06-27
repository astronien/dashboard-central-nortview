/**
 * Shared Excel upload processing logic.
 *
 * Used by:
 *   - Web app (POST /api/uploads via fetch)
 *   - LINE Bot (POST /api/line-webhook via internal call)
 *
 * Responsibilities:
 *   1. Parse Excel (.xlsx) into RawRow[]
 *   2. Validate columns, branch, date range
 *   3. Chunk to 1500 rows/chunk
 *   4. Transaction: DELETE existing chunks for (kind) → INSERT new
 *   5. Compute target vs actual (for Flex Message summary)
 *   6. Write upload_audit_log entry
 *
 * Returns: UploadResult { ok, rows, totalAmount, targetTotal, branch,
 *                          error?, topOfficers? }
 */

import { Buffer } from "node:buffer";
import * as XLSX from "xlsx";
import { getTursoClient } from "./tursoClient.js";

// Ensure schema tables exist on first upload (idempotent CREATE IF NOT EXISTS)
let schemaReady = null;
async function ensureSchema() {
  if (!schemaReady) {
    const { initLineBotSchema } = require("./tursoClient.js");
    schemaReady = initLineBotSchema().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export const REQUIRED_COLUMNS = {
  current: ["Doc Date", "Category (Name)", "Officer (Name)", "Branch (Name)", "ราคาขายตามบิล"],
  today: ["Doc Date", "Category (Name)", "Officer (Name)", "Branch (Name)", "ราคาขายตามบิล"],
  lastMonth: ["Doc Date", "Category (Name)", "Officer (Name)", "Branch (Name)", "ราคาขายตามบิล"],
  lastYear: ["Doc Date", "Category (Name)", "Officer (Name)", "Branch (Name)", "ราคาขายตามบิล"],
  target: ["BRANCH NAME", "NAME", "SURNAME", "STAFF ID", "Total"],
  categoryMaster: ["Cat & Sub Cat", "CAT Daily"],
};

export const CHUNK_SIZE = 1500;

// --- Parsing (replicating the source-side normalization) ---

const ALIASES = {
  productCode: ["Product (Code)", "product_code", "Product Code", "productCode"],
  productName: ["Product (Name)", "Product Name", "product_name", "Product Name "],
  number: ["Number", "number", "qty", "quantity"],
  totalPrice: ["Total Price", "totalPrice", "Total_Price", "Total Price "],
  sellingPrice: ["ราคาจำหน่าย", "selling_price", "Selling Price"],
  billAmount: ["ราคาขายตามบิล", "bill_amount", "Bill Amount"],
  category: ["Category (Name)", "category", "category_name", "Cat", "Category (Name) "],
  subCategory: ["Sub Category", "sub_category", "SubCategory", "subcategory", "Sub Category "],
  brand: ["Brand", "brand", "Brands", "Brand Name", "Brand "],
  model: ["Model", "model", "Models", "Model Name", "Model "],
  customerCode: ["Customer (Code)", "Customer Code", "customer_code", "CustomerCode", "Cust Code"],
  customerName: ["Customer (Name)", "Customer Name", "customer_name", "Customer (Name) "],
  branch: ["Branch (Name)", "Branch Name", "branch_name", "BRANCH", "Branch (Name) "],
  branchId: ["Branch (ID)", "Branch ID", "branch_id", "Branch (ID) "],
  officer: ["Officer (Name)", "Officer Name", "officer_name", "Officer", "Officer (Name) "],
  officerId: ["Officer (ID)", "Officer ID", "officer_id", "Officer (ID) "],
  docNo: ["Doc No", "doc_no", "DocNo", "Doc No "],
  docDate: ["Doc Date", "doc_date", "DocDate", "Doc Date "],
  productType: ["Product Type", "product_type", "ProductType", "Product Type "],
  docType: ["Doc Type", "doc_type", "DocType", "Doc Type "],
  serial: ["Serial", "serial", "Serial Number", "SN"],
};

const TARGET_ALIASES = {
  branch: ["BRANCH NAME", "Branch Name", "branch_name", "BRANCH", "BRANCH NAME "],
  rsm: ["RSM", "rsm"],
  asm: ["ASM", "asm"],
  staffId: ["STAFF ID", "Staff ID", "staff_id", "StaffID", "STAFF ID "],
  name: ["NAME", "Name", "name", "FIRST NAME", "NAME "],
  surname: ["SURNAME", "Surname", "surname", "LAST NAME", "SURNAME "],
  day: ["DAY", "Day", "day", "KPI_MAN_DAY", "DAY "],
  position: ["POSISION", "Position", "position", "POSITION", "POSISION "],
  total: ["Total", "total", "Total Target", "TOTAL", "Total "],
  mac: ["Mac", "mac", "MAC", "Mac "],
  iPad: ["iPad", "ipad", "IPAD", "iPad "],
  iPhone: ["iPhone", "iphone", "IPHONE", "iPhone "],
  appleWatch: ["Apple Watch", "apple_watch", "APPLE WATCH", "Apple Watch "],
  sim: ["SIM", "sim", "Sim "],
  btb: ["BTB", "btb"],
  btbApple: [
    "BTB(Apple)", "BTB (Apple)", "BTB Apple", "btb(apple)", "btb (apple)", "btb apple",
    "BTB_Apple", "btb_apple", "BTBAPPLE",
  ],
  smartphone: ["Smartphone", "smartphone", "SMARTPHONE", "Smartphone "],
};

const MASTER_ALIASES = {
  catSub: ["Cat & Sub Cat", "cat & sub cat", "cat_sub_cat", "CatSubCat", "Cate&Subcate"],
  catDaily: ["CAT Daily", "cat daily", "cat_daily", "CATDaily", "Category Kpi"],
};

function pickField(row, keys) {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickFieldOrUndefined(row, keys) {
  const v = pickField(row, keys);
  return v !== "" ? v : undefined;
}

function parseTargetNumber(value) {
  if (value === undefined || value === null) return 0;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseExcelFromBuffer(buf, fileName) {
  const lower = (fileName || "").toLowerCase();
  const workbook =
    lower.endsWith(".csv") || lower.endsWith(".txt")
      ? XLSX.read(buf.toString("utf8"), { type: "string" })
      : XLSX.read(buf, { type: "buffer" });
  return workbookToRows(workbook);
}

function workbookToRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return rawRows.map((raw) => {
    const norm = {};
    for (const [k, v] of Object.entries(raw)) norm[String(k).trim()] = v;
    return norm;
  });
}

function parseSalesRows(rows) {
  return rows.map((raw) => ({
    "Product (Code)": pickField(raw, ALIASES.productCode),
    "Product (Name)": pickField(raw, ALIASES.productName),
    Number: pickField(raw, ALIASES.number),
    "Total Price": pickFieldOrUndefined(raw, ALIASES.totalPrice),
    "ราคาจำหน่าย": pickFieldOrUndefined(raw, ALIASES.sellingPrice),
    "ราคาขายตามบิล": pickFieldOrUndefined(raw, ALIASES.billAmount),
    "Category (Name)": pickField(raw, ALIASES.category),
    "Sub Category": pickField(raw, ALIASES.subCategory),
    "Brand": pickField(raw, ALIASES.brand),
    "Model": pickField(raw, ALIASES.model),
    "Customer Code": pickField(raw, ALIASES.customerCode),
    "Branch (Name)": pickField(raw, ALIASES.branch),
    "Branch (ID)": pickField(raw, ALIASES.branchId),
    "Officer (Name)": pickField(raw, ALIASES.officer),
    "Officer (ID)": pickField(raw, ALIASES.officerId),
    "Doc No": pickField(raw, ALIASES.docNo),
    "Doc Date": pickField(raw, ALIASES.docDate),
    "Product Type": pickField(raw, ALIASES.productType) || "Inventory Item",
    "Doc Type": pickField(raw, ALIASES.docType),
    "Serial": pickField(raw, ALIASES.serial),
  }));
}

function parseTargetRows(rows) {
  return rows.map((raw) => ({
    "BRANCH NAME": pickField(raw, TARGET_ALIASES.branch),
    "RSM": pickField(raw, TARGET_ALIASES.rsm),
    "ASM": pickField(raw, TARGET_ALIASES.asm),
    "STAFF ID": pickField(raw, TARGET_ALIASES.staffId),
    "NAME": pickField(raw, TARGET_ALIASES.name),
    "SURNAME": pickField(raw, TARGET_ALIASES.surname),
    "DAY": pickField(raw, TARGET_ALIASES.day),
    "POSISION": pickField(raw, TARGET_ALIASES.position),
    "Total": parseTargetNumber(raw[TARGET_ALIASES.total] ?? raw.Total),
    "Mac": parseTargetNumber(raw[TARGET_ALIASES.mac] ?? raw.Mac),
    "iPad": parseTargetNumber(raw[TARGET_ALIASES.iPad] ?? raw.iPad),
    "iPhone": parseTargetNumber(raw[TARGET_ALIASES.iPhone] ?? raw.iPhone),
    "Apple Watch": parseTargetNumber(raw[TARGET_ALIASES.appleWatch] ?? raw["Apple Watch"]),
    "SIM": parseTargetNumber(raw[TARGET_ALIASES.sim] ?? raw.SIM),
    "BTB": parseTargetNumber(raw[TARGET_ALIASES.btb] ?? raw.BTB),
    "BTB(Apple)": parseTargetNumber(
      raw["BTB(Apple)"] ?? raw["BTB (Apple)"] ?? raw["BTB Apple"] ?? raw["btb(apple)"] ?? raw["btb (apple)"] ?? raw["btb apple"] ?? raw.BTB_Apple ?? raw.btb_apple,
    ),
    "Smartphone": parseTargetNumber(raw[TARGET_ALIASES.smartphone] ?? raw.Smartphone),
  }));
}

function parseCategoryMasterRows(rows) {
  const seen = new Set();
  const out = [];
  for (const raw of rows) {
    const catSub = pickField(raw, MASTER_ALIASES.catSub);
    const catDaily = pickField(raw, MASTER_ALIASES.catDaily);
    if (!catSub || !catDaily) continue;
    const key = `${catSub.toLowerCase()}||${catDaily.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ "Cat & Sub Cat": catSub, "CAT Daily": catDaily });
  }
  return out;
}

function parseFile(params, buf) {
  const { kind } = params;
  const rawRows = parseExcelFromBuffer(buf, params.fileName);
  if (kind === "categoryMaster") return parseCategoryMasterRows(rawRows);
  if (kind === "target") return parseTargetRows(rawRows);
  return parseSalesRows(rawRows);
}

// --- Validation ---

function validateColumns(rows, kind) {
  if (rows.length === 0) return "ไฟล์ว่างเปล่า กรุณาตรวจสอบ";
  const required = REQUIRED_COLUMNS[kind];
  const first = rows[0];
  const missing = required.filter(
    (c) => !(c in first) && !(c.toLowerCase() in first),
  );
  if (missing.length > 0) {
    return `ไฟล์ขาด columns: ${missing.join(", ")}`;
  }
  return null;
}

function detectDateRangeMonths(rows, kind) {
  if (kind === "target" || kind === "categoryMaster") return null;
  const months = new Set();
  for (const r of rows) {
    const d = String(r["Doc Date"] ?? "").trim();
    if (!d) continue;
    const slash = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    const iso = d.match(/(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/);
    if (iso) months.add(`${iso[1]}-${String(iso[2]).padStart(2, "0")}`);
    else if (slash) {
      let y = parseInt(slash[3], 10);
      if (y > 2400) y -= 543;
      const m = String(slash[2]).padStart(2, "0");
      months.add(`${y}-${m}`);
    }
  }
  if (months.size > 1) {
    return `พบข้อมูลหลายเดือน (${Array.from(months).join(", ")}) กรุณาแยกไฟล์ตามเดือน`;
  }
  return null;
}

function sumActualAmount(rows) {
  let total = 0;
  for (const r of rows) {
    const raw = r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r["ราคาจำหน่าย"] ?? 0;
    const n = Number(String(raw).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

function topOfficers(rows, limit = 3) {
  const map = new Map();
  for (const r of rows) {
    const name = String(r["Officer (Name)"] ?? "").trim();
    if (!name) continue;
    const raw = r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r["ราคาจำหน่าย"] ?? 0;
    const n = Number(String(raw).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) {
      map.set(name, (map.get(name) ?? 0) + n);
    }
  }
  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

// --- Target total lookup ---

async function getTargetTotalForBranch(branchId) {
  try {
    const client = getTursoClient();
    const res = await client.execute({
      sql: "SELECT data FROM upload_chunks WHERE kind = 'target' ORDER BY chunk_index",
    });
    let total = 0;
    for (const row of res.rows) {
      const data = JSON.parse(String(row.data));
      for (const t of data) {
        const tBranch = String(t["emp_shop_code"] ?? t["BRANCH NAME"] ?? "").trim();
        if (tBranch === branchId) {
          total += Number(t["Total"] ?? t["total"] ?? 0) || 0;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

// --- Audit log ---

async function logAudit(params) {
  try {
    const client = getTursoClient();
    const res = await client.execute({
      sql: `INSERT INTO upload_audit_log
        (line_user_id, branch_id, kind, file_name, file_size, row_count, target_total, actual_total, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        params.lineUserId ?? null,
        params.branchId,
        params.kind,
        params.fileName,
        null,
        params.rowCount ?? null,
        params.targetTotal ?? null,
        params.actualTotal ?? null,
        params.status,
        params.errorMessage ?? null,
      ],
    });
    return Number(res.lastInsertRowid);
  } catch (e) {
    console.error("[uploadProcessor] logAudit failed:", e);
    return undefined;
  }
}

// --- Main API ---

export async function processUpload(params) {
  const { fileBase64, kind, branchId, lineUserId, fileName } = params;

  // 1. Decode file
  let buf;
  try {
    buf = Buffer.from(fileBase64, "base64");
  } catch (e) {
    return { ok: false, error: "ไฟล์เสียหาย (base64 decode ล้มเหลว)" };
  }
  if (buf.length > 10 * 1024 * 1024) {
    return {
      ok: false,
      error: `ไฟล์ใหญ่เกินไป (${(buf.length / 1024 / 1024).toFixed(1)}MB) กรุณาแยกไฟล์หรือลดขนาด`,
    };
  }

  // 2. Parse Excel
  let rows;
  try {
    rows = parseFile(params, buf);
  } catch (e) {
    return {
      ok: false,
      error: `ไฟล์ Excel อ่านไม่ได้: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 3. Validate columns
  const colErr = validateColumns(rows, kind);
  if (colErr) {
    await logAudit({ ...params, status: "error", errorMessage: colErr });
    return { ok: false, error: colErr };
  }

  // 4. Validate date range (for sales kinds)
  if (kind !== "target" && kind !== "categoryMaster") {
    const dateErr = detectDateRangeMonths(rows, kind);
    if (dateErr) {
      await logAudit({ ...params, status: "error", errorMessage: dateErr });
      return { ok: false, error: dateErr };
    }
  }

  // 5. Compute target total
  let targetTotal = 0;
  if (kind === "current" || kind === "today" || kind === "lastMonth" || kind === "lastYear") {
    targetTotal = await getTargetTotalForBranch(branchId);
  }

  // 6. Compute actual
  const actualTotal = kind === "categoryMaster" || kind === "target" ? 0 : sumActualAmount(rows);

  // 7. Transaction: DELETE existing + INSERT new chunks (Q-G: replace เสมอ)
  await ensureSchema();
  const client = getTursoClient();
  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(JSON.stringify(rows.slice(i, i + CHUNK_SIZE)));
  }

  try {
    const statements = [
      // DELETE existing chunks for this kind (replace เสมอ)
      ...(kind !== "categoryMaster"
        ? [{ sql: "DELETE FROM upload_chunks WHERE kind = ?", args: [kind] }]
        : []),
      // INSERT new chunks
      ...chunks.map((data, i) => ({
        sql:
          "INSERT INTO upload_chunks (kind, chunk_index, row_count, data, file_name, line_user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        args: [
          kind,
          i,
          Math.min(CHUNK_SIZE, rows.length - i * CHUNK_SIZE),
          data,
          fileName,
          lineUserId ?? null,
        ],
      })),
    ];
    await client.batch(statements, "write");
  } catch (e) {
    const msg = `บันทึกลงฐานข้อมูลไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`;
    await logAudit({ ...params, status: "error", errorMessage: msg });
    return { ok: false, error: msg };
  }

  // 8. Log audit (success)
  const auditId = await logAudit({
    ...params,
    status: "success",
    rowCount: rows.length,
    targetTotal,
    actualTotal,
  });

  return {
    ok: true,
    rows: rows.length,
    branch: branchId,
    targetTotal,
    actualTotal,
    topOfficers: kind === "categoryMaster" || kind === "target" ? [] : topOfficers(rows),
    auditId,
  };
}
