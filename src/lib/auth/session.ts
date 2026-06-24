/**
 * Session token — base64-encoded JSON stored in localStorage.
 *
 * Token is NOT cryptographically signed (browser-side only, no server).
 * For internal-tool use, this is sufficient to gate UI without trusting
 * the client.
 */
import type { Role } from "./users";

const SESSION_KEY = "studio7_auth_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionPayload = {
  userId: number;
  username: string;
  role: Role;
  name: string;
  exp: number;
};

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  return btoa(JSON.stringify(full));
}

export function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const raw = atob(token);
    const parsed = JSON.parse(raw) as SessionPayload;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(SESSION_KEY);
  if (!token) return null;
  const payload = decodeSessionToken(token);
  if (!payload) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return payload;
}

export function writeSession(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, token);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
