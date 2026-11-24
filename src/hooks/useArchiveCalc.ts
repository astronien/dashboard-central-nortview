/**
 * คำนวณข้อมูลจากคลังรายเดือน "ครั้งเดียว" แล้วเก็บผลที่ server (ใช้ร่วมทุกเครื่อง)
 * คิดใหม่เฉพาะเดือนที่ข้อมูลเปลี่ยน (signature) หรือวิธีคิดเปลี่ยน (methodSig)
 */
import React from "react";
import type { RawRow } from "../lib/salesAggregations";
import {
  fetchArchiveCalc,
  fetchArchiveMonth,
  hashText,
  monthLabelTh,
  saveArchiveCalc,
  type ArchiveMonthMeta,
} from "../lib/salesArchive";
import type { Preset } from "../lib/presetTypes";
import { attAxes } from "../lib/attHistory";

const mem = new Map<string, unknown>();

/** ลายเซ็นวิธีคิดของ Category Master (ใช้ร่วมกันหลายมุมมอง) */
export const masterSig = (categoryMaster: RawRow[]) =>
  hashText(JSON.stringify(categoryMaster.map((r) => [r["Cat & Sub Cat"], r["CAT Daily"]])));
/** ลายเซ็นวิธีคิดของ ATT (ต้องตรงกับ AttHistoryView) */
export const attMethodSig = (presets: Preset[], categoryMaster: RawRow[]) =>
  hashText(attAxes(presets).map((p) => `${p.id}:${p.targetPercent ?? ""}:${JSON.stringify(p.filtersA ?? [])}`).join("|")) +
  "." +
  masterSig(categoryMaster);
export const catMethodSig = (categoryMaster: RawRow[]) => "v1." + masterSig(categoryMaster);

export function useArchiveCalc<T>(params: {
  archiveKey: string;
  months: ArchiveMonthMeta[];
  kind: string;
  methodSig: string;
  compute: (rows: RawRow[]) => T;
  /** false = แค่อ่านผลที่เก็บไว้ ไม่คำนวณเดือนที่ขาด */
  computeMissing?: boolean;
}): { data: Record<string, T>; loading: string } {
  const { archiveKey, months, kind, methodSig, compute, computeMissing = true } = params;
  const [data, setData] = React.useState<Record<string, T>>({});
  const [loading, setLoading] = React.useState("");
  const salesMonths = months.filter((m) => m.rowCount > 0);
  const computeRef = React.useRef(compute);
  computeRef.current = compute;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading("กำลังโหลด…");
      const saved = await fetchArchiveCalc<T>(archiveKey, kind);
      if (cancelled) return;
      const next: Record<string, T> = {};
      const todo = salesMonths.filter((m) => {
        const sig = `${m.signature}|${methodSig}`;
        const k = `${kind}|${archiveKey}|${m.month}|${sig}`;
        const hit = (mem.get(k) as T | undefined) ?? (saved[m.month]?.sig === sig ? saved[m.month]?.data : undefined);
        if (hit) {
          mem.set(k, hit);
          next[m.month] = hit;
          return false;
        }
        return true;
      });
      setData({ ...next });
      if (computeMissing) {
        for (let i = 0; i < todo.length; i++) {
          const m = todo[i];
          const sig = `${m.signature}|${methodSig}`;
          setLoading(`กำลังคำนวณ ${monthLabelTh(m.month)} (${i + 1}/${todo.length})`);
          const rows = await fetchArchiveMonth(archiveKey, m.month);
          if (cancelled) return;
          const v = computeRef.current(rows);
          mem.set(`${kind}|${archiveKey}|${m.month}|${sig}`, v);
          next[m.month] = v;
          setData({ ...next });
          void saveArchiveCalc(archiveKey, kind, m.month, sig, v);
        }
      }
      if (!cancelled) setLoading("");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveKey, kind, methodSig, computeMissing, salesMonths.map((m) => `${m.month}:${m.signature}`).join(",")]);

  return { data, loading };
}
