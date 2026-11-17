/**
 * ลูกค้าถามหาแต่ไม่มีของ (lost demand)
 * ร้านสั่งของเองไม่ได้ — คลังจัดสรรตามรันเรท ซึ่งต่ำกว่าความจริงเมื่อของขาด
 * บันทึกนี้คือหลักฐานว่าร้านเสียยอดไปเท่าไร ไว้ขอของเพิ่ม
 */

export type LostDemandRow = {
  id: number;
  product: string;
  qty: number;
  note?: string | null;
  staff?: string | null;
  created_at: string; // UTC "YYYY-MM-DD HH:MM:SS"
};

const base = "/api/staff-photos?resource=lost-demand";

export async function fetchLostDemand(branch: string, days = 35): Promise<LostDemandRow[]> {
  try {
    const r = await fetch(`${base}&branch=${encodeURIComponent(branch)}&days=${days}`);
    const j = (await r.json()) as { ok?: boolean; rows?: LostDemandRow[] };
    return Array.isArray(j?.rows) ? j.rows.map((x) => ({ ...x, id: Number(x.id), qty: Number(x.qty) || 1 })) : [];
  } catch {
    return [];
  }
}

export async function addLostDemand(
  branch: string,
  entry: { product: string; qty: number; note?: string; staff?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, ...entry }),
    });
    const j = (await r.json()) as { ok?: boolean; error?: string };
    return { ok: Boolean(j?.ok), error: j?.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteLostDemand(branch: string, id: number): Promise<boolean> {
  try {
    const r = await fetch(`${base}&branch=${encodeURIComponent(branch)}&id=${id}`, { method: "DELETE" });
    return Boolean(((await r.json()) as { ok?: boolean })?.ok);
  } catch {
    return false;
  }
}

export const lostDemandDate = (v: string): Date => new Date(/T|Z/.test(v) ? v : `${v.replace(" ", "T")}Z`);

export type LostDemandSummaryRow = { product: string; qty: number; times: number; value: number | null };

/** รวมต่อสินค้า (เฉพาะ N วันล่าสุด) — value = qty × ราคาเฉลี่ยจากไฟล์ยอดขาย (ถ้าหาได้) */
export function summarizeLostDemand(
  rows: LostDemandRow[],
  days: number,
  priceOf: (product: string) => number | null,
): { rows: LostDemandSummaryRow[]; totalQty: number; totalValue: number; times: number } {
  const since = Date.now() - days * 86_400_000;
  const m = new Map<string, LostDemandSummaryRow>();
  for (const r of rows) {
    if (lostDemandDate(r.created_at).getTime() < since) continue;
    const key = r.product.trim();
    const cur = m.get(key) ?? { product: key, qty: 0, times: 0, value: 0 };
    cur.qty += r.qty;
    cur.times += 1;
    m.set(key, cur);
  }
  const out = Array.from(m.values()).map((x) => {
    const p = priceOf(x.product);
    return { ...x, value: p != null ? p * x.qty : null };
  });
  out.sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || b.qty - a.qty);
  return {
    rows: out,
    totalQty: out.reduce((s, x) => s + x.qty, 0),
    totalValue: out.reduce((s, x) => s + (x.value ?? 0), 0),
    times: out.reduce((s, x) => s + x.times, 0),
  };
}

/** ราคาเฉลี่ยต่อชิ้นจากไฟล์ยอดขาย (จับชื่อสินค้าตรงตัว ไม่สนตัวพิมพ์/ช่องว่าง) */
export function buildPriceLookup(rows: Array<Record<string, unknown>>): (product: string) => number | null {
  const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const sum = new Map<string, { baht: number; qty: number }>();
  for (const r of rows) {
    const name = norm(r["Product (Name)"] ?? r.product_name);
    if (!name) continue;
    const qty = Number(String(r.Number ?? r.number ?? r.qty ?? 1).replace(/[^\d.-]/g, "")) || 1;
    const baht = Number(String(r["ราคาจำหน่าย"] ?? r["ราคาขายตามบิล"] ?? r["Total Price"] ?? 0).replace(/[^\d.-]/g, "")) || 0;
    if (baht <= 0) continue;
    const cur = sum.get(name) ?? { baht: 0, qty: 0 };
    cur.baht += baht;
    cur.qty += qty;
    sum.set(name, cur);
  }
  return (product: string) => {
    const s = sum.get(norm(product));
    return s && s.qty > 0 ? s.baht / s.qty : null;
  };
}

export function buildLostDemandText(params: {
  branch: string;
  days: number;
  summary: ReturnType<typeof summarizeLostDemand>;
}): string {
  const { branch, days, summary } = params;
  const fmt = (n: number) => Math.round(n).toLocaleString();
  const lines = [
    `ลูกค้าถามหาแต่ไม่มีของ · ${branch} · ${days} วันล่าสุด`,
    `รวม ${summary.times} ครั้ง ${fmt(summary.totalQty)} ชิ้น${summary.totalValue > 0 ? ` · ประมาณ ฿${fmt(summary.totalValue)}` : ""}`,
    "",
  ];
  for (const r of summary.rows.slice(0, 40)) {
    lines.push(`• ${r.product} — ${r.qty} ชิ้น (${r.times} ครั้ง)${r.value != null ? ` · ฿${fmt(r.value)}` : ""}`);
  }
  if (summary.rows.length > 40) lines.push(`…และอีก ${summary.rows.length - 40} รายการ`);
  lines.push("", "(ใช้เป็นข้อมูลขอเพิ่มการจัดสรรจากคลัง — ยอดนี้ไม่อยู่ในรันเรทเพราะไม่มีของขาย)");
  return lines.join("\n");
}
