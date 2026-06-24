import { useState, type FormEvent } from "react";
import { Lock, Mail, Loader2, Store } from "lucide-react";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login, configured, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err.message);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061a13] via-[#0c291d] to-[#051710] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061a13] via-[#0c291d] to-[#051710] text-white px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
            <Store className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">iStudio Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Sales Performance & KPI Tracker</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
          {!configured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <strong>Supabase ยังไม่ได้ตั้งค่า</strong>
              <p className="mt-1 text-amber-200/80">
                ใส่ <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_URL</code> และ{" "}
                <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> ใน
                <code className="bg-black/30 px-1 rounded">.env</code> แล้ว restart dev server
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@istudio.co"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                  autoComplete="email"
                  disabled={!configured || submitting}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white/80 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                  autoComplete="current-password"
                  disabled={!configured || submitting}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!configured || submitting}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0a1f17] font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
            <p className="font-semibold text-white/60 mb-1.5">สิทธิ์ผู้ใช้</p>
            <ul className="space-y-0.5">
              <li>
                <span className="text-emerald-300 font-semibold">BSM / ABSM</span> — เข้าถึงได้ทุกหน้า อัปโหลด/แก้ไขได้
              </li>
              <li>
                <span className="text-amber-300 font-semibold">PIA</span> — ดู Staff Profile ของตัวเองเท่านั้น
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-6">
          © {new Date().getFullYear()} iStudio by SPVI · Internal use only
        </p>
      </div>
    </div>
  );
}
