import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface UploadNotificationInfo {
  lastModified: string | null;
  latestKind?: string | null;
  latestBranch?: string | null;
}

interface UploadNotificationProps {
  /** When set, shows the toast. Pass null to hide. */
  info: UploadNotificationInfo | null;
  /** Auto-dismiss after this many ms (default 5000) */
  durationMs?: number;
  /** Called when toast is dismissed */
  onDismiss: () => void;
}

export function UploadNotification({ info, durationMs = 5000, onDismiss }: UploadNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!info) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [info, durationMs, onDismiss]);

  if (!info || !visible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 backdrop-blur-md p-4 pr-3 shadow-[0_8px_32px_rgba(16,185,129,0.25)] max-w-sm animate-in slide-in-from-right"
      role="alert"
    >
      <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-emerald-100">มีข้อมูลใหม่จาก LINE Bot</div>
        <div className="text-xs text-emerald-200/80 mt-0.5">
          {info.latestKind ? `${info.latestKind} อัปโหลด` : "อัปโหลดไฟล์"}
          {info.latestBranch ? ` • สาขา ${info.latestBranch}` : ""}
        </div>
      </div>
      <button
        onClick={() => {
          setVisible(false);
          onDismiss();
        }}
        className="p-1 rounded-lg text-emerald-200/60 hover:text-emerald-100 hover:bg-emerald-500/20 transition-colors"
        aria-label="ปิด"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
