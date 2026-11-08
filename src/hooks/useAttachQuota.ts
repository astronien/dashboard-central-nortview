/**
 * ตาราง "โควตา Attach สะสม — Cover/UFUND ต่อ iPhone (1:4)"
 * (ย้ายมาจาก App.tsx แบบคำต่อคำ)
 */
import { useMemo } from "react";
import type { RawRow } from "../lib/salesAggregations";
import type { UploadKind } from "../lib/uploadsApi";
import type { BillSummary } from "../lib/presetBills";
import type { Preset as KpiPreset } from "../lib/presetTypes";
import { calcPreset } from "../lib/presetEngine";
import { parseDocDate } from "../lib/dateParser";
import { normalizeId, rawTargetRowsToRecords } from "../lib/targetAggregations";
import { resolveOfficerId } from "../lib/officerCategoryKpi";
import { matchesOfficer } from "../lib/matchHelpers";
import { countUfundIphoneBills } from "../lib/attachHelpers";
import { boostInRange, boostMultiplier, type AttachBoost } from "../lib/attachBoost";
import type { AttachQuotaData } from "../components/dashboard/AttachQuotaSection";

export type AttachQuotaInput = {
  displayUploads: Record<UploadKind, RawRow[]>;
  parsedReport: { officers: Array<{ name: string; branch: string; staffId?: string; position?: string }> };
  kpiPresets: KpiPreset[];
  iphoneUnitsFromBills: (bills: BillSummary[]) => number;
  attachBoost: AttachBoost;
  currentBillsShared: BillSummary[];
};

export function useAttachQuota(input: AttachQuotaInput): AttachQuotaData {
  const { displayUploads, parsedReport, kpiPresets, iphoneUnitsFromBills, attachBoost, currentBillsShared } = input;
  return useMemo<AttachQuotaData>(() => {
    const empty: AttachQuotaData = {
      rows: [],
      fromDate: "",
      toDate: "",
      handoffCount: 0,
      recipient: null,
    };
    if (displayUploads.current.length === 0) return empty;

    // ช่วงวันที่ของข้อมูล (แรก–ล่าสุด)
    const dayKey = (row: RawRow) => {
      const p = parseDocDate(String(row["Doc Date"] ?? row["doc date"] ?? ""));
      return p
        ? `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`
        : "";
    };
    const daySet = new Set<string>();
    displayUploads.current.forEach((r) => {
      const k = dayKey(r);
      if (k) daySet.add(k);
    });
    const days = Array.from(daySet).sort();
    const fromDate = days[0] ?? "";
    const toDate = days[days.length - 1] ?? "";

    const targetRecords = rawTargetRowsToRecords(displayUploads.target);

    // นับ iPhone / Cover / UFUND ด้วยวิธีเดียวกับ COVERPLUS/UFUND ในตาราง
    // 7 Wonders (preset engine: เฉพาะ inventory item, dedupe ต่อบิล, รวม qty)
    // เพื่อให้ยอด iPhone ตรงกับที่โชว์ใน COVERPLUS ไม่ใช่ rowMatchesKpiCategory
    // ที่นับเกิน (รวม non-inventory/ซ้ำ)
    const quotaBills = currentBillsShared;
    const coverPlusPreset = kpiPresets.find((p) =>
      /cover\s*\+|cover\s*plus|coverplus/i.test(p.name),
    );
    const dummyCtx = { tradeInCount: 0, iphoneUnits: 0 };

    const officerList: Array<{ name: string; branch: string; staffId?: string; position?: string }> =
      parsedReport.officers.length > 0
        ? parsedReport.officers.map((o) => ({
            name: o.name,
            branch: o.branch,
            staffId: o.staffId,
            position: o.position,
          }))
        : Array.from(
            new Map(
              displayUploads.current
                .filter((r) => r["Officer (Name)"])
                .map((r) => {
                  const n = String(r["Officer (Name)"]).trim();
                  return [n, { name: n, branch: String(r["Branch (Name)"] ?? "") }];
                }),
            ).values(),
          );

    const rows = officerList
      .map((officer) => {
        const officerId = resolveOfficerId(
          officer.name,
          displayUploads.target,
          targetRecords,
          displayUploads.current,
          matchesOfficer,
        );
        const nId = normalizeId(officerId);
        const officerBills = quotaBills.filter(
          (b) =>
            matchesOfficer(b.officerName, officer.name) ||
            Boolean(nId && normalizeId(b.officerId) === nId),
        );
        // iPhone = ฐาน iPhone ของ Cover Plus (billsWithB) · Cover = ยอดแนบ Cover
        // Plus (billsWithAandB) · UFUND = ยอดแนบ UFUND (billsWithAandB)
        const cpResult = coverPlusPreset
          ? calcPreset(officerBills, coverPlusPreset, dummyCtx)
          : null;
        const iphone = cpResult
          ? cpResult.billsWithB
          : iphoneUnitsFromBills(officerBills);
        const cover = cpResult ? cpResult.billsWithAandB : 0;
        const ufund = countUfundIphoneBills(officerBills);
        // โหมด x2: บิลในช่วงวันที่ boost คิดเครดิต "ต่อบิล" — ถ้าบิลมีตัวที่ x2
        // ใช้ตัวนั้นก่อน (2 เครดิต) ไม่บวกตัวอื่นเพิ่ม · ไม่มีตัว x2 → ตัวอื่น 0.5
        // บิลนอกช่วง boost คิดแบบเดิม (Cover + UFUND นับแยกกัน)
        const boostBills = officerBills.filter((b) => boostInRange(attachBoost, b.docDate));
        const normalBills = boostBills.length
          ? officerBills.filter((b) => !boostInRange(attachBoost, b.docDate))
          : officerBills;
        const coverOut = boostBills.length
          ? coverPlusPreset
            ? calcPreset(normalBills, coverPlusPreset, dummyCtx).billsWithAandB
            : 0
          : cover;
        const ufundOut = boostBills.length ? countUfundIphoneBills(normalBills) : ufund;
        // บิลในช่วง boost คิดเครดิตต่อบิล = ตัวคูณสูงสุด (x2 มาก่อน)
        // บิล UFUND + บิล Cover ที่เปิดแยก = นับเป็นบิลเดียวกัน
        const coverInBill = (b: BillSummary) =>
          (coverPlusPreset ? calcPreset([b], coverPlusPreset, dummyCtx).billsWithAandB > 0 : false) ||
          b.lineItems.some((li) => {
            const name = String(li["Product (Name)"] ?? "");
            return /cover\s*\+|coverplus/i.test(`${name} ${li["Product (Code)"] ?? ""}`) && !/free|ฟรี/i.test(name);
          });
        const isIphoneBill = (b: BillSummary) =>
          b.lineItems.some((li) => /^iphone$/i.test(String(li["Category (Name)"] ?? "").trim()));
        const slots = boostBills.map((b) => ({
          b,
          iphone: isIphoneBill(b),
          cov: coverInBill(b),
          uf: countUfundIphoneBills([b]) > 0,
        }));
        for (const loose of slots.filter((x) => !x.iphone && x.cov)) {
          const target = slots.find((x) => x.iphone && x.uf && !x.cov);
          if (!target) continue;
          target.cov = true;
          loose.cov = false; // ย้ายไปนับในบิล UFUND แล้ว
        }
        let boostCredit = 0;
        for (const x of slots) {
          boostCredit += Math.max(
            x.cov ? boostMultiplier(attachBoost, "cover", x.b.docDate) : 0,
            x.uf ? boostMultiplier(attachBoost, "ufund", x.b.docDate) : 0,
          );
        }
        const attach = coverOut + ufundOut + boostCredit;
        const remaining = 4 * attach - iphone;
        const status: "pass" | "accumulating" | "handoff" =
          remaining >= 0 ? "pass" : remaining <= -4 ? "handoff" : "accumulating";

        return {
          name: officer.name,
          branch: officer.branch,
          iphone,
          cover,
          ufund,
          attach,
          remaining,
          status,
        };
      })
      .filter((r) => r.iphone > 0 || r.cover > 0 || r.ufund > 0)
      .sort((a, b) => a.remaining - b.remaining); // แย่สุด (ติดลบมากสุด) ขึ้นก่อน

    // ผู้รับช่วง = คนที่ผ่านเกณฑ์ + สิทธิ์คงเหลือมากสุด
    let recipient: { name: string; remaining: number } | null = null;
    for (const r of rows) {
      if (r.status === "pass" && r.remaining > 0) {
        if (!recipient || r.remaining > recipient.remaining) {
          recipient = { name: r.name, remaining: r.remaining };
        }
      }
    }
    const handoffCount = rows.filter((r) => r.status === "handoff").length;

    return { rows, fromDate, toDate, handoffCount, recipient };
  // deps เหมือนเดิมทุกตัว
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayUploads.current,
    displayUploads.target,
    displayUploads.categoryMaster,
    parsedReport.officers,
    kpiPresets,
    iphoneUnitsFromBills,
    attachBoost,
  ]);
}
