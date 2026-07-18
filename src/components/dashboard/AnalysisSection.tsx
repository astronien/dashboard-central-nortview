import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Lightbulb,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { CombinedOfficerKpiData } from "./HomeDashboardSection";
import {
  analyzeStore,
  analysisToText,
  type OfficerAnalysis,
  type Severity,
} from "../../lib/dailyAnalysis";

const sevText: Record<Severity, string> = {
  good: "text-green-400",
  watch: "text-amber-400",
  weak: "text-orange-400",
  critical: "text-rose-400",
};

const gradeBadge = (grade: string): string => {
  switch (grade) {
    case "A":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "B":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "C":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  }
};

function OfficerCard({ o }: { o: OfficerAnalysis }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${
        o.critical
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-white/10 bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white truncate">{o.name}</h3>
            {o.critical ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3" /> วิกฤติ
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-white/50 truncate">{o.branch || "-"}</p>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-bold ${gradeBadge(o.grade)}`}
          >
            {o.grade}
            <span className="text-[11px] font-semibold tabular-nums">
              {o.overallPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <p className="mb-3 text-[12px] leading-snug text-white/85 bg-black/20 border border-white/10 rounded-lg px-3 py-2">
        <span className="text-amber-400">💡 </span>
        {o.insight}
      </p>

      {o.strengths.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          {o.strengths.map((s) => (
            <span
              key={s.label}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-300 border border-green-500/20"
            >
              {s.label} {s.achievePct.toFixed(0)}%
            </span>
          ))}
        </div>
      ) : null}

      {o.weaknesses.length > 0 ? (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-white/60">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> จุดที่อ่อน
          </div>
          <div className="flex flex-wrap gap-1.5">
            {o.weaknesses.slice(0, 6).map((w) => (
              <span
                key={w.label}
                className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 ${sevText[w.severity]}`}
                title={w.detail}
              >
                {w.label} · {w.achievePct.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-3 text-[11px] text-green-300/80">
          ทำได้ตามเป้าทุกด้าน 👍
        </p>
      )}

      {o.recommendations.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-white/60">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> คำแนะนำ
          </div>
          <ul className="space-y-1">
            {o.recommendations.map((r, i) => (
              <li key={i} className="text-[11px] text-white/80 leading-snug flex gap-1.5">
                <span className="text-amber-400 shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {o.critical && o.actionPlan.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> แผนแก้ไขด่วน (Action Plan)
          </div>
          <ol className="space-y-1">
            {o.actionPlan.map((a, i) => (
              <li key={i} className="text-[11px] text-rose-100/90 leading-snug">
                {a}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function AnalysisSection({
  combinedOfficerKpiData,
  dateLabel,
  onSendTelegram,
}: {
  combinedOfficerKpiData?: CombinedOfficerKpiData;
  dateLabel?: string;
  /** Sends the plain-text analysis to Telegram; returns ok/err */
  onSendTelegram?: (text: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [sendState, setSendState] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [sendMsg, setSendMsg] = React.useState("");
  const [aiText, setAiText] = React.useState<string | null>(null);
  const [aiState, setAiState] = React.useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [aiMsg, setAiMsg] = React.useState("");

  const store = React.useMemo(() => {
    if (!combinedOfficerKpiData || combinedOfficerKpiData.rows.length === 0)
      return null;
    return analyzeStore(
      combinedOfficerKpiData,
      dateLabel || new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
    );
  }, [combinedOfficerKpiData, dateLabel]);

  // Regenerating cards should invalidate a stale AI narrative
  React.useEffect(() => {
    setAiText(null);
    setAiState("idle");
  }, [store]);

  const generateAi = async () => {
    if (!store) return;
    setAiState("loading");
    setAiMsg("");
    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: analysisToText(store),
          dateLabel: store.dateLabel,
        }),
      });
      const data = await res.json();
      if (data.ok && data.text) {
        setAiText(data.text);
        setAiState("done");
      } else {
        setAiState("error");
        setAiMsg(data.error ?? "สร้างด้วย AI ไม่สำเร็จ");
      }
    } catch (e) {
      setAiState("error");
      setAiMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSend = async () => {
    if (!store || !onSendTelegram) return;
    setSendState("sending");
    setSendMsg("");
    // Prefer the AI narrative if it's been generated
    const res = await onSendTelegram(aiText || analysisToText(store));
    if (res.ok) {
      setSendState("sent");
    } else {
      setSendState("error");
      setSendMsg(res.error ?? "ส่งไม่สำเร็จ");
    }
    setTimeout(() => setSendState("idle"), 6000);
  };

  if (!store) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-10 text-center">
        <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">
          ยังไม่มีข้อมูลพอสำหรับวิเคราะห์ — กรุณาอัปโหลดไฟล์ Current/Target ที่หน้ารายงาน
        </p>
      </div>
    );
  }

  const sorted = [...store.officers].sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return a.overallPct - b.overallPct;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header + summary */}
      <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                บทวิเคราะห์รายวัน
              </h2>
              <p className="text-[11px] text-white/50">
                สรุปหลังปิดร้าน — จุดอ่อนรายคน คำแนะนำ และแผนแก้ไขเมื่อวิกฤติ · {store.dateLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => void generateAi()}
            disabled={aiState === "loading"}
            title={aiMsg}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              aiState === "error"
                ? "bg-rose-500/15 border border-rose-400/30 text-rose-200"
                : "bg-purple-500/15 border border-purple-400/30 text-purple-200 hover:bg-purple-500/25"
            }`}
          >
            {aiState === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {aiState === "loading"
              ? "กำลังเขียน…"
              : aiText
                ? "เขียนใหม่ด้วย AI"
                : "เขียนด้วย AI"}
          </button>
          {onSendTelegram ? (
            <button
              onClick={() => void handleSend()}
              disabled={sendState === "sending"}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 ${
                sendState === "sent"
                  ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200"
                  : sendState === "error"
                    ? "bg-rose-500/15 border border-rose-400/30 text-rose-200"
                    : "bg-sky-500/15 border border-sky-400/30 text-sky-200 hover:bg-sky-500/25"
              }`}
              title={sendMsg}
            >
              {sendState === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : sendState === "sent" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendState === "sending"
                ? "กำลังส่ง…"
                : sendState === "sent"
                  ? "ส่งแล้ว"
                  : sendState === "error"
                    ? "ลองใหม่"
                    : "ส่งไป Telegram"}
            </button>
          ) : null}
          </div>
        </div>

        {aiState === "error" ? (
          <p className="mb-3 text-[12px] text-rose-300">{aiMsg}</p>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {store.summary.map((s, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-[13px] leading-snug ${
                s.startsWith("⚠️")
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-100/90 sm:col-span-2"
                  : "border-white/10 bg-black/20 text-white/80"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* AI narrative (natural language) */}
      {aiText ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] border border-purple-400/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                บทวิเคราะห์ (เรียบเรียงด้วย AI)
              </h2>
              <p className="text-[11px] text-white/50">
                เขียนจากตัวเลขจริงในบทวิเคราะห์ด้านล่าง — ตรวจทานก่อนใช้งานจริง
              </p>
            </div>
          </div>
          <div className="text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap">
            {aiText}
          </div>
        </div>
      ) : null}

      {/* Per-officer cards (critical first) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((o, i) => (
          <OfficerCard key={`${o.name}-${i}`} o={o} />
        ))}
      </div>
    </div>
  );
}
