import React from "react";
import { ShieldCheck } from "lucide-react";

export type AttachQuotaStatus = "pass" | "accumulating" | "handoff";

export type AttachQuotaRow = {
  name: string;
  branch: string;
  iphone: number;
  cover: number;
  ufund: number;
  attach: number;
  /** 4 × Attach − iPhone (สะสมทั้งเดือน) */
  remaining: number;
  status: AttachQuotaStatus;
};

export type AttachQuotaData = {
  rows: AttachQuotaRow[];
  /** ช่วงข้อมูล (วันแรก–วันล่าสุดในไฟล์) */
  fromDate: string;
  toDate: string;
  /** จำนวนพนักงานที่ต้องส่งต่อ (status = handoff) */
  handoffCount: number;
  recipient: { name: string; remaining: number } | null;
};

const fmtDay = (ymd: string): string => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

export const AttachQuotaSection: React.FC<{ data: AttachQuotaData }> = ({ data }) => {
  if (!data.rows.length) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-emerald-300" />
        <h3 className="text-lg font-bold tracking-tight text-white">
          โควตา Attach สะสม — Cover/UFUND ต่อ iPhone (1:4)
        </h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        สะสมทั้งเดือน {fmtDay(data.fromDate)}–{fmtDay(data.toDate)} · ต้องแนบ Cover หรือ UFUND อย่างน้อย 1 ต่อ iPhone 4 เครื่อง ·
        สิทธิ์คงเหลือ = 4×Attach − iPhone · ครบบล็อก 4 เครื่องแล้วไม่มี attach → ต้องส่งต่อ (แนบ 1 = ได้คืน 4)
      </p>

      <div className="overflow-x-auto rounded-xl border border-emerald-500/10">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider">พนักงาน</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">iPhone สะสม</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Cover</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">UFUND</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Attach</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">สิทธิ์คงเหลือ</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
            {data.rows.map((r, idx) => {
              const remClass =
                r.remaining > 0 ? "text-emerald-400" : r.remaining >= -3 ? "text-amber-300" : "text-rose-400";
              return (
                <tr key={idx} className="hover:bg-white/5 transition-colors duration-150 text-white/90">
                  <td className="py-2 px-3 font-bold whitespace-nowrap">{r.name}</td>
                  <td className="py-2 px-3 text-right font-semibold">{r.iphone.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-white/70">{r.cover.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-white/70">{r.ufund.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-semibold">{r.attach.toLocaleString()}</td>
                  <td className={`py-2 px-3 text-right font-extrabold ${remClass}`}>
                    {r.remaining > 0 ? `+${r.remaining}` : r.remaining}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {r.status === "pass" ? (
                      <span className="text-emerald-400 font-semibold">✅ ผ่าน</span>
                    ) : r.status === "accumulating" ? (
                      <span className="text-amber-300 font-semibold">
                        🟡 กำลังสะสม (อีก {4 + r.remaining} ครบบล็อก)
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">🔴 ต้องส่งต่อ</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
        {data.handoffCount > 0 ? (
          <span className="text-white/90">
            ต้องส่งต่อ{" "}
            <span className="font-extrabold text-rose-300">{data.handoffCount}</span> คน
            {data.recipient ? (
              <>
                {" "}· แนะนำยกเครื่องเปล่าให้{" "}
                <span className="font-extrabold text-emerald-300">{data.recipient.name}</span>{" "}
                <span className="text-white/50">(สิทธิ์เหลือ +{data.recipient.remaining})</span>
              </>
            ) : (
              <span className="text-white/50"> · ยังไม่มีคนที่สิทธิ์เหลือพอจะรับช่วง</span>
            )}
          </span>
        ) : (
          <span className="text-emerald-300 font-semibold">ทุกคนอยู่ในเกณฑ์ ไม่มีใครต้องส่งต่อ 🎉</span>
        )}
      </div>
    </div>
  );
};
