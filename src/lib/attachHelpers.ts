/**
 * Helper บริสุทธิ์สำหรับการนับ Attach / Case / Film / UFUND
 * (แยกออกจาก App.tsx เพื่อลดขนาดไฟล์ — ไม่มี state/closure ผูกกับ component)
 */
import { emptyItemFilter } from "./presetTypes";
import { calcPreset, countItemQuantityAnyFilter } from "./presetEngine";
import type { BillSummary } from "./presetBills";
import type { RawRow } from "./salesAggregations";

/** เกณฑ์จำนวนชิ้น attach ต่อบิลที่ถือว่า "ผ่าน" */
export const ATTACH_PER_BILL_TARGET = 3;

/** ค่าคอลัมน์ Category (Name) ของตัวเครื่อง (ตัวพิมพ์เล็ก) — ห้ามใช้ getCategory
 *  เพราะมันจับคำว่า iPhone ในชื่อฟิล์ม/เคสด้วย */
export const RAW_DEVICE_CATS = new Set(["mac", "ipad", "iphone", "apple watch"]);

/** ค่า Category (Name) ดิบของตัวเครื่อง → ชื่อหมวด KPI */
export const RAW_DEVICE_CATEGORY: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
  "apple watch": "Apple Watch",
};

/** ชื่อหมวด "อื่นๆ" — ยอดที่ไม่เข้า 6 หมวดหลัก */
export const OTHER_CAT = "อื่นๆ";

/** เวลาบิลล่าสุด (HH:MM) จาก Create Time / Doc Date ของแถวชุดนี้ — บอกว่ายอดครอบคลุมถึงกี่โมง */
export const lastBillTimeOf = (rows: RawRow[]): string => {
  let best = "";
  for (const r of rows) {
    const raw = String(r["Create Time"] ?? r["Doc Date"] ?? r["doc date"] ?? "");
    const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw);
    if (!m) continue;
    const t = `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] ?? "00").padStart(2, "0")}`;
    if (t > best) best = t;
  }
  return best ? best.slice(0, 5) : "";
};

// ─── Case / ฟิล์ม: นับเฉพาะของ iPhone ───────────────────────────────────────
// preset ที่ชื่อมี case / film / เคส / ฟิล์ม นับเฉพาะสินค้าที่ใช้กับ iPhone
// (Sub Category / ชื่อสินค้ามีคำว่า iPhone) และหารด้วยจำนวน iPhone
export const isIphoneAccPreset = (p: { name?: string }) =>
  /case|film|เคส|ฟิล์ม|ฟิม/i.test(String(p.name ?? ""));

export const isNonIphoneCaseFilmLine = (li: RawRow): boolean => {
  const cat = String(li["Category (Name)"] ?? "");
  if (/^iphone$/i.test(cat.trim())) return false; // ตัวเครื่อง iPhone (ใช้เป็นฐาน)
  // นับเฉพาะสินค้าที่ "ใช้กับ iPhone" จริง — Sub Category หรือชื่อสินค้าต้องมีคำว่า
  // iPhone (เช่น FILM IPHONE, CASE IPHONE, CASING IPHONE 18 PRO, Camera Lens
  // for iPhone 18 Pro) · อย่างอื่น (iPad/Mac/AirPods/Watch, ที่ใส่การ์ด, สายคล้อง
  // ที่ไม่ระบุรุ่น) ไม่นับ
  const text = `${li["Sub Category"] ?? ""} ${li["Product (Name)"] ?? ""}`;
  return !/iphone/i.test(text);
};

/** ฟิล์มเลนส์กล้อง / ฐานกล้อง (ไม่นับเป็น ATT ฟิล์ม) */
export const isCameraFilmLine = (li: RawRow): boolean =>
  /camera/i.test(String(li["Sub Category"] ?? "")) ||
  /camera\s*lens|lens\s*frame|เลนส์|ฐานกล้อง/i.test(String(li["Product (Name)"] ?? ""));

export const iphoneAccOnlyBills = (bills: BillSummary[]): BillSummary[] =>
  bills.map((b) =>
    b.lineItems.some(isNonIphoneCaseFilmLine)
      ? { ...b, lineItems: b.lineItems.filter((li) => !isNonIphoneCaseFilmLine(li)) }
      : b,
  );

// เคส/ฟิล์ม: ตัวตั้ง = เฉพาะของ iPhone · ตัวหาร = จำนวน iPhone ที่ขาย (ไม่ใช่ฐาน B
// ของ preset ซึ่งอาจรวม iPad/Mac/Watch หรือเป็นฐานอื่น)
export const IPHONE_UNIT_FILTER = [{ ...emptyItemFilter(), categories: ["iPhone"] }];

export const calcPresetIphoneAcc: typeof calcPreset = (bills, preset, ctx) => {
  if (!isIphoneAccPreset(preset)) return calcPreset(bills, preset, ctx);
  // ฟิล์ม: นับเฉพาะฟิล์มหน้าจอ — ไม่นับฟิล์มเลนส์กล้อง (CAMERA FILM) และฐานกล้อง
  // (CAMERA BASE FILM)
  const isFilmPreset = /film|ฟิล์ม|ฟิม/i.test(String(preset.name ?? ""));
  let scoped = iphoneAccOnlyBills(bills);
  if (isFilmPreset) {
    scoped = scoped.map((b) =>
      b.lineItems.some(isCameraFilmLine)
        ? { ...b, lineItems: b.lineItems.filter((li) => !isCameraFilmLine(li)) }
        : b,
    );
  }
  const r = calcPreset(scoped, preset, ctx);
  const ct = String(preset.calcType ?? "");
  if (ct !== "attach" && ct !== "catAttach") return r;
  const iphoneUnits = bills.reduce((s, b) => s + countItemQuantityAnyFilter(b, IPHONE_UNIT_FILTER), 0);
  return {
    ...r,
    billsWithB: iphoneUnits,
    attachRate: iphoneUnits > 0 ? (r.billsWithAandB / iphoneUnits) * 100 : 0,
  };
};

// ─── UFUND = บิลที่ Customer (Code) เป็น "UFUND PERSONAL" เท่านั้น ─────────────
// (ตอนอัปโหลดคอลัมน์ถูกแปลงชื่อเป็น "Customer Code" — รองรับทั้งสองแบบ)
export const UFUND_PERSONAL_RE = /ufund\s*personal/i;

export const isUfundPersonalBill = (b: BillSummary): boolean =>
  UFUND_PERSONAL_RE.test(String(b.customerCode ?? "")) ||
  b.lineItems.some((li) =>
    UFUND_PERSONAL_RE.test(
      String(li["Customer Code"] ?? li["Customer (Code)"] ?? (li as Record<string, unknown>).customer_code ?? ""),
    ),
  );

/** จำนวนบิล iPhone ที่ปิดด้วย UFUND PERSONAL */
export const countUfundIphoneBills = (bills: BillSummary[]): number =>
  bills.filter(
    (b) =>
      isUfundPersonalBill(b) &&
      b.lineItems.some((li) => /^iphone$/i.test(String(li["Category (Name)"] ?? "").trim())),
  ).length;

/** คำที่บอกว่าเป็น "ชิ้น attach" (ใช้ heuristic) */
export const ATTACH_ITEM_HINT =
  /cover|film|case|care|glass|adapter|cable|sim|pencil|airpod|strap|bag|charger|power|protect|smile|ufund/i;
