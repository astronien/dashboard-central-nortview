import React from "react";
import { Wallet } from "lucide-react";
import {
  COMMISSION_CATEGORIES,
  COMMISSION_TIERS,
  SCHEME_BANDS,
  SCHEME_LABEL,
  getRate,
  type CommissionStaffRow,
  type SchemeBand,
} from "../../lib/commissionScheme";

const fmtBaht = (n: number) => Math.round(n).toLocaleString();
const fmtBaht2 = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tierColor = (tierIndex: number): string =>
  tierIndex === 0
    ? "bg-emerald-500/20 text-emerald-300"
    : tierIndex === 1
      ? "bg-sky-500/20 text-sky-300"
      : tierIndex === 2
        ? "bg-amber-500/20 text-amber-300"
        : tierIndex === 3
          ? "bg-orange-500/20 text-orange-300"
          : "bg-rose-500/20 text-rose-300";

export const CommissionSection: React.FC<{
  rows: CommissionStaffRow[];
  band: SchemeBand;
  bandId: string;
  onBandChange: (id: string) => void;
  newScheme: boolean;
  onNewSchemeChange: (v: boolean) => void;
  storeTargetTotal: number;
}> = ({ rows, band, bandId, onBandChange, newScheme, onNewSchemeChange, storeTargetTotal }) => {
  const grandTotal = rows.reduce((s, r) => s + r.totalCommission, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-300" />
            <h3 className="text-lg font-bold tracking-tight text-white">
              ค่าคอมมิชชั่น (PIA Individual)
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-white/50">รวมทั้งร้าน</div>
            <div className="text-2xl font-extrabold text-emerald-300">฿{fmtBaht(grandTotal)}</div>
          </div>
        </div>
        <p className="text-xs text-white/50 mb-3">
          คิดจากยอดขายสะสม × อัตราตามขั้น % achievement ของแต่ละหมวด · เฉพาะพนักงานขาย (PIA) ·
          ต่ำกว่า 70% ไม่ได้ค่าคอม
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-white/50">ช่วง Scheme:</span>
            <select
              value={bandId}
              onChange={(e) => onBandChange(e.target.value)}
              className="bg-[#051710] border border-white/15 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="">อัตโนมัติจากเป้ารวมร้าน</option>
              {SCHEME_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-white/40">
            ใช้อยู่: <span className="text-emerald-300 font-semibold">{band.label}</span>
            {" · "}เป้ารวมร้าน {(storeTargetTotal / 1_000_000).toFixed(2)} MB
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newScheme}
              onChange={(e) => onNewSchemeChange(e.target.checked)}
              className="accent-emerald-500"
            />
            <span className="text-white/70">ใช้ New Scheme (iPad / iPhone)</span>
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-white/40 py-8 text-center">ยังไม่มีข้อมูลพนักงานขาย (PIA)</p>
        ) : (
          <div className="flex flex-col gap-5">
            {rows.map((staff) => (
              <div key={staff.staffId ?? staff.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-bold text-white">{staff.name}</div>
                    <div className="text-[10px] text-white/40">
                      {staff.staffId ? `ID ${staff.staffId}` : ""} {staff.branch ?? ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">ค่าคอมรวม</div>
                    <div className="text-xl font-extrabold text-emerald-300">
                      ฿{fmtBaht2(staff.totalCommission)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-emerald-500/10">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                        <th className="py-2 px-3 font-bold uppercase tracking-wider">หมวด</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-right">เป้า</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-right">ยอดขาย</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-center">% Ach</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-center">ขั้น</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-right">อัตรา</th>
                        <th className="py-2 px-3 font-bold uppercase tracking-wider text-right">ค่าคอม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
                      {staff.categories.map((c) => (
                        <tr key={c.category} className="text-white/90 hover:bg-white/5 transition-colors">
                          <td className="py-1.5 px-3 font-bold">{c.category}</td>
                          <td className="py-1.5 px-3 text-right text-white/50">{fmtBaht(c.target)}</td>
                          <td className="py-1.5 px-3 text-right font-semibold">{fmtBaht(c.actual)}</td>
                          <td className="py-1.5 px-3 text-center font-bold">{c.achPercent.toFixed(2)}%</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${tierColor(c.tierIndex)}`}>
                              {c.tierLabel}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-right text-white/70">{c.ratePct.toFixed(2)}%</td>
                          <td className="py-1.5 px-3 text-right font-extrabold text-emerald-300">
                            {c.commission > 0 ? fmtBaht2(c.commission) : "–"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#0c3123]/90 font-bold text-white border-t border-emerald-500/30">
                        <td className="py-2 px-3">รวม</td>
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3 text-right">{fmtBaht(staff.totalActual)}</td>
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3 text-right text-emerald-300">
                          {fmtBaht2(staff.totalCommission)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ตาราง Scheme อ้างอิง */}
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <h3 className="text-base font-bold tracking-tight text-white mb-3">
          {band.label}
          {newScheme ? <span className="text-emerald-300 text-xs ml-2">· New Scheme (iPad/iPhone)</span> : null}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-emerald-500/10">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
                <th className="py-2 px-3 font-bold uppercase tracking-wider">% ach step</th>
                {COMMISSION_CATEGORIES.map((c) => (
                  <th key={c} className="py-2 px-3 font-bold uppercase tracking-wider text-right">
                    {SCHEME_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
              {COMMISSION_TIERS.map((tier, i) => (
                <tr key={tier.label} className="text-white/90">
                  <td className="py-1.5 px-3 font-bold">{tier.label}</td>
                  {COMMISSION_CATEGORIES.map((c) => (
                    <td key={c} className="py-1.5 px-3 text-right">
                      {getRate(band, c, i, newScheme).toFixed(2)}%
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="text-white/40">
                <td className="py-1.5 px-3 font-bold">ต่ำกว่า 70%</td>
                {COMMISSION_CATEGORIES.map((c) => (
                  <td key={c} className="py-1.5 px-3 text-right">–</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
