import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm("ออกจากระบบ?")) return;
    setLoading(true);
    await logout();
    setLoading(false);
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title={`Logout ${user?.email ?? ""}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-white/80 hover:text-rose-300 text-xs transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5" />
      )}
      <span>Logout</span>
    </button>
  );
}
