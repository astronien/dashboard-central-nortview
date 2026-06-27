import React, { useEffect, useState } from "react";
import { Plus, Trash2, Power, PowerOff, RefreshCw, Users } from "lucide-react";
import { lineUserApi, type LineAllowlistUser } from "../../../lib/lineUserApi";

const ROLES: LineAllowlistUser["role"][] = ["BSM", "Asst.BSM"];

export function LineUserManager() {
  const [users, setUsers] = useState<LineAllowlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // New user form state
  const [form, setForm] = useState({
    lineUserId: "",
    displayName: "",
    role: "BSM" as LineAllowlistUser["role"],
    branchId: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await lineUserApi.list();
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lineUserId || !form.displayName || !form.branchId) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // addedBy defaults to "admin" for now — in production this
      // would come from the session
      await lineUserApi.add({
        ...form,
        addedBy: "admin",
      });
      setForm({ lineUserId: "", displayName: "", role: "BSM", branchId: "" });
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: LineAllowlistUser) => {
    try {
      await lineUserApi.update(u.lineUserId, { isActive: !u.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (u: LineAllowlistUser) => {
    if (!confirm(`ลบ ${u.displayName} ออกจาก allowlist?`)) return;
    try {
      await lineUserApi.remove(u.lineUserId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Users className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">LINE Bot Users</h2>
            <p className="text-xs text-white/60">ผู้ใช้ LINE ที่ได้รับอนุญาตให้อัปโหลดไฟล์ยอดขาย</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
            title="รีเฟรช"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">LINE User ID</label>
              <input
                type="text"
                value={form.lineUserId}
                onChange={(e) => setForm({ ...form, lineUserId: e.target.value })}
                placeholder="U1234567890abcdef"
                className="w-full px-3 py-2 rounded-lg bg-[#051710] border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="สมชาย ใจดี"
                className="w-full px-3 py-2 rounded-lg bg-[#051710] border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">ตำแหน่ง</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as LineAllowlistUser["role"] })}
                className="w-full px-3 py-2 rounded-lg bg-[#051710] border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">สาขา (Branch ID)</label>
              <input
                type="text"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                placeholder="645"
                className="w-full px-3 py-2 rounded-lg bg-[#051710] border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#051710] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="text-center text-white/50 py-6 text-sm">กำลังโหลด...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-white/40 py-6 text-sm">ยังไม่มีผู้ใช้ใน allowlist</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">LINE User ID</th>
                <th className="text-left px-3 py-2 font-medium">ชื่อ</th>
                <th className="text-left px-3 py-2 font-medium">ตำแหน่ง</th>
                <th className="text-left px-3 py-2 font-medium">สาขา</th>
                <th className="text-left px-3 py-2 font-medium">สถานะ</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.lineUserId} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-white/80">{u.lineUserId}</td>
                  <td className="px-3 py-2 text-white">{u.displayName}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs ${
                      u.role === "BSM" ? "bg-amber-500/20 text-amber-200" : "bg-blue-500/20 text-blue-200"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/80">{u.branchId}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs ${
                      u.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                    }`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleToggle(u)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 transition-colors"
                        title={u.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      >
                        {u.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
