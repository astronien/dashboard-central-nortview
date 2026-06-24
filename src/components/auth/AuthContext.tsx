import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentSession, login as loginSvc, logout as logoutSvc } from "../../lib/auth";
import { isSupabaseConfigured, getSupabaseClient } from "../../lib/supabaseClient";
import type { AuthError, SessionUser } from "../../lib/authTypes";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<AuthError | null>;
  logout: () => Promise<AuthError | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;

    const init = async () => {
      if (!isSupabaseConfigured()) {
        if (mounted) setLoading(false);
        return;
      }
      const client = getSupabaseClient();
      if (!client) {
        if (mounted) setLoading(false);
        return;
      }

      const { user: initialUser } = await getCurrentSession();
      if (mounted) setUser(initialUser);

      const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        const next = session?.user ?? null;
        const meta = next?.user_metadata;
        const role = (meta && typeof meta === "object"
          ? (meta as Record<string, unknown>).role
          : null);
        if (role === "bsm" || role === "absm" || role === "pia") {
          setUser({
            id: next.id,
            email: next.email ?? "",
            role: role as SessionUser["role"],
            staffId: typeof meta?.staff_id === "string" ? (meta.staff_id as string) : null,
            name: typeof meta?.name === "string" ? (meta.name as string) : null,
            branch: typeof meta?.branch === "string" ? (meta.branch as string) : null,
          });
        } else {
          setUser(null);
        }
      });
      unsub = () => sub.subscription.unsubscribe();

      if (mounted) setLoading(false);
    };

    void init();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured(),
      login: async (email, password) => {
        const { user: u, error } = await loginSvc(email, password);
        if (u) setUser(u);
        return error;
      },
      logout: async () => {
        const err = await logoutSvc();
        setUser(null);
        return err;
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
};
