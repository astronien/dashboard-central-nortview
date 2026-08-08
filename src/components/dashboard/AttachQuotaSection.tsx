import React from "react";
import { ShieldCheck } from "lucide-react";

export type AttachQuotaRow = {
  name: string;
  branch: string;
  iphone: number;
  cover: number;
  ufund: number;
  attach: number;
  /** 4 × attach − iphone (บวก = ขายได้อีก, ลบ = เกินสัดส่วน) */
  remaining: number;
  /** ผ่านเกณฑ์ 25% ของวันนี้ (4×attach ≥ iphone) */
  passToday: boolean;
  /** วันนี้อยู่ในโหมดส่งต่อ (เพราะเมื่อวานไม่ผ่าน) */
  inPenalty: boolean;
  /** อยู่ในโหมดส่งต่อ แต่วันนี้แนบได้แล้ว → หลุดโหมด */
  clearedToday: boolean;
  /** จำนวนเครื่องเปล่าที่ต้องส่งต่อวันนี้ (ก่อนแนบครั้งแรก) */
  handoffToday: number;
  /** วันนี้ไม่ผ่าน → พรุ่งนี้จะเข้าโหมดส่งต่อ */
  owesTomorrow: boolean;
};

export type AttachQuotaData = {
  rows: AttachQuotaRow[];
  latestDate: string;
  prevDate: string;
  totalHandoff: number;
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
          โควตา Attach รายวัน — Cover/UFUND ต่อ iPhone (1:4)
        </h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        ข้อมูลวันล่าสุด {fmtDay(data.latestDate)} · ต้องแนบ Cover หรือ UFUND อย่างน้อย 1 ต่อ iPhone 4 เครื่อง (25%) ·
        สิทธิ์คงเหลือ = 4×Attach − iPhone · "ส่งต่อ" = ภาระข้ามวัน (เมื่อวานแนบไม่ครบ → วันนี้เครื่องเปล่าก่อนแนบครั้งแรกต้องยกให้คนอื่น)
      </p>

      <div className="overflow-x-auto rounded-xl border border-emerald-500/10">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0c3123] border-b border-emerald-500/20 text-white/90">
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider">พนักงาน</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">iPhone</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Cover</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">UFUND</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Attach</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">สิทธิ์คงเหลือ</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">โหมดวันนี้ (ค้างจากเมื่อวาน)</th>
              <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">แนวโน้มพรุ่งนี้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 bg-[#052b20]/60">
            {data.rows.map((r, idx) => {
              const remClass =
                r.remaining > 0 ? "text-emerald-400" : r.remaining === 0 ? "text-white/80" : "text-rose-400";
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
                    {r.inPenalty ? (
                      r.clearedToday ? (
                        <span className="text-emerald-400 font-semibold">✅ เคลียร์แล้ว (แนบได้)</span>
                      ) : (
                        <span className="text-rose-400 font-bold">🔴 ส่งต่อ {r.handoffToday} เครื่อง</span>
                      )
                    ) : (
                      <span className="text-white/40">ปกติ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {r.owesTomorrow ? (
                      <span className="text-amber-400 font-semibold">⚠️ เข้าโหมดส่งต่อ</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">✅ ผ่าน</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
        {data.totalHandoff > 0 ? (
          <span className="text-white/90">
            วันนี้ต้องส่งต่อรวม{" "}
            <span className="font-extrabold text-rose-300">{data.totalHandoff}</span> เครื่อง
            {data.recipient ? (
              <>
                {" "}· แนะนำยกให้{" "}
                <span className="font-extrabold text-emerald-300">{data.recipient.name}</span>{" "}
                <span className="text-white/50">(สิทธิ์เหลือ +{data.recipient.remaining})</span>
              </>
            ) : (
              <span className="text-white/50"> · ไม่มีคนที่สิทธิ์เหลือพอจะรับช่วง</span>
            )}
          </span>
        ) : (
          <span className="text-emerald-300 font-semibold">วันนี้ไม่มีเครื่องต้องส่งต่อ 🎉</span>
        )}
      </div>
    </div>
  );
};
