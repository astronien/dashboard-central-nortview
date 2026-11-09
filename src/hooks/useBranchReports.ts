/**
 * ตาราง "รายงานยอดขาย + Attach" — คำนวณ 2 ชุด: วันล่าสุด / ทั้งเดือนล่าสุด
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ — ตัวแปรที่เคยอ่านจาก component ส่งเข้ามาทาง param)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import type { UploadKind } from "../lib/uploadsApi";
import type { BillSummary } from "../lib/presetBills";
import type { Preset as KpiPreset, ItemFilter } from "../lib/presetTypes";
import { emptyItemFilter } from "../lib/presetTypes";
import { calcPreset, countItemQuantityAnyFilter, sumItemRevenueAnyFilter } from "../lib/presetEngine";
import { parseDocDate } from "../lib/dateParser";
import { toNumber } from "../lib/targetAggregations";
import { mentionsExcludedIphoneModel } from "../lib/iphoneModels";
import { boostMultiplier, type AttachBoost } from "../lib/attachBoost";
import { latestDayFromKeys } from "../lib/dateHelpers";
import { matchesOfficer } from "../lib/matchHelpers";
import {
  ATTACH_PER_BILL_TARGET,
  RAW_DEVICE_CATS,
  calcPresetIphoneAcc,
  iphoneAccOnlyBills,
  isIphoneAccPreset,
  isUfundPersonalBill,
  lastBillTimeOf,
} from "../lib/attachHelpers";
import type { DailyReportData } from "../components/dashboard/DailyBranchReportSection";

export type BranchReportsInput = {
  displayUploads: Record<UploadKind, RawRow[]>;
  parsedReport: { officers: Array<{ name: string; staffId?: string; position?: string }> };
  kpiPresets: KpiPreset[];
  currentRowsAllModels: RawRow[];
  excludedIphoneModelSet: Set<string>;
  excludingIphoneModels: boolean;
  attachBoost: AttachBoost;
  currentBillsShared: BillSummary[];
  billDayKey: (b: BillSummary) => string;
  /** ช่วงวันของตารางรายเดือน (YYYY-MM-DD) — null = ทั้งเดือนล่าสุด */
  monthRange?: { from: string; to: string } | null;
};

export function useBranchReports(input: BranchReportsInput): { daily: DailyReportData; monthly: DailyReportData } {
  const {
    displayUploads,
    parsedReport,
    kpiPresets,
    currentRowsAllModels,
    excludedIphoneModelSet,
    excludingIphoneModels,
    attachBoost,
    currentBillsShared,
    billDayKey,
    monthRange,
  } = input;
  const rangeFrom = monthRange?.from ?? "";
  const rangeTo = monthRange?.to ?? "";
  return useMemo<{ daily: DailyReportData; monthly: DailyReportData }>(() => {
    const empty0: DailyReportData = { latestDate: "", presets: [], rows: [] };
    const empty = { daily: empty0, monthly: empty0 };
    if (displayUploads.current.length === 0) return empty;

    const dayKey = (row: RawRow) => {
      const p = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
      return p
        ? `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`
        : "";
    };
    // "วันล่าสุด" ยึดจากข้อมูลเต็ม (ก่อนตัด iPhone บางรุ่น) เพื่อให้วันที่ที่แสดง
    // ไม่เปลี่ยนไปมาตอนสลับปุ่มกรอง — กรองมีผลกับ "ตัวเลข" เท่านั้น
    const daySet = new Set<string>();
    (currentRowsAllModels.length ? currentRowsAllModels : displayUploads.current).forEach((r) => {
      const k = dayKey(r);
      if (k) daySet.add(k);
    });
    const latestDay = latestDayFromKeys(daySet);
    if (!latestDay) return empty;
    const latestRows = displayUploads.current.filter((r) => dayKey(r) === latestDay);
    // เดือนล่าสุด = ทุกวันในเดือนเดียวกับวันล่าสุด (ถึงวันล่าสุด)
    const monthPrefix = latestDay.slice(0, 7);
    // เลือกช่วงวันเอง (เช่น รายสัปดาห์) — ถ้าไม่เลือก = ทั้งเดือนล่าสุดเหมือนเดิม
    // ช่วงที่ไม่ทับข้อมูลเลย (เช่น อัปโหลดเดือนใหม่แล้ว) → กลับไปทั้งเดือน
    const firstDay = Array.from(daySet).sort()[0] ?? "";
    const rangeActive = Boolean(
      rangeFrom && rangeTo && rangeFrom <= rangeTo && rangeTo >= firstDay && rangeFrom <= latestDay,
    );
    const monthRows = displayUploads.current.filter((r) => {
      const k = dayKey(r);
      if (rangeActive) return Boolean(k) && k >= rangeFrom && k <= rangeTo;
      return k.startsWith(monthPrefix) && k <= latestDay;
    });
    const allDays = Array.from(daySet).sort();
    const monthDaysInScope = Array.from(new Set(monthRows.map(dayKey).filter(Boolean))).sort();
    const scopeLastDay = monthDaysInScope[monthDaysInScope.length - 1] ?? "";
    const scopeLastRows = rangeActive
      ? monthRows.filter((r) => dayKey(r) === scopeLastDay)
      : latestRows;

    const build = (scopeRows: RawRow[]): DailyReportData => {
    // ใช้บิลชุดกลาง กรองตามวันของแถวในขอบเขต (ไม่ต้อง parse ใหม่)
    const scopeDays = new Set(scopeRows.map(dayKey));
    const allBills = currentBillsShared.filter((b) => scopeDays.has(billDayKey(b)));
    const dummy = { tradeInCount: 0, iphoneUnits: 0 };

    // Trade-In is branch-level (not per-bill) → skip it as a column here.
    const cols = kpiPresets.filter((p) => p.calcType !== "tradeIn");
    const kindFor = (ct?: string): "att" | "unit" | "baht" =>
      ct === "attach" || ct === "catAttach"
        ? "att"
        : ct === "baht" || ct === "catBaht" || ct === "bahtRate"
          ? "baht"
          : "unit";
    // ฐาน ATT% ตามที่ตกลง: Pencil/iPad Acc ÷ iPad, AC+ ÷ iPhone+iPad, ที่เหลือ ÷ iPhone
    const baseKind = (name: string): "iphone" | "ipad" | "both" =>
      /pencil|ipad\s*acc/i.test(name)
        ? "ipad"
        : /\bac\s*\+|apple\s*care|applecare/i.test(name)
          ? "both"
          : "iphone";

    const catF = (cat: string): ItemFilter[] => [{ ...emptyItemFilter(), categories: [cat] }];
    const unitsOf = (bills: BillSummary[], cat: string) =>
      bills.reduce((s, b) => s + countItemQuantityAnyFilter(b, catF(cat)), 0);
    const bahtOf = (bills: BillSummary[], cat: string) =>
      bills.reduce((s, b) => s + sumItemRevenueAnyFilter(b, catF(cat)), 0);

    // Split a preset's matched attach items into "รุ่นเก่า" vs "รุ่นที่ตัด".
    // Reuse countItemQuantityAnyFilter (the exact matcher calcPreset uses —
    // inventory rule, customer/doc-type constraints and per-bill dedupe) on
    // two disjoint halves of each bill, so older + gen18 always equals the
    // unfiltered total.
    const isExcludedModelItem = (li: RawRow) => mentionsExcludedIphoneModel(li, excludedIphoneModelSet);

    const splitPresetUnits = (bills: BillSummary[], preset: KpiPreset) => {
      const filters = preset.filtersA ?? (preset.filterA ? [preset.filterA] : []);
      if (isIphoneAccPreset(preset)) bills = iphoneAccOnlyBills(bills);
      let older = 0;
      let gen18 = 0;
      if (!filters.length) return { older, gen18 };
      for (const bill of bills) {
        const items18 = bill.lineItems.filter(isExcludedModelItem);
        const itemsOld = bill.lineItems.filter((li) => !isExcludedModelItem(li));
        if (items18.length) {
          gen18 += countItemQuantityAnyFilter({ ...bill, lineItems: items18 }, filters);
        }
        if (itemsOld.length) {
          older += countItemQuantityAnyFilter({ ...bill, lineItems: itemsOld }, filters);
        }
      }
      return { older, gen18 };
    };

    const presetFilters = (re: RegExp) => {
      const p = kpiPresets.find((x) => re.test(x.name));
      return p ? p.filtersA ?? (p.filterA ? [p.filterA] : []) : [];
    };
    // preset Cover ตัวเดียวกับคอลัมน์ "Attach Coverplus" ในตาราง
    const coverPresetForBills =
      kpiPresets.find((x) => /cover\s*\+|cover\s*plus|coverplus/i.test(x.name)) ??
      kpiPresets.find((x) => /cover/i.test(x.name));
    const coverPresetsAll = kpiPresets.filter((x) => /cover/i.test(x.name));
    const ufundFilters = presetFilters(/ufund/i);
    // UFUND ในไฟล์ขายระบุด้วย Customer (Code) — นับเฉพาะ "UFUND PERSONAL"
    // (ไม่นับ UFUND UNIDAYS / UFUND STUDENT)
    void ufundFilters;
    const isUfundBill = isUfundPersonalBill;
    const rawIsIphone = (li: RawRow) => String(li["Category (Name)"] ?? "").trim().toLowerCase() === "iphone";

    const officerList = (parsedReport.officers.length > 0
      ? parsedReport.officers.map((o) => ({ name: o.name, staffId: o.staffId, position: o.position }))
      : Array.from(
          new Map(
            allBills.filter((b) => b.officerName).map((b) => [b.officerName, { name: b.officerName, staffId: undefined, position: undefined }]),
          ).values(),
        )
    ).filter((o) => !/bsm|bm|manager|ผู้จัดการ|จัดการ/i.test(String(o.position ?? "")));

    const officerRows = officerList
      .map((officer) => {
        const officerBills = allBills.filter((b) => matchesOfficer(b.officerName, officer.name));

        // Attach ต่อบิล — บิลจะ "ผ่าน" ก็ต่อเมื่อมีชิ้น attach (UFUND / Cover /
        // SIM / Accessories = ทุกอย่างที่ไม่ใช่ตัวเครื่องและไม่ใช่บรรทัดส่วนลด)
        // อย่างน้อย 3 ชิ้นในบิลเดียว
        // ฐาน = เฉพาะบิลที่มี iPhone (บิลเครื่องอื่น/อุปกรณ์เสริมล้วนไม่นับ)
        let attachPieces = 0;
        let qualifiedBills = 0;
        let deviceBills = 0;
        // บิล iPhone ที่ "มีอย่างน้อย 1 อย่าง": Cover / UFUND / SIM / Acc ≥3 ชิ้น
        let creditedBills = 0;
        let ufundIphoneBills = 0;
        const creditLog: string[] = [];
        let coverIphoneBills = 0;
        let simIphoneBills = 0;
        let ufundOther = 0; // บิล UFUND ที่ไม่มีแถว iPhone (เช่นตอนตัด iPhone บางรุ่นออก)
        const rawCatOf = (li: RawRow) => String(li["Category (Name)"] ?? "").trim().toLowerCase();
        // มี Cover ในบิล = preset ที่ชื่อมี "cover" ตัวใดตัวหนึ่งจับเจอ (ฝั่ง A)
        // หรือมีสินค้า COVER+ จริง (ไม่นับของแถม 7CARE+ Free)
        const billHasCover = (b: BillSummary) =>
          coverPresetsAll.some((cp) => calcPreset([b], cp, dummy).billsWithAandB > 0) ||
          b.lineItems.some((li) => {
            const name = String(li["Product (Name)"] ?? "");
            return /cover\s*\+|coverplus/i.test(`${name} ${li["Product (Code)"] ?? ""}`) && !/free|ฟรี/i.test(name);
          });
        const billHasSim = (b: BillSummary) =>
          b.lineItems.some((li) => {
            const rc = rawCatOf(li);
            return rc.includes("sim") || rc.includes("promo operator");
          });

        // ── รอบ 1: สถานะของแต่ละบิล iPhone ──
        type IphoneBillFlags = {
          b: BillSummary;
          cover: boolean;
          ufund: boolean;
          sim: boolean;
          pieces: number;
          merged: string[]; // เลขบิลแยกที่เอามารวม
        };
        const iphoneBills: IphoneBillFlags[] = [];
        // Cover ที่เปิดเป็น "บิลแยก" (ไม่มี iPhone ในบิล) — ใช้รวมกับบิล UFUND
        const looseCover: BillSummary[] = [];
        for (const b of officerBills) {
          const hasIphone = b.lineItems.some((li) => rawCatOf(li) === "iphone");
          if (!hasIphone) {
            if (isUfundBill(b)) ufundOther += 1;
            if (billHasCover(b)) looseCover.push(b);
            continue;
          }
          let piecesInBill = 0;
          for (const li of b.lineItems) {
            const rawCat = rawCatOf(li);
            if (RAW_DEVICE_CATS.has(rawCat)) continue;
            const prod = String(li["Product (Name)"] ?? "");
            if (rawCat.includes("promo") || /ส่วนลด/.test(prod)) continue;
            // ไม่นับ: ถุงใส่สินค้า (Selling Expense) และของแถมฟรี (เช่น 7CARE+ Free)
            if (rawCat.includes("selling expense") || /ถุง/.test(prod)) continue;
            if (/\bfree\b|ฟรี|ของแถม/i.test(prod)) continue;
            piecesInBill += toNumber(li.Number ?? li.number ?? li.qty ?? 0);
          }
          iphoneBills.push({
            b,
            cover: billHasCover(b),
            ufund: isUfundBill(b),
            sim: billHasSim(b),
            pieces: piecesInBill,
            merged: [],
          });
        }

        // ── รอบ 2: รวมบิล Cover แยก เข้ากับบิล UFUND ──
        const creditOf = (f: IphoneBillFlags) =>
          Math.max(
            f.cover ? boostMultiplier(attachBoost, "cover", f.b.docDate) : 0,
            f.ufund ? boostMultiplier(attachBoost, "ufund", f.b.docDate) : 0,
            f.sim ? boostMultiplier(attachBoost, "sim", f.b.docDate) : 0,
            f.pieces >= ATTACH_PER_BILL_TARGET ? boostMultiplier(attachBoost, "acc", f.b.docDate) : 0,
          );
        // บิล UFUND + บิล Cover ที่เปิดแยก = นับเป็นบิลเดียวกัน
        // (ขาย UFUND มักแยกบิล Cover+ ออกมา) → รวม Cover เข้ากับบิล iPhone ที่เป็น
        // UFUND และยังไม่มี Cover · กรณีอื่นไม่รวม
        for (const lb of looseCover) {
          const target = iphoneBills.find((f) => f.ufund && !f.cover);
          if (!target) break;
          target.cover = true;
          target.merged.push(lb.docNo || "-");
        }

        // ── รอบ 3: นับเครดิต ──
        for (const f of iphoneBills) {
          deviceBills += 1;
          attachPieces += f.pieces;
          if (f.pieces >= ATTACH_PER_BILL_TARGET) qualifiedBills += 1;
          // เครดิตของบิล = ตัวคูณสูงสุดของสิ่งที่แนบ — บิลมีตัว x2 ใช้ตัวนั้นก่อน (2)
          // ไม่บวกตัวอื่น (0.5) ซ้อน
          const billCredit = creditOf(f);
          creditedBills += billCredit;
          const parts: string[] = [];
          const tag = (label: string, t: "cover" | "ufund" | "sim" | "acc") => {
            const m = boostMultiplier(attachBoost, t, f.b.docDate);
            parts.push(m === 1 ? label : `${label}×${m}`);
          };
          if (f.cover) tag("Cover", "cover");
          if (f.ufund) tag("UFUND", "ufund");
          if (f.sim) tag("SIM", "sim");
          if (f.pieces >= ATTACH_PER_BILL_TARGET) tag(`Acc${f.pieces}`, "acc");
          creditLog.push(
            `${f.b.docNo || "-"}${f.merged.length ? ` (+บิลแยก ${f.merged.join(", ")})` : ""}: ${
              parts.length ? parts.join(" + ") : "ไม่มีแนบ"
            } → ${billCredit}`,
          );
          if (f.ufund) ufundIphoneBills += 1;
          if (f.cover) coverIphoneBills += 1;
          if (f.sim) simIphoneBills += 1;
        }
        // UFUND: นับจากไฟล์ขายอย่างเดียว (Customer Code = UFUND PERSONAL)
        const ufundUnits = ufundIphoneBills;
        // ทุก iPhone 4 เครื่อง ต้องมีบิลที่แนบได้อย่างน้อย 1 บิล — ไม่ถึงให้ช่อง iPhone เป็นสีแดง
        const iphoneUnitForAlert = unitsOf(officerBills, "iPhone");
        const requiredCredits = Math.floor(iphoneUnitForAlert / 4);
        const iphoneAttachAlert = requiredCredits > 0 && creditedBills < requiredCredits;
        // เตือนก่อน (เหลือง): อีก 1 เครื่องจะครบ 4 แต่ยังไม่มีบิลแนบสำหรับก้อนนี้
        const iphoneAttachWarn =
          !iphoneAttachAlert && iphoneUnitForAlert % 4 === 3 && creditedBills < requiredCredits + 1;
        const billCount = deviceBills;
        const attachPerBill = billCount > 0 ? (qualifiedBills / billCount) * 100 : 0;

        const iphoneUnit = unitsOf(officerBills, "iPhone");
        const ipadUnit = unitsOf(officerBills, "iPad");
        const totalDevice =
          iphoneUnit + ipadUnit + unitsOf(officerBills, "Mac") + unitsOf(officerBills, "Apple Watch");
        const totalBaht = officerBills.reduce((s, b) => s + b.totalRevenue, 0);
        const cells: Record<string, { kind: "att" | "unit" | "baht"; unit?: number; unit18?: number; att?: number; baht?: number }> = {};
        cols.forEach((p) => {
          const r = calcPresetIphoneAcc(officerBills, p, dummy);
          const kind = kindFor(p.calcType);
          if (kind === "baht") {
            cells[p.id] = { kind, baht: r.totalBaht };
          } else if (kind === "att") {
            const bk = baseKind(p.name);
            const base = bk === "ipad" ? ipadUnit : bk === "both" ? iphoneUnit + ipadUnit : iphoneUnit;
            if (excludingIphoneModels) {
              // ตอนตัด iPhone บางรุ่น: แยกให้เห็นว่าเป็นของรุ่นที่นับกี่ชิ้น / รุ่นที่ตัดกี่ชิ้น
              // และคิด ATT% จากรุ่นที่นับเท่านั้น (ฐาน iPhone ก็ไม่มีรุ่นที่ตัดแล้ว)
              const { older, gen18 } = splitPresetUnits(officerBills, p);
              cells[p.id] = {
                kind,
                unit: older,
                unit18: gen18,
                att: base > 0 ? (older / base) * 100 : 0,
              };
            } else {
              cells[p.id] = {
                kind,
                unit: r.billsWithAandB,
                att: base > 0 ? (r.billsWithAandB / base) * 100 : 0,
              };
            }
            // UFUND = บิล iPhone ที่ลูกค้าเป็น UFUND (ทุกรหัส) หรือยอดอนุมัติจาก API
            if (/ufund/i.test(p.name)) {
              cells[p.id] = {
                kind,
                unit: ufundUnits,
                ...(excludingIphoneModels ? { unit18: ufundOther } : {}),
                att: base > 0 ? (ufundUnits / base) * 100 : 0,
              };
            }
          } else {
            cells[p.id] = { kind, unit: r.billsWithAandB };
          }
        });
        return {
          name: officer.name,
          staffId: officer.staffId,
          totalBaht,
          totalDevice,
          billCount,
          attachPieces,
          qualifiedBills,
          attachPerBill,
          creditedBills,
          requiredCredits,
          iphoneAttachAlert,
          iphoneAttachWarn,
          // ให้ LINE ใช้ตัวเลขเดียวกับคอลัมน์ในตาราง (รวมส่วนรุ่นที่ตัด ถ้าแยกไว้)
          coverBills: coverPresetForBills && cells[coverPresetForBills.id]
            ? (cells[coverPresetForBills.id].unit ?? 0) + (cells[coverPresetForBills.id].unit18 ?? 0)
            : coverIphoneBills,
          ufundBills: ufundIphoneBills,
          simBills: simIphoneBills,
          iphoneUnit,
          iphoneBaht: bahtOf(officerBills, "iPhone"),
          ipadUnit,
          ipadBaht: bahtOf(officerBills, "iPad"),
          cells,
        };
      })
      .filter((r) => r.totalBaht > 0 || r.totalDevice > 0)
      .sort((a, b) => b.totalBaht - a.totalBaht);

    // แถวรวมสาขา (บนสุด)
    const sum = (f: (r: (typeof officerRows)[number]) => number) => officerRows.reduce((s, r) => s + f(r), 0);
    const totalIphone = sum((r) => r.iphoneUnit);
    const totalIpad = sum((r) => r.ipadUnit);
    const totalCells: Record<string, { kind: "att" | "unit" | "baht"; unit?: number; unit18?: number; att?: number; baht?: number }> = {};
    cols.forEach((p) => {
      const kind = kindFor(p.calcType);
      if (kind === "baht") {
        totalCells[p.id] = { kind, baht: sum((r) => r.cells[p.id]?.baht ?? 0) };
      } else if (kind === "att") {
        const bk = baseKind(p.name);
        const base = bk === "ipad" ? totalIpad : bk === "both" ? totalIphone + totalIpad : totalIphone;
        const unit = sum((r) => r.cells[p.id]?.unit ?? 0);
        const u18 = sum((r) => r.cells[p.id]?.unit18 ?? 0);
        totalCells[p.id] = {
          kind,
          unit,
          ...(excludingIphoneModels ? { unit18: u18 } : {}),
          att: base > 0 ? (unit / base) * 100 : 0,
        };
      } else {
        totalCells[p.id] = { kind, unit: sum((r) => r.cells[p.id]?.unit ?? 0) };
      }
    });
    const totalBills = sum((r) => r.billCount);
    const totalPieces = sum((r) => r.attachPieces);
    const totalQualified = sum((r) => r.qualifiedBills);
    const totalRow = {
      name: "รวมทั้งหมด",
      isTotal: true,
      totalBaht: sum((r) => r.totalBaht),
      totalDevice: sum((r) => r.totalDevice),
      billCount: totalBills,
      attachPieces: totalPieces,
      qualifiedBills: totalQualified,
      attachPerBill: totalBills > 0 ? (totalQualified / totalBills) * 100 : 0,
      creditedBills: sum((r) => r.creditedBills),
      requiredCredits: sum((r) => r.requiredCredits),
      iphoneAttachAlert: false,
      iphoneAttachWarn: false,
      iphoneUnit: totalIphone,
      iphoneBaht: sum((r) => r.iphoneBaht),
      ipadUnit: totalIpad,
      ipadBaht: sum((r) => r.ipadBaht),
      cells: totalCells,
    };

    return {
      latestDate: latestDay,
      presets: cols.map((p) => ({ id: p.id, name: p.name, kind: kindFor(p.calcType) })),
      rows: [totalRow, ...officerRows],
    };
    };
    return {
      daily: { ...build(latestRows), lastBillTime: lastBillTimeOf(latestRows) },
      monthly: {
        ...build(monthRows),
        ...(rangeActive ? { latestDate: scopeLastDay || rangeTo } : {}),
        monthFrom: rangeActive ? rangeFrom : `${monthPrefix}-01`,
        lastBillTime: lastBillTimeOf(scopeLastRows),
        rangeActive,
        rangeFrom: rangeActive ? rangeFrom : undefined,
        rangeTo: rangeActive ? rangeTo : undefined,
        dataFrom: allDays[0],
        dataTo: latestDay,
      },
    };
  // deps เหมือนเดิมทุกตัว (ไม่เปลี่ยนความถี่การคำนวณ)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayUploads.current,
    displayUploads.categoryMaster,
    parsedReport.officers,
    kpiPresets,
    currentRowsAllModels,
    excludedIphoneModelSet,
    attachBoost,
    rangeFrom,
    rangeTo,
  ]);
}
