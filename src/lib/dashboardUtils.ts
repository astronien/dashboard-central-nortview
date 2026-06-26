import { parseDocDate } from "./dateParser";

export type RawRow = Record<string, string | number | undefined>;

export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9ก-๙ ]/gi, "")
    .trim();

export const toNumber = (value: unknown) =>
  Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

export const getSalesDate = (row: RawRow) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = parseDocDate(raw);
  return parsed ? parsed.getTime() : 0;
};

export const cleanOfficerName = (name: string) => {
  const aliases: Record<string, string> = { แพวนภา: "แพรวนภา" };
  let cleaned = normalizeText(name).replace(/^(mr|mrs|ms|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/i, "").replace(/\s+/g, "");
  Object.entries(aliases).forEach(([from, to]) => {
    if (cleaned.includes(normalizeText(from))) cleaned = cleaned.replace(normalizeText(from), normalizeText(to));
  });
  return cleaned;
};

export const matchesOfficer = (a: string, b: string) => {
  if (!a || !b) return false;
  const cleanA = cleanOfficerName(a);
  const cleanB = cleanOfficerName(b);
  if (cleanA === cleanB) return true;
  const firstA = cleanOfficerName(a.split(/\s+/)[0] || "");
  const firstB = cleanOfficerName(b.split(/\s+/)[0] || "");
  return Boolean(firstA && firstB && firstA === firstB);
};
