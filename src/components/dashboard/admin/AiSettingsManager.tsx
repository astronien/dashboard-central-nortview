import React from "react";
import { Sparkles, Save, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import {
  getAiConfigStatus,
  saveAiConfig,
  AI_PROVIDER_LABEL,
  type AiProvider,
  type AiConfigStatus,
} from "../../../lib/aiApi";

const KEY_HINT: Record<AiProvider, { url: string; hint: string }> = {
  anthropic: {
    url: "https://console.anthropic.com/settings/keys",
    hint: "console.anthropic.com → API Keys",
  },
  gemini: {
    url: "https://aistudio.google.com/app/apikey",
    hint: "aistudio.google.com → Get API key",
  },
  openai: {
    url: "https://platform.openai.com/api-keys",
    hint: "platform.openai.com → API keys",
  },
};

/**
 * Admin-only: choose which AI provider writes the natural-language daily
 * analysis and paste its API key. Stored server-side (Turso) — the key is
 * never returned to the browser.
 */
export function AiSettingsManager({ updatedBy }: { updatedBy?: string }) {
  const [status, setStatus] = React.useState<AiConfigStatus | undefined>();
  const [provider, setProvider] = React.useState<AiProvider>("anthropic");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    void getAiConfigStatus().then((s) => {
      setStatus(s);
      if (s) setProvider(s.provider);
    });
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const defaultModel = status?.defaultModels?.[provider] ?? "";

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("กรุณากรอก API key");
      setSuccess(null);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await saveAiConfig({
      provider,
      apiKey: apiKey.trim(),
      model: model.trim() || undefined,
      updatedBy,
    });
    setSaving(false);
    if (res.ok) {
      setApiKey("");
      setSuccess(`บันทึกค่าย ${AI_PROVIDER_LABEL[provider]} แล้ว`);
      refresh();
    } else {
      setError(res.error ?? "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-purple-500/20 rounded-xl text-purple-300">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI สำหรับบทวิเคราะห์</h2>
          <p className="text-sm text-white/60 mt-1">
            เลือกค่าย AI และใส่ API key — ใช้เขียนบทวิเคราะห์รายวันเป็นภาษาธรรมชาติ
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 mb-4 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/60">สถานะ:</span>
          {status?.hasKey ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {AI_PROVIDER_LABEL[status.provider]}
              <span className="text-white/40 font-normal">
                · {status.model} · {status.source === "settings" ? "ตั้งจากหน้านี้" : "จาก env"}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
              <AlertCircle className="w-4 h-4" /> ยังไม่ได้ตั้งค่า (ระบบจะใช้บทวิเคราะห์แบบกฎเกณฑ์)
            </span>
          )}
        </div>
        {status?.updatedAt ? (
          <div className="text-[11px] text-white/40 mt-1">
            อัปเดตล่าสุด: {status.updatedAt}
            {status.updatedBy ? ` โดย ${status.updatedBy}` : ""}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[11px] text-white/50 mb-1">ค่าย AI</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            className="w-full bg-[#051710] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          >
            {(Object.keys(AI_PROVIDER_LABEL) as AiProvider[]).map((p) => (
              <option key={p} value={p}>
                {AI_PROVIDER_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-white/50 mb-1">
            โมเดล (เว้นว่างเพื่อใช้ค่าเริ่มต้น: {defaultModel})
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={defaultModel}
            className="w-full bg-[#051710] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`วาง API key ของ ${AI_PROVIDER_LABEL[provider]}`}
            className="w-full bg-[#051710] border border-white/15 rounded-xl pl-9 pr-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-semibold hover:bg-purple-500/30 hover:border-purple-400/60 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-white/45">
        รับ API key ได้ที่:{" "}
        <a
          href={KEY_HINT[provider].url}
          target="_blank"
          rel="noreferrer"
          className="text-purple-300 underline"
        >
          {KEY_HINT[provider].hint}
        </a>
      </p>

      {success ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      ) : null}
    </div>
  );
}
