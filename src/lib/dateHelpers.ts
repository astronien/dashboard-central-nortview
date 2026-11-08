/** วันนี้ตามเวลาไทย (YYYY-MM-DD) */
export const bangkokTodayYmd = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

/**
 * Pick the most recent data day, ignoring rows dated in the FUTURE
 * (pre-orders / reservations are sometimes booked ahead and would otherwise
 * hijack "วันล่าสุด" with a day that has almost no sales on it).
 */
export const latestDayFromKeys = (dayKeys: Iterable<string>): string => {
  const today = bangkokTodayYmd();
  const days = Array.from(dayKeys)
    .filter((d) => d && d <= today)
    .sort()
    .reverse();
  if (days.length) return days[0];
  // everything is future-dated — fall back to the earliest of those
  const all = Array.from(dayKeys).filter(Boolean).sort();
  return all.length ? all[0] : "";
};
