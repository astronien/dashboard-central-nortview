/**
 * Robust date parser for Thai sales data.
 *
 * The dashboard reads Excel files where dates come in many shapes:
 *   - ISO:        "2026-06-26"
 *   - dd/mm/yyyy: "26/06/2026"  (Thai convention)
 *   - mm/dd/yyyy: "06/26/2026"  (US, occasionally)
 *   - Thai month: "26 มิ.ย. 2026" / "26 มิ.ย. 2569" (Buddhist year)
 *   - With prefix: "พ.ค. 26/06/2026" / "26 มิ.ย. 2569"
 *
 * V8's built-in `Date.parse` is locale-dependent and unreliable here:
 *   - "26/06/2026" → Invalid Date (month 26)
 *   - "06/12/2569" → June 12, 2569 (US m/d/y, NOT Thai d/m/y)
 *   - "2026-06-26" → Jun 26, 2026 ✓
 *
 * Use `parseThaiDate()` everywhere instead of `Date.parse` for
 * user-provided Excel dates.
 */

const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 0, "มกราคม": 0, "jan": 0, "january": 0,
  "ก.พ.": 1, "กุมภาพันธ์": 1, "feb": 1, "february": 1,
  "มี.ค.": 2, "มีนาคม": 2, "mar": 2, "march": 2,
  "เม.ย.": 3, "เมษายน": 3, "apr": 3, "april": 3,
  "พ.ค.": 4, "พฤษภาคม": 4, "may": 4,
  "มิ.ย.": 5, "มิถุนายน": 5, "jun": 5, "june": 5,
  "ก.ค.": 6, "กรกฎาคม": 6, "jul": 6, "july": 6,
  "ส.ค.": 7, "สิงหาคม": 7, "aug": 7, "august": 7,
  "ก.ย.": 8, "กันยายน": 8, "sep": 8, "september": 8,
  "ต.ค.": 9, "ตุลาคม": 9, "oct": 9, "october": 9,
  "พ.ย.": 10, "พฤศจิกายน": 10, "nov": 10, "november": 10,
  "ธ.ค.": 11, "ธันวาคม": 11, "dec": 11, "december": 11,
};

/**
 * Convert Buddhist Era year (Thai "พ.ศ.") to Gregorian.
 * Thai BE 2569 = Gregorian 2026.
 */
const toGregorianYear = (year: number): number => {
  if (year > 2400) return year - 543;
  return year;
};

/**
 * Try multiple date formats in priority order and return a Date or null.
 *
 * Detection order (most specific → most general):
 *  1. ISO 8601 "YYYY-MM-DD" / "YYYY/MM/DD" (unambiguous)
 *  2. Thai text month ("26 มิ.ย. 2026" / "26 มิ.ย. 2569")
 *  3. dd/mm/yyyy (Thai — 2- or 4-digit year)
 *  4. mm/dd/yyyy (US fallback, only if day ≤ 12)
 */
export function parseThaiDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    return Number.isFinite(raw.getTime()) ? raw : null;
  }
  if (typeof raw === "number") {
    // Excel serial number: days since 1899-12-30
    if (raw > 20000 && raw < 80000) {
      const ms = (raw - 25569) * 86400 * 1000;
      const d = new Date(ms);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    return null;
  }
  const str = String(raw).trim();
  if (!str) return null;

  // 1) ISO: YYYY-MM-DD or YYYY/MM/DD
  const iso = str.match(/^(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/);
  if (iso) {
    const y = toGregorianYear(parseInt(iso[1], 10));
    const m = parseInt(iso[2], 10) - 1;
    const d = parseInt(iso[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return new Date(y, m, d);
    }
  }

  // 2) Thai text month: "26 มิ.ย. 2026" / "26 มิ.ย. 2569"
  const thaiText = str.match(/^(\d{1,2})\s+([^\s]+(?:\s+[^\s]+)*?)\s+(\d{2,4})/);
  if (thaiText) {
    const day = parseInt(thaiText[1], 10);
    const monthStr = thaiText[2].trim();
    const year = toGregorianYear(parseInt(thaiText[3], 10));
    const monthIdx = THAI_MONTHS[monthStr.toLowerCase()] ?? THAI_MONTHS[monthStr];
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      return new Date(year, monthIdx, day);
    }
  }

  // 3) dd/mm/yyyy or dd-mm-yyyy (Thai)
  const dmy = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (dmy) {
    const a = parseInt(dmy[1], 10);
    const b = parseInt(dmy[2], 10);
    const year = toGregorianYear(parseInt(dmy[3], 10));
    // If first part > 12 it must be day (dd/mm)
    if (a > 12 && b >= 1 && b <= 12) {
      return new Date(year, b - 1, a);
    }
    // If second part > 12 it must be day (mm/dd)
    if (b > 12 && a >= 1 && a <= 12) {
      return new Date(year, a - 1, b);
    }
    // Ambiguous (both ≤ 12) — default to Thai convention (dd/mm)
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      return new Date(year, b - 1, a);
    }
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return new Date(year, a - 1, b);
    }
  }

  // 4) Last resort: V8's Date.parse (handles "26 Jun 2026" etc.)
  const fallback = Date.parse(str);
  if (Number.isFinite(fallback)) return new Date(fallback);

  return null;
}

/**
 * Strip a leading Thai day-of-week or month prefix like "พ.ค." / "ศ." / "อา.".
 * Matches one or more Thai shortforms separated by periods/spaces, e.g.
 *   "พ.ค. 26/06/2026"   → "26/06/2026"
 *   "อา. 26/06/2026"    → "26/06/2026"
 *   "พฤ. 26/06/2026"    → "26/06/2026"
 * Returns the string with the prefix removed.
 */
export function stripThaiDatePrefix(raw: string): string {
  return String(raw ?? "")
    .replace(/^([ก-๛]+\.\s*)+/, "")
    .replace(/^[ก-๛]+\s+/, "")
    .trim();
}

/**
 * Convenience: parse a "Doc Date" cell from the Excel file.
 * Strips the Thai day-of-week prefix and tries all formats.
 */
export function parseDocDate(raw: unknown): Date | null {
  if (typeof raw === "string") {
    return parseThaiDate(stripThaiDatePrefix(raw));
  }
  return parseThaiDate(raw);
}

/**
 * Format a Date for the "Doc Date" cell in Thai Buddhist year.
 * Example: Date(2026, 5, 26) → "26/06/2569"
 */
export function formatDocDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}
