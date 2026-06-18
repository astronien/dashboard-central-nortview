import type { PresetResult } from "../../lib/presetTypes";
import { formatPresetValue } from "../../lib/presetEngine";

interface KpiPresetRowProps {
  results: PresetResult[];
}

const colorMap: Record<string, { border: string; text: string; bg: string }> = {
  green: { border: "border-emerald-500", text: "text-emerald-300", bg: "bg-white/5" },
  amber: { border: "border-amber-500", text: "text-amber-300", bg: "bg-white/5" },
  blue: { border: "border-blue-500", text: "text-blue-300", bg: "bg-white/5" },
  teal: { border: "border-teal-500", text: "text-teal-300", bg: "bg-white/5" },
  purple: { border: "border-purple-500", text: "text-purple-300", bg: "bg-white/5" },
  coral: { border: "border-orange-500", text: "text-orange-300", bg: "bg-white/5" },
};

function PresetValue({
  result,
  colors,
}: {
  result: PresetResult;
  colors: { text: string };
}) {
  const ct = result.calcType;
  if (ct === "baht" || ct === "catBaht") {
    return (
      <>
        <p className={`text-2xl font-bold ${colors.text} mb-1`}>
          ฿{Math.round(result.totalBaht || 0).toLocaleString("th-TH")}
        </p>
        <p className="text-xs text-emerald-400 font-bold">บาท</p>
      </>
    );
  }
  if (ct === "unit" || ct === "catQty") {
    return (
      <>
        <p className={`text-2xl font-bold ${colors.text} mb-1`}>
          {(result.billsWithAandB || 0).toLocaleString("th-TH")}
        </p>
        <p className="text-xs text-emerald-400 font-bold">ชิ้น</p>
      </>
    );
  }
  if (ct === "bahtRate") {
    return (
      <>
        <p className={`text-2xl font-bold ${colors.text} mb-1`}>
          {result.totalBahtB === 0 ? "ไม่มีข้อมูล" : `${result.bahtRate.toFixed(1)}%`}
        </p>
        <p className="text-xs text-emerald-400 font-bold">
          ฿{Math.round(result.totalBaht || 0).toLocaleString("th-TH")}
          {" / "}
          ฿{Math.round(result.totalBahtB || 0).toLocaleString("th-TH")}
        </p>
      </>
    );
  }
  return (
    <>
      <p className={`text-2xl font-bold ${colors.text} mb-1`}>
        {result.billsWithB === 0 ? "ไม่มีข้อมูล" : `${result.attachRate.toFixed(1)}%`}
      </p>
      <p className="text-xs text-emerald-400 font-bold">
        {result.billsWithAandB}/{result.billsWithB} ชิ้น
      </p>
    </>
  );
}

export default function KpiPresetRow({ results }: KpiPresetRowProps) {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {results.map((result) => {
        const colors = colorMap[result.color] || colorMap.blue;
        return (
          <div
            key={result.presetId}
            className={`${colors.bg} rounded-2xl border-l-4 ${colors.border} border border-white/10 p-4 shadow-lg min-w-[200px] hover:bg-white/10 transition`}
          >
            <p className="text-sm font-medium text-white/80 mb-1">{result.presetName}</p>
            <PresetValue result={result} colors={colors} />
            <p className="text-[10px] text-white/40 mt-1">
              {formatPresetValue(result)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
