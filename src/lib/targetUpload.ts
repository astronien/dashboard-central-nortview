import * as XLSX from "xlsx";
import type { RawRow } from "./dashboardUtils";

/**
 * Parse an Excel/CSV target export into a normalized RawRow[].
 *
 * The target file (e.g. TGMay26.xlsx) has one row per officer with
 * columns like BRANCH NAME, STAFF ID, NAME, SURNAME, DAY, POSISION, Total,
 * Mac, iPad, iPhone, Apple Watch, SIM, BTB, Smartphone.
 *
 * Output row shape matches what dataTargets table expects: BRANCH NAME,
 * STAFF ID, NAME, SURNAME, DAY, POSISION, Total, Mac, iPad, etc.
 */

const ALIASES = {
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
  smartphone: ["Smartphone", "smartphone", "SMARTPHONE", "Smartphone "],
} as const;

const pickField = (row: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return "";
};

const workbookToRows = (workbook: XLSX.WorkBook): RawRow[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rawRows.map((raw) => {
    const norm: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      norm[k.trim()] = v;
    }

    return {
      "BRANCH NAME": pickField(norm, ALIASES.branch),
      "RSM": pickField(norm, ALIASES.rsm),
      "ASM": pickField(norm, ALIASES.asm),
      "STAFF ID": pickField(norm, ALIASES.staffId),
      "NAME": pickField(norm, ALIASES.name),
      "SURNAME": pickField(norm, ALIASES.surname),
      "DAY": pickField(norm, ALIASES.day),
      "POSISION": pickField(norm, ALIASES.position),
      "Total": pickField(norm, ALIASES.total),
      "Mac": pickField(norm, ALIASES.mac),
      "iPad": pickField(norm, ALIASES.iPad),
      "iPhone": pickField(norm, ALIASES.iPhone),
      "Apple Watch": pickField(norm, ALIASES.appleWatch),
      "SIM": pickField(norm, ALIASES.sim),
      "BTB": pickField(norm, ALIASES.btb),
      "Smartphone": pickField(norm, ALIASES.smartphone),
    };
  });
};

export const parseTargetExcelFile = async (file: File): Promise<RawRow[]> => {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  const workbook =
    lower.endsWith(".csv") || lower.endsWith(".txt")
      ? XLSX.read(new TextDecoder().decode(buffer), { type: "string" })
      : XLSX.read(buffer, { type: "array" });
  return workbookToRows(workbook);
};

/**
 * For testing only — exposes the row-normalization step.
 */
export const _internalNormalize = workbookToRows;
