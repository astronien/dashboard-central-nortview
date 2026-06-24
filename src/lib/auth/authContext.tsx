/**
 * AuthContext — provides current user, login, logout, and lockout state.
 *
 * Wrap the app in <AuthProvider> and use useAuth() to access the
 * current user, role, and actions.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getUserById,
  updateLastLogin,
  updatePassword,
  verifyPassword,
  type Role,
  type User,
} from "./users";
import {
  clearSession,
  createSessionToken,
  readSession,
  writeSession,
  type SessionPayload,
} from "./session";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 60 * 1000;
const ATTEMPT_KEY = "studio7_login_attempts";

type AttemptState = {
  count: number;
  firstAt: number;
};

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  isAdmin: boolean;
  isPia: boolean;
  role: Role | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAttempts(): AttemptState {
  if (typeof window === "undefined") return { count: 0, firstAt: 0 };
  const raw = window.localStorage.getItem(ATTEMPT_KEY);
  if (!raw) return { count: 0, firstAt: 0 };
  try {
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, firstAt: 0 };
  }
}

function writeAttempts(state: AttemptState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ATTEMPT_KEY, JSON.stringify(state));
}

function clearAttempts(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ATTEMPT_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRanRef = useRef(false);

  // Bootstrap from stored session
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    const session = readSession();
    if (!session) {
      setLoading(false);
      return;
    }
    getUserById(session.userId)
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        clearSession();
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim();
    if (!trimmed || !password) {
      return { ok: false, error: "กรุณากรอก Username และ Password" };
    }

    // Lockout check
    const attempts = readAttempts();
    if (
      attempts.count >= LOCKOUT_THRESHOLD &&
      Date.now() - attempts.firstAt < LOCKOUT_WINDOW_MS
    ) {
      const waitSec = Math.ceil(
        (LOCKOUT_WINDOW_MS - (Date.now() - attempts.firstAt)) / 1000,
      );
      return {
        ok: false,
        error: `ลองผิดหลายครั้งเกินไป กรุณารอ ${waitSec} วินาที`,
      };
    }

    let lookup;
    try {
      const { getUserByUsername } = await import("./users");
      lookup = await getUserByUsername(trimmed);
    } catch (e) {
      console.error("Login DB error:", e);
      return { ok: false, error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่" };
    }

    if (!lookup) {
      // Bump attempt count
      const next: AttemptState =
        attempts.count === 0 || Date.now() - attempts.firstAt > LOCKOUT_WINDOW_MS
          ? { count: 1, firstAt: Date.now() }
          : { count: attempts.count + 1, firstAt: attempts.firstAt };
      writeAttempts(next);
      return { ok: false, error: "Username หรือ Password ไม่ถูกต้อง" };
    }

    const ok = await verifyPassword(password, lookup.salt, lookup.passwordHash);
    if (!ok) {
      const next: AttemptState =
        attempts.count === 0 || Date.now() - attempts.firstAt > LOCKOUT_WINDOW_MS
          ? { count: 1, firstAt: Date.now() }
          : { count: attempts.count + 1, firstAt: attempts.firstAt };
      writeAttempts(next);
      return { ok: false, error: "Username หรือ Password ไม่ถูกต้อง" };
    }

    // Success
    clearAttempts();
    const token = createSessionToken({
      userId: lookup.user.id,
      username: lookup.user.username,
      role: lookup.user.role,
      name: lookup.user.name,
    });
    writeSession(token);
    await updateLastLogin(lookup.user.id).catch(() => {});
    setUser(lookup.user);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    clearAttempts();
    setUser(null);
  }, []);

  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!user) return { ok: false, error: "ไม่ได้ล็อกอิน" };
      if (!newPassword || newPassword.length < 6) {
        return { ok: false, error: "Password ต้องมีอย่างน้อย 6 ตัวอักษร" };
      }
      try {
        await updatePassword(user.id, newPassword);
        const refreshed = await getUserById(user.id);
        if (refreshed) setUser(refreshed);
        return { ok: true };
      } catch (e) {
        console.error("changePassword error:", e);
        return { ok: false, error: "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
      }
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      changePassword,
      isAdmin: user?.role === "admin",
      isPia: user?.role === "pia",
      role: user?.role ?? null,
    }),
    [user, loading, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export type { SessionPayload };
