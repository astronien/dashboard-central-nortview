/**
 * Session token — base64-encoded JSON stored in localStorage.
 *
 * Token is NOT cryptographically signed (browser-side only, no server).
 * For internal-tool use, this is sufficient to gate UI without trusting
 * the client.
 *
 * IMPORTANT: we use `TextEncoder` + manual byte-to-binary-string to encode
 * UTF-8 strings. Plain `btoa(JSON.stringify(...))` throws on non-Latin1
 * characters (e.g. Thai names like "ฟารีดา มะโนรัตน์") which broke PIA login.
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

/**
 * Encode a string into base64 — safe for UTF-8 (works with Thai, emoji, etc.).
 * Uses `String.fromCharCode` + `btoa` to handle the multi-byte UTF-8 byte sequence.
 */
function utf8ToBase64(s: string): string {
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(s);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  // Fallback for older environments (Node test without TextEncoder)
  return btoa(unescape(encodeURIComponent(s)));
}

function base64ToUtf8(b64: string): string {
  try {
    const binary = atob(b64);
    if (typeof TextDecoder !== "undefined") {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
    // Fallback
    return decodeURIComponent(escape(binary));
  } catch {
    return "";
  }
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  return utf8ToBase64(JSON.stringify(full));
}

export function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const raw = base64ToUtf8(token);
    if (!raw) return null;
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
