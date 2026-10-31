/** รหัสเข้าหน้าตั้งค่า — ตรวจที่ server (เก็บเป็น hash) */
const API = "/api/staff-photos?resource=settings-pin";
const UNLOCK_KEY = "settings-unlocked-until";
/** ปลดล็อกแล้วอยู่ได้นานเท่าไหร่ (ปิดแท็บ = ล็อกใหม่) */
const UNLOCK_MS = 30 * 60 * 1000;

export const fetchHasPin = async (): Promise<boolean | null> => {
  try {
    const r = await fetch(API);
    const j = await r.json();
    return j?.ok ? Boolean(j.hasPin) : null;
  } catch {
    return null;
  }
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", pin }),
    });
    const j = await r.json();
    return Boolean(j?.ok && j.valid);
  } catch {
    return false;
  }
};

export const setPin = async (
  oldPin: string,
  newPin: string,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", pin: oldPin, newPin, updatedBy }),
    });
    const j = await r.json().catch(() => null);
    return j?.ok ? { ok: true } : { ok: false, error: j?.error ?? `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

export const isUnlocked = (): boolean => {
  try {
    return Number(sessionStorage.getItem(UNLOCK_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
};
export const markUnlocked = () => {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_MS));
  } catch {
    /* ignore */
  }
};
export const lockSettings = () => {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
};
