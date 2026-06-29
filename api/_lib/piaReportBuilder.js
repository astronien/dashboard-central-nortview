/**
 * PIA Report Builder
 *
 * Builds PIA report data for LINE Bot:
 *   - getPiaListForBranch: list of all PIA officers in a branch (sorted by name)
 *   - buildPiaReport: full report (target + current + computed KPI/Wonder/Category)
 *
 * Used by:
 *   - api/telegram.js (report generation)
 */

import { getTursoClient } from "./tursoClient.js";

/**
 * Get list of PIA officers in a branch, sorted by Thai name.
 * @param {string} branchId - Branch ID (e.g. "645")
 * @returns {Promise<Array<{name: string, surname: string, staffId: string, branch: string}>>}
 */
/**
 * Normalize branchId to match `BRANCH NAME` in target data.
 * The allowlist stores branchId as "645" but the target row stores
 * "ID645 : Studio 7-Central-Westgate". We check both formats.
 */
function branchMatches(branchName, branchId) {
  const bn = String(branchName ?? "").trim();
  const bi = String(branchId ?? "").trim();
  if (!bi) return false;
  if (bn === bi) return true;
  // "645" matches "ID645 : Studio 7-Central-Westgate"
  if (bn.toLowerCase().startsWith(`id${bi.toLowerCase()}`)) return true;
  // "645" matches "ID 645 ..."
  if (bn.replace(/\s+/g, "").toLowerCase().startsWith(`id${bi}`)) return true;
  return false;
}

export async function getPiaListForBranch(branchId) {
  if (!branchId) return [];
  const client = getTursoClient();

  const res = await client.execute({
    sql: "SELECT data FROM upload_chunks WHERE kind = 'target' ORDER BY chunk_index",
  });

  const piaMap = new Map();

  for (const row of res.rows) {
    const data = JSON.parse(String(row.data));
    for (const t of data) {
      if (!branchMatches(t["BRANCH NAME"], branchId)) continue;
      if (String(t["POSISION"] ?? "").toUpperCase() !== "PIA") continue;

      const staffId = String(t["STAFF ID"] ?? "").trim();
      if (!staffId || piaMap.has(staffId)) continue;

      const name = String(t["NAME"] ?? "").trim();
      const surname = String(t["SURNAME"] ?? "").trim();
      piaMap.set(staffId, {
        name: `${name} ${surname}`.trim() || name || staffId,
        surname,
        staffId,
        branch: branchId,
      });
    }
  }

  return Array.from(piaMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "th"),
  );
}

/**
 * Build full PIA report (target + current sales + computed metrics).
 * @param {string} staffId
 * @param {string} branchId
 * @returns {Promise<object|null>}
 */
export async function buildPiaReport(staffId, branchId) {
  if (!staffId || !branchId) return null;
  const client = getTursoClient();

  // 1. Find target row for this PIA
  const targetRes = await client.execute({
    sql: "SELECT data FROM upload_chunks WHERE kind = 'target' ORDER BY chunk_index",
  });

  let piaTarget = null;
  outer: for (const row of targetRes.rows) {
    const data = JSON.parse(String(row.data));
    for (const t of data) {
      if (
        String(t["STAFF ID"] ?? "").trim() === staffId &&
        branchMatches(t["BRANCH NAME"], branchId) &&
        String(t["POSISION"] ?? "").toUpperCase() === "PIA"
      ) {
        piaTarget = t;
        break outer;
      }
    }
  }

  if (!piaTarget) return null;

  const piaName = `${String(piaTarget["NAME"] ?? "").trim()} ${String(piaTarget["SURNAME"] ?? "").trim()}`.trim();
  const branchName = String(piaTarget["BRANCH NAME"] ?? "").trim();

  // 2. Find current sales rows for this PIA
  const currentRes = await client.execute({
    sql: "SELECT data FROM upload_chunks WHERE kind = 'current' ORDER BY chunk_index",
  });

  // Normalize staffId for comparison (current rows may have "23,510" while target has "23510")
  const staffIdNormalized = staffId.replace(/,/g, "");
  const piaCurrent = [];
  for (const row of currentRes.rows) {
    const data = JSON.parse(String(row.data));
    for (const c of data) {
      const officerId = String(c["Officer (ID)"] ?? "").trim().replace(/,/g, "");
      const officerName = String(c["Officer (Name)"] ?? "").trim();
      if (officerId === staffIdNormalized || officerName === piaName) {
        piaCurrent.push(c);
      }
    }
  }

  // 3. Compute metrics
  return {
    name: piaName,
    staffId,
    branch: branchId,
    branchName,
    kpi: computeKpi(piaTarget, piaCurrent),
    wonder: computeWonder(piaTarget, piaCurrent),
  };
}

function parseNum(v) {
  if (v === undefined || v === null) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sumByCategory(rows, catPredicate) {
  let total = 0;
  for (const r of rows) {
    const cat = String(r["Category (Name)"] ?? "");
    const sub = String(r["Sub Category"] ?? "");
    if (catPredicate(cat, sub)) {
      total += parseNum(r["ราคาขายตามบิล"] ?? r["Total Price"] ?? r["ราคาจำหน่าย"]);
    }
  }
  return total;
}

function computeKpi(target, current) {
  const t = {
    mac: parseNum(target.Mac),
    ipad: parseNum(target.iPad),
    iphone: parseNum(target.iPhone),
    appleWatch: parseNum(target["Apple Watch"]),
    btb: parseNum(target.BTB),
    btbApple: parseNum(target["BTB(Apple)"] ?? target["BTB (Apple)"] ?? target.BTB_Apple),
  };

  const a = {
    mac: sumByCategory(current, (c) => /mac/i.test(c)),
    ipad: sumByCategory(current, (c) => /ipad/i.test(c)),
    iphone: sumByCategory(current, (c) => /iphone/i.test(c)),
    appleWatch: sumByCategory(current, (c) => /apple\s*watch/i.test(c) || /^\s*watch/i.test(c)),
    btb: sumByCategory(current, (c) => /\bbtb\b/i.test(c) && !/apple/i.test(c)),
    btbApple: sumByCategory(current, (c) => /btb[\s(]apple/i.test(c) || /btb\s*apple/i.test(c)),
  };

  const pct = (k) => (t[k] ? (a[k] / t[k]) * 100 : 0);

  return {
    target: t,
    actual: a,
    percent: {
      mac: pct("mac"),
      ipad: pct("ipad"),
      iphone: pct("iphone"),
      appleWatch: pct("appleWatch"),
      btb: pct("btb"),
      btbApple: pct("btbApple"),
    },
  };
}

function computeWonder(target, current) {
  // Each 7 Wonder: compute attach rate as % of devices that have it attached
  // Simplified: use sum by category / total devices sold
  const totalDevices = sumByCategory(current, () => true);
  const safe = (n) => (totalDevices > 0 ? (n / totalDevices) * 100 : 0);

  return {
    coverplus: { percent: safe(sumByCategory(current, (c, s) => /attach/i.test(c) && /cover/i.test(s))) },
    filmDevice: { percent: safe(sumByCategory(current, (c, s) => /attach/i.test(c) && /film/i.test(s))) },
    sim: { percent: safe(sumByCategory(current, (c) => /sim/i.test(c))) },
    pencil: { percent: safe(sumByCategory(current, (c, s) => /att\s*pencil/i.test(c) || /pencil/i.test(s))) },
    ufund: { percent: safe(sumByCategory(current, (c, s) => /ufund/i.test(c) || /ufund/i.test(s))) },
    caseAtt: { percent: safe(sumByCategory(current, (c, s) => /case/i.test(c) && /att/i.test(s))) },
  };
}
