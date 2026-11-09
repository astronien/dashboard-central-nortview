import { useEffect, useState } from "react";

/** จอเล็กกว่า md (768px) = มือถือ — ตามขนาดจอจริง เปลี่ยนตามการหมุนจอ */
const QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(QUERY).matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(QUERY);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return mobile;
}
