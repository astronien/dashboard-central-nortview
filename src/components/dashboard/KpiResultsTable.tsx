import { useMemo, useState } from "react";
import type { BillSummary } from "../../lib/presetBills";
import type { Preset, PresetResult } from "../../lib/presetTypes";
import { calcPreset } from "../../lib/presetEngine";
import { ArrowUp, ArrowDown } from "lucide-react";

export type KpiResultsMode = "branch" | "officer";

interface KpiResultsTableProps {
  mode: KpiResultsMode;
  filteredBills: BillSummary[];
  activePresets: Preset[];
}

interface BranchRow {
  key: string;
  name: string;
  billCount: number;
  presetResults: Record<string, PresetResult>;
  totalAchRate: number;
  totalBaht: number;
}

const formatNumber = (n: number, isCurrency: boolean): string => {
  if (isCurrency) {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return Math.round(n).toLocaleString();
  }
  return Math.round(n).toLocaleString();
};

const isCurrencyCalc = (calcType: string | undefined) =>
  calcType === "baht" || calcType === "bahtRate" || calcType === "catBaht";

const valueForResult = (
  r: PresetResult,
): { text: string; raw: number; suffix: string } => {
  const ct = r.calcType;
  if (ct === "baht" || ct === "catBaht") {
    return { text: `฿${formatNumber(r.totalBaht, true)}`, raw: r.totalBaht, suffix: "" };
  }
  if (ct === "unit" || ct === "catQty") {
    return {
      text: `${r.billsWithAandB.toLocaleString()} ชิ้น`,
      raw: r.billsWithAandB,
      suffix: "",
    };
  }
  if (ct === "bahtRate") {
    if (r.totalBahtB === 0) {
      return { text: "-", raw: 0, suffix: "" };
    }
    return {
      text: `${r.bahtRate.toFixed(1)}%`,
      raw: r.bahtRate,
      suffix: `฿${formatNumber(r.totalBaht, true)} / ฿${formatNumber(r.totalBahtB, true)}`,
    };
  }
  // attach / catAttach
  if (r.billsWithB === 0) {
    return { text: "-", raw: 0, suffix: "" };
  }
  return {
    text: `${r.attachRate.toFixed(1)}%`,
    raw: r.attachRate,
    suffix: `${r.billsWithAandB}/${r.billsWithB} ชิ้น`,
  };
};

const achColor = (rate: number): string => {
  if (rate >= 100) return "text-emerald-400";
  if (rate >= 80) return "text-amber-400";
  return "text-rose-400";
};

const achBg = (rate: number): string => {
  if (rate >= 100) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (rate >= 80) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-rose-500/20 text-rose-300 border-rose-500/30";
};

export default function KpiResultsTable({
  mode,
  filteredBills,
  activePresets,
}: KpiResultsTableProps) {
  const [sortField, setSortField] = useState<string>("totalAchRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows: BranchRow[] = useMemo(() => {
    const groupMap = new Map<string, BillSummary[]>();
    filteredBills.forEach((bill) => {
      const key = mode === "branch" ? bill.branchName || bill.branchId : bill.officerName || bill.officerId;
      if (!key) return;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(bill);
    });

    const list: BranchRow[] = [];
    groupMap.forEach((bills, key) => {
      const presetResults: Record<string, PresetResult> = {};
      let totalAch = 0;
      let totalBaht = 0;
      activePresets.forEach((preset) => {
        const result = calcPreset(bills, preset);
        presetResults[preset.id] = result;
        if (preset.calcType === "baht" || preset.calcType === "catBaht") {
          totalBaht += result.totalBaht;
        } else if (preset.calcType !== undefined) {
          totalAch += result.attachRate;
        }
      });
      list.push({
        key,
        name: key,
        billCount: bills.length,
        presetResults,
        totalAchRate: activePresets.length > 0 ? totalAch / activePresets.length : 0,
        totalBaht,
      });
    });
    return list;
  }, [filteredBills, activePresets, mode]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const getVal = (r: BranchRow) => {
        if (sortField === "name") return r.name.toLowerCase();
        if (sortField === "billCount") return r.billCount;
        if (sortField === "totalBaht") return r.totalBaht;
        if (sortField === "totalAchRate") return r.totalAchRate;
        return r.presetResults[sortField]?.attachRate ?? 0;
      };
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return arr;
  }, [rows, sortField, sortDir]);

  if (activePresets.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/60 text-sm">
        เลือก Preset ด้านบน (อย่างน้อย 1 รายการ) เพื่อดูตารางผลลัพธ์
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/60 text-sm">
        ไม่มีข้อมูลบิลในช่วงวันที่ที่เลือก
      </div>
    );
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="opacity-30 ml-1">↕</span>;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">
          ตารางผลลัพธ์ {mode === "branch" ? "รายสาขา" : "รายพนักงาน"} ({sorted.length})
        </h3>
        <span className="text-xs text-white/50">
          คลิกหัวคอลัมน์เพื่อเรียงลำดับ
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-bold">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="hover:text-white"
                >
                  {mode === "branch" ? "สาขา" : "พนักงาน"}
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold text-center">
                <button
                  type="button"
                  onClick={() => handleSort("billCount")}
                  className="hover:text-white"
                >
                  บิล
                  <SortIcon field="billCount" />
                </button>
              </th>
              {activePresets.map((preset) => (
                <th
                  key={preset.id}
                  className="py-3 px-4 font-bold text-center whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => handleSort(preset.id)}
                    className="hover:text-white"
                  >
                    {preset.name}
                    <SortIcon field={preset.id} />
                  </button>
                </th>
              ))}
              <th className="py-3 px-4 font-bold text-right">
                <button
                  type="button"
                  onClick={() => handleSort("totalBaht")}
                  className="hover:text-white"
                >
                  รวมยอด
                  <SortIcon field="totalBaht" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold text-center">
                <button
                  type="button"
                  onClick={() => handleSort("totalAchRate")}
                  className="hover:text-white"
                >
                  Avg Ach%
                  <SortIcon field="totalAchRate" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.key}
                className={`border-t border-white/5 transition-colors ${
                  idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                } hover:bg-white/5`}
              >
                <td className="py-3 px-4 text-white/90 font-medium">{row.name}</td>
                <td className="py-3 px-4 text-center text-white/70">
                  {row.billCount.toLocaleString()}
                </td>
                {activePresets.map((preset) => {
                  const r = row.presetResults[preset.id];
                  if (!r) {
                    return (
                      <td key={preset.id} className="py-3 px-4 text-center text-white/30">
                        -
                      </td>
                    );
                  }
                  const v = valueForResult(r);
                  const ct = preset.calcType;
                  if (ct === "bahtRate" || ct === "attach" || ct === "catAttach") {
                    return (
                      <td key={preset.id} className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-xs border ${achBg(r.attachRate)}`}
                        >
                          {v.text}
                        </span>
                        {v.suffix && (
                          <div className="text-[10px] text-white/40 mt-0.5">
                            {v.suffix.trim()}
                          </div>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={preset.id}
                      className={`py-3 px-4 text-center font-semibold ${
                        isCurrencyCalc(ct) ? "text-emerald-300" : "text-white/80"
                      }`}
                    >
                      {v.text}
                      {v.suffix && (
                        <div className="text-[10px] text-white/40 mt-0.5">{v.suffix.trim()}</div>
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                  ฿{formatNumber(row.totalBaht, true)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-xs border ${achBg(row.totalAchRate)}`}
                  >
                    {row.totalAchRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
