/**
 * LoginPage — full-screen branded login form.
 *
 * Background: gradient green/black matching the dashboard theme.
 * Card: glassmorphism centered. Submits to useAuth().login.
 */
import { useState, type FormEvent } from "react";
import { Lock, LogIn, ShieldCheck, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth/authContext";
import { isTursoConfigured } from "../lib/auth/tursoClient";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1f17] via-[#051710] to-black p-4 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Studio 7 Sales
          </h1>
          <p className="text-sm text-white/50 mt-1">Dashboard · Login</p>
        </div>

        {/* Login card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/70 block mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  placeholder="เช่น admin หรือ emp_id"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/70 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-2.5 text-sm text text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-[#0a1f17] font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0a1f17]/40 border-t-[#0a1f17] rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          {!isTursoConfigured() && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              ⚠️ Turso ยังไม่ได้ตั้งค่า — ใส่ VITE_TURSO_DATABASE_URL และ VITE_TURSO_AUTH_TOKEN ใน .env
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-white/40 text-center">
            <p>
              สำหรับผู้ดูแล: <span className="text-white/60">admin</span> / <span className="text-white/60">admin123</span>
            </p>
            <p className="mt-1">
              สำหรับ PIA: <span className="text-white/60">emp_id</span> / <span className="text-white/60">emp_id</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/30 mt-6">
          Internal tool · Studio7 Sales Dashboard
        </p>
      </div>
    </div>
  );
}
