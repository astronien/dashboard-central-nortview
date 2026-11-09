import React from "react";
import { Lock, KeyRound, Loader2, ShieldCheck, LogOut } from "lucide-react";
import { fetchHasPin, lockSettings, setPin, verifyPin } from "../../lib/settingsPin";

/** ช่องกรอกรหัสตัวเลข */
function PinInput({
  value,
  onChange,
  autoFocus,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={8}
      autoFocus={autoFocus}
      placeholder={placeholder ?? "••••"}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="w-full text-center tracking-[0.5em] text-2xl font-semibold bg-[#051710] border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400"
    />
  );
}

/**
 * ล็อกหน้าตั้งค่าด้วยรหัส — ครั้งแรก (ยังไม่มีรหัส) ให้ตั้งรหัสใหม่
 * ปลดล็อกได้เฉพาะรอบที่อยู่ในหน้านี้ — ออกไปเมนูอื่นแล้วกลับมาต้องใส่ใหม่
 */
export function SettingsGate({ updatedBy, children }: { updatedBy?: string; children: React.ReactNode }) {
  // ล็อกใหม่ทุกครั้งที่เข้าหน้าตั้งค่า (ออกไปเมนูอื่นแล้วกลับมา = ต้องใส่รหัส)
  const [unlocked, setUnlocked] = React.useState(false);
  const [hasPin, setHasPin] = React.useState<boolean | null | undefined>(undefined);
  const [pin, setPinValue] = React.useState("");
  const [pin2, setPin2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!unlocked) void fetchHasPin().then(setHasPin);
  }, [unlocked]);

  if (unlocked) {
    return (
      <>
        {children}
        <ChangePinPanel
          updatedBy={updatedBy}
          onLock={() => {
            lockSettings();
            setUnlocked(false);
          }}
        />
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (hasPin === false) {
      if (!/^\d{4,8}$/.test(pin)) return setErr("รหัสต้องเป็นตัวเลข 4–8 หลัก");
      if (pin !== pin2) return setErr("รหัสสองช่องไม่ตรงกัน");
      setBusy(true);
      const r = await setPin("", pin, updatedBy);
      setBusy(false);
      if (!r.ok) return setErr(r.error ?? "ตั้งรหัสไม่สำเร็จ");
      setUnlocked(true);
      return;
    }
    if (!pin) return;
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (!ok) {
      setErr("รหัสไม่ถูกต้อง");
      setPinValue("");
      return;
    }
    setUnlocked(true);
  };

  return (
    <div className="flex justify-center py-16">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm bg-white/10 rounded-2xl border border-white/10 p-8  flex flex-col items-center gap-4"
      >
        <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-300">
          {hasPin === false ? <KeyRound className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            {hasPin === false ? "ตั้งรหัสหน้าตั้งค่า" : "หน้าตั้งค่าถูกล็อก"}
          </h2>
          <p className="text-sm text-white/55 mt-1">
            {hasPin === false
              ? "ยังไม่เคยตั้งรหัส — ตั้งรหัสตัวเลข 4–8 หลัก"
              : "ใส่รหัสเพื่อเข้าหน้าตั้งค่า"}
          </p>
        </div>
        {hasPin === undefined ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        ) : hasPin === null ? (
          <p className="text-sm text-rose-300">เชื่อมต่อ server ไม่ได้ ลองรีเฟรชอีกครั้ง</p>
        ) : (
          <>
            <PinInput value={pin} onChange={setPinValue} autoFocus />
            {hasPin === false ? (
              <PinInput value={pin2} onChange={setPin2} placeholder="ใส่อีกครั้ง" />
            ) : null}
            {err ? <p className="text-sm text-rose-300">{err}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/30 border border-emerald-400/50 text-white font-semibold hover:bg-emerald-500/40 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {hasPin === false ? "ตั้งรหัสและเข้าใช้งาน" : "ปลดล็อก"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

/** เปลี่ยนรหัส / ล็อกหน้าตั้งค่า (แสดงท้ายหน้าตั้งค่าเมื่อปลดล็อกแล้ว) */
function ChangePinPanel({ updatedBy, onLock }: { updatedBy?: string; onLock: () => void }) {
  const [oldPin, setOldPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const change = async () => {
    setMsg(null);
    if (!/^\d{4,8}$/.test(newPin)) return setMsg({ ok: false, text: "รหัสใหม่ต้องเป็นตัวเลข 4–8 หลัก" });
    setBusy(true);
    const r = await setPin(oldPin, newPin, updatedBy);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "เปลี่ยนรหัสแล้ว" } : { ok: false, text: r.error ?? "เปลี่ยนรหัสไม่สำเร็จ" });
    if (r.ok) {
      setOldPin("");
      setNewPin("");
    }
  };

  return (
    <div className="bg-white/10 rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-end gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-300">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">รหัสหน้าตั้งค่า</h2>
          <p className="text-sm text-white/60 mt-1">เปลี่ยนรหัส หรือกดล็อกเมื่อใช้งานเสร็จ</p>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        รหัสเดิม
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
          className="w-32 bg-[#051710] border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        รหัสใหม่ (4–8 หลัก)
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          className="w-32 bg-[#051710] border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
        />
      </label>
      <button
        onClick={() => void change()}
        disabled={busy}
        className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
      >
        เปลี่ยนรหัส
      </button>
      <button
        onClick={onLock}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/80 font-semibold hover:bg-white/15"
      >
        <LogOut className="w-4 h-4" /> ล็อกหน้าตั้งค่า
      </button>
      {msg ? <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p> : null}
    </div>
  );
}
