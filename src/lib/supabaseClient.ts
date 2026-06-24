/**
 * Supabase client singleton.
 *
 * Configure via Vite env variables:
 * - VITE_SUPABASE_URL      (e.g. https://xxx.supabase.co)
 * - VITE_SUPABASE_ANON_KEY (anon/public key from Supabase Dashboard)
 *
 * If env variables are missing, the app falls back to a "no-op" client that
 * surfaces a configuration error to the user.  Auth is required to access
 * any view, so the LoginPage will guide them to set env vars.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env?.[key] ?? "";
  } catch {
    return "";
  }
};

const SUPABASE_URL = getEnv("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
};

let _client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        storageKey: "studio7.auth",
      },
    });
  }
  return _client;
};
