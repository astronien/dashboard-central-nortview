import { ArrowRight, ChevronRight } from "lucide-react";

export type TodayMissionCategory = {
  name: string;
  actual: number;
  units: number;
  target: number;
  ach: number;
};

export type TodayMissionData = {
  revenue: number;
  units: number;
  target: number;
  ach: number;
  mom: number;
  yoy: number;
  categories: TodayMissionCategory[];
  dateStr: string;
};

export function TodayMissionSection({
  todayStats,
  onOpenReports,
  onOpenLeaderboard,
}: {
  todayStats: TodayMissionData;
  onOpenReports: () => void;
  onOpenLeaderboard: () => void;
}) {
  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Category Velocity (ยอดวันนี้รายหมวด)
            </h3>
            <p className="text-xs text-white/50 mt-1">อัตราความสำเร็จและยอดขายจริงประจำวันนี้ของแต่ละประเภทผลิตภัณฑ์</p>
          </div>
        </div>
        <div className="space-y-4">
          {todayStats.categories.map((item) => {
            const isTotal = item.name === "Grand Total";
            const percent = Math.min(item.ach, 140);
            const barColor = isTotal ? "from-amber-500 to-yellow-400" : item.name === "iPhone" ? "from-rose-500 to-red-400" : item.name === "Mac" ? "from-emerald-500 to-teal-400" : item.name === "iPad" ? "from-blue-500 to-indigo-400" : item.name === "Apple Watch" ? "from-purple-500 to-pink-400" : "from-teal-500 to-emerald-400";
            return (
              <div key={item.name} className={`p-4 rounded-2xl border transition-all duration-300 ${isTotal ? "bg-white/10 border-white/10" : "bg-white/5 border-white/5 hover:bg-white/[0.08]"}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${isTotal ? "bg-yellow-400 animate-pulse" : item.name === "iPhone" ? "bg-rose-400" : item.name === "Mac" ? "bg-emerald-400" : item.name === "iPad" ? "bg-blue-400" : item.name === "Apple Watch" ? "bg-purple-400" : "bg-teal-400"}`}></div>
                    <span className={`text-sm font-bold tracking-tight ${isTotal ? "text-white text-base font-black" : "text-white/95"}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
                    <span className="text-white/60">ยอดขายจริง: <strong className="text-white font-extrabold">฿{Math.round(item.actual).toLocaleString()}</strong></span>
                    {!isTotal && <span className="text-white/60">จำนวน: <strong className="text-white font-extrabold">{item.units} Units</strong></span>}
                    <span className="text-white/40">เป้าวัน: ฿{Math.round(item.target).toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.ach >= 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/70"}`}>{item.ach.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/5 p-[1px]">
                  <div className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold tracking-tight text-white">Device Mix & Attach Ratios</h3>
            <span className="text-xs text-white/50">สัดส่วนสินค้าและอัตราการแนบอุปกรณ์วันนี้</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-4 border-b border-white/5 pb-2">Device Mix (สัดส่วนขายวันนี้)</span>
              <div className="space-y-4">
                {todayStats.categories.filter((c) => c.name !== "Grand Total" && c.name !== "3rd Party").map((item) => {
                  const totalCategorySum = todayStats.categories.filter((c) => c.name !== "Grand Total").reduce((acc, c) => acc + c.actual, 0);
                  const share = totalCategorySum ? (item.actual / totalCategorySum) * 100 : 0;
                  return (
                    <div key={item.name} className="flex justify-between items-center text-xs">
                      <span className="text-white/80 font-semibold">{item.name}</span>
                      <span className="font-extrabold text-white text-right">{share.toFixed(1)}% ({item.units} Unit)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block mb-4 border-b border-white/5 pb-2">iPhone Cross Attach Ratio (วันนี้)</span>
              <div className="space-y-4 text-xs text-white/70">
                {(() => {
                  const iphones = todayStats.categories.find((c) => c.name === "iPhone")?.units || 0;
                  const ipads = todayStats.categories.find((c) => c.name === "iPad")?.units || 0;
                  const macs = todayStats.categories.find((c) => c.name === "Mac")?.units || 0;
                  const watches = todayStats.categories.find((c) => c.name === "Apple Watch")?.units || 0;
                  const btb = todayStats.categories.find((c) => c.name === "BTB")?.units || 0;
                  const getRatio = (val: number) => (iphones > 0 ? (val / iphones) * 100 : 0);
                  return (
                    <div className="space-y-3.5">
                      <div className="flex justify-between"><span className="font-semibold text-white/80">iPad / iPhone</span><strong className="text-white font-extrabold">{getRatio(ipads).toFixed(1)}%</strong></div>
                      <div className="flex justify-between"><span className="font-semibold text-white/80">Mac / iPhone</span><strong className="text-white font-extrabold">{getRatio(macs).toFixed(1)}%</strong></div>
                      <div className="flex justify-between"><span className="font-semibold text-white/80">Apple Watch / iPhone</span><strong className="text-white font-extrabold">{getRatio(watches).toFixed(1)}%</strong></div>
                      <div className="flex justify-between"><span className="font-semibold text-white/80">BTB / iPhone</span><strong className="text-white font-extrabold">{getRatio(btb).toFixed(1)}%</strong></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-4 text-white">Quick Links (The Flash)</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold">
              <a href="https://candy-five-pearl.vercel.app/" target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl block text-white/85 hover:text-white hover:border-emerald-400/30 hover:scale-[1.03] transition-all cursor-pointer">ASM Master</a>
              <button onClick={onOpenReports} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl block text-white/85 hover:text-white hover:border-emerald-400/30 hover:scale-[1.03] transition-all cursor-pointer">Sync Portal</button>
              <button onClick={onOpenLeaderboard} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl block text-white/85 hover:text-white hover:border-emerald-400/30 hover:scale-[1.03] transition-all cursor-pointer">Leaderboard</button>
              <a href="https://studio7thailand.com" target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl block text-white/85 hover:text-white hover:border-emerald-400/30 hover:scale-[1.03] transition-all cursor-pointer">Studio 7</a>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/40 text-center">ASM MASTER Hybrid Data Hub v3.5</div>
        </div>
      </div>
    </>
  );
}
