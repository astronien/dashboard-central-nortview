/**
 * ChangePasswordGate — full-screen forced password change screen.
 *
 * Shown when a user with `mustChangePassword=true` tries to access the
 * dashboard. Owns its own form state; calls `changePassword()` from
 * authContext.
 */
import { useState, type FormEvent } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth/authContext";

export default function ChangePasswordGate() {
  const { changePassword, logout, user } = useAuth();
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPwd.length < 6) {
      setError("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (newPwd !== newPwd2) {
      setError("Password ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setChangingPwd(true);
    const result = await changePassword(newPwd);
    setChangingPwd(false);
    if (!result.ok) {
      setError(result.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } else {
      setNewPwd("");
      setNewPwd2("");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a1f17] via-[#051710] to-black p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 mb-3">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">เปลี่ยนรหัสผ่าน</h2>
            <p className="text-xs text-white/50 mt-1">
              สวัสดี {user?.name ?? ""} — กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/70 block mb-1.5">
                Password ใหม่ (≥ 6 ตัวอักษร)
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 pr-10 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80"
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-white/70 block mb-1.5">
                ยืนยัน Password ใหม่
              </label>
              <input
                type={showNewPwd ? "text" : "password"}
                value={newPwd2}
                onChange={(e) => setNewPwd2(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPwd}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-[#0a1f17] font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {changingPwd ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full text-white/50 hover:text-white/80 text-xs py-2"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
