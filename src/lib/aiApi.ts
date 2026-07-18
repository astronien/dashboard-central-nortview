// Client for /api/ai-analysis config (multi-provider LLM settings).

export type AiProvider = "anthropic" | "gemini" | "openai";

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  openai: "ChatGPT (OpenAI)",
};

export interface AiConfigStatus {
  provider: AiProvider;
  hasKey: boolean;
  model: string;
  source: "settings" | "env" | "none";
  updatedAt: string | null;
  updatedBy: string | null;
  defaultModels: Record<AiProvider, string>;
}

export async function getAiConfigStatus(): Promise<AiConfigStatus | undefined> {
  try {
    const res = await fetch("/api/ai-analysis?resource=config");
    if (!res.ok) return undefined;
    return (await res.json()) as AiConfigStatus;
  } catch {
    return undefined;
  }
}

export async function saveAiConfig(input: {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  updatedBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/ai-analysis?resource=config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
