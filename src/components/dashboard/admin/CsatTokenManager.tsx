import React from "react";
import { Smile, Save, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import {
  getCsatTokenStatus,
  saveCsatToken,
  type CsatTokenStatus,
} from "../../../lib/csatApi";

/**
 * Admin-only: refresh the CSAT access token when it expires.
 *
 * The CSAT account has 2FA, so the token can only be minted by a human
 * logging into the CSAT portal once. After that, paste it here and the
 * dashboard uses it server-side — no redeploy, no keeping a browser
 * session alive.
 */
export function CsatTokenManager({ updatedBy }: { updatedBy?: string }) {
  const [status, setStatus] = React.useState<CsatTokenStatus | undefined>();
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Bookmarklet: run on backoffice-csat.com7.in after login → reads the
  // Sanctum token from localStorage and POSTs it to THIS dashboard's
  // /api/csat?resource=token. Origin is baked in from the current page so
  // it always targets the right deployment.
  const bookmarklet = React.useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return (
      "javascript:(function(){" +
      "var re=/^\\d+\\|[A-Za-z0-9]{20,}$/;" +
      "var t=(localStorage.getItem('token')||'').trim();" +
      "if(!re.test(t)){var p=/\\d+\\|[A-Za-z0-9]{20,}/;for(var i=0;i<localStorage.length;i++){var v=localStorage.getItem(localStorage.key(i))||'';var m=String(v).match(p);if(m){t=m[0];break;}}}" +
      "if(!re.test(t)){alert('ไม่พบ CSAT token — เข้า backoffice-csat.com7.in แล้ว login ก่อน');return;}" +
      "fetch('" + origin + "/api/csat?resource=token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,updatedBy:'bookmarklet'})})" +
      ".then(function(r){return r.json();}).then(function(j){alert(j&&j.ok?'✅ บันทึก CSAT token สำเร็จ':'❌ '+((j&&j.error)||'ไม่สำเร็จ'));})" +
      ".catch(function(e){alert('❌ ยิงไม่สำเร็จ: '+e);});})();"
    );
  }, []);

  const bmRef = React.useRef<HTMLAnchorElement>(null);
  React.useEffect(() => {
    // Set the javascript: href directly on the DOM node — React strips
    // javascript: URLs from href, but dragging to the bookmarks bar needs
    // the real attribute present.
    if (bmRef.current) bmRef.current.setAttribute("href", bookmarklet);
  }, [bookmarklet]);

  const copyBookmarklet = () => {
    navigator.clipboard
      .writeText(bookmarklet)
      .then(() => {
        setSuccess("คัดลอก bookmarklet แล้ว — สร้าง bookmark ใหม่แล้ววาง URL นี้");
        setError(null);
      })
      .catch(() => setError("คัดลอกไม่สำเร็จ"));
  };

  const refresh = React.useCallback(() => {
    void getCsatTokenStatus().then(setStatus);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async () => {
    const value = draft.trim();
    if (!value) {
      setError("กรุณาวาง token");
      setSuccess(null);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await saveCsatToken(value, updatedBy);
    setSaving(false);
    if (result.ok) {
      setDraft("");
      setSuccess("บันทึก token ใหม่แล้ว — ข้อมูล CSAT จะอัปเดตในไม่ช้า");
      refresh();
    } else {
      setError(result.error ?? "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-sky-500/20 rounded-xl text-sky-400">
          <Smile className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">CSAT Token</h2>
          <p className="text-sm text-white/60 mt-1">
            ใช้ดึงคะแนนความพึงพอใจ (COM7 CSAT) — อัปเดตที่นี่เมื่อ token หมดอายุ
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 mb-4 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/60">สถานะ:</span>
          {status?.hasToken ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> ตั้งค่าแล้ว
              <span className="text-white/40 font-normal">
                ({status.source === "settings" ? "จากหน้านี้" : "จาก env"})
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
              <AlertCircle className="w-4 h-4" /> ยังไม่ได้ตั้งค่า
            </span>
          )}
        </div>
        {status?.updatedAt ? (
          <div className="text-[11px] text-white/40">
            อัปเดตล่าสุด: {status.updatedAt}
            {status.updatedBy ? ` โดย ${status.updatedBy}` : ""}
          </div>
        ) : null}
      </div>

      <details className="mb-4 text-[13px] text-white/70">
        <summary className="cursor-pointer text-sky-300 font-medium select-none">
          วิธีเอา token มาจากเว็บ CSAT
        </summary>
        <ol className="list-decimal ml-5 mt-2 space-y-1 text-white/60">
          <li>
            เปิด{" "}
            <a
              href="https://backoffice-csat.com7.in/portal"
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline"
            >
              backoffice-csat.com7.in/portal
            </a>{" "}
            แล้ว login (ผ่าน OTP)
          </li>
          <li>กด F12 เปิด DevTools → แท็บ Console</li>
          <li>
            พิมพ์{" "}
            <code className="px-1 py-0.5 rounded bg-white/10 text-sky-200">
              localStorage.token
            </code>{" "}
            แล้ว Enter
          </li>
          <li>คัดลอกค่าที่ได้ (รูปแบบ "เลข|ตัวอักษร") มาวางด้านล่าง</li>
        </ol>
      </details>

      {/* One-click: bookmarklet grabs the token from the CSAT site and
          saves it here — no manual copy/paste. */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-emerald-300" />
          <span className="text-sm font-semibold text-emerald-200">ดึงอัตโนมัติ (คลิกเดียว)</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <a
            ref={bmRef}
            href="#"
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 font-semibold cursor-grab active:cursor-grabbing select-none"
            title="ลากปุ่มนี้ไปวางที่แถบ Bookmarks ของเบราว์เซอร์"
          >
            📌 ดึง CSAT Token
          </a>
          <button
            type="button"
            onClick={copyBookmarklet}
            className="text-xs text-emerald-300/80 underline hover:text-emerald-200"
          >
            หรือคัดลอกโค้ด bookmarklet
          </button>
        </div>
        <ol className="list-decimal ml-5 text-[12px] text-white/60 space-y-0.5">
          <li>ลากปุ่ม "📌 ดึง CSAT Token" ไปวางที่แถบ Bookmarks (ทำครั้งเดียว)</li>
          <li>
            เปิด{" "}
            <a
              href="https://backoffice-csat.com7.in/portal"
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline"
            >
              backoffice-csat.com7.in
            </a>{" "}
            แล้ว login (ผ่าน OTP)
          </li>
          <li>กด bookmark ที่เพิ่งวาง → ระบบจะดึง token มาบันทึกให้อัตโนมัติ ✅</li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="วาง CSAT token ที่นี่ (เช่น 21573|abcd...)"
            className="w-full bg-[#051710] border border-white/15 rounded-xl pl-9 pr-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
          />
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 font-semibold hover:bg-sky-500/30 hover:border-sky-400/60 transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      {success ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      ) : null}
    </div>
  );
}
