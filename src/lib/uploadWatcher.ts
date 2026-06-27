/**
 * Upload watcher — polls the server for new uploads from the LINE Bot.
 *
 * On every successful check:
 *   - If the server's `lastModified` is newer than the last seen one,
 *     invoke the `onUpdate` callback (which can trigger a refresh +
 *     show the toast notification).
 *
 * Pauses polling when the tab is hidden (saves battery + server load).
 * Resumes when the tab becomes visible.
 */

export interface LastModified {
  lastModified: string | null;
  latestKind?: string | null;
  latestBranch?: string | null;
}

export interface UploadWatcherOptions {
  /** Polling interval in ms (default 30s) */
  intervalMs?: number;
  /** Called when a new upload is detected (lastModified increased) */
  onUpdate: (info: LastModified) => void;
  /** Called on every poll (for status / error handling) */
  onPoll?: (info: LastModified) => void;
  /** Called on fetch error */
  onError?: (err: Error) => void;
}

const DEFAULT_INTERVAL_MS = 30_000;

export function startUploadWatcher(opts: UploadWatcherOptions): () => void {
  const { intervalMs = DEFAULT_INTERVAL_MS, onUpdate, onPoll, onError } = opts;
  let lastSeen: string | null = null;
  let timer: number | null = null;
  let stopped = false;

  async function poll() {
    if (stopped) return;
    if (typeof document !== "undefined" && document.hidden) {
      // Skip poll when tab is hidden; will resume on visibilitychange
      return;
    }
    try {
      const res = await fetch("/api/line-bot/last-modified", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const info = (await res.json()) as LastModified;
      onPoll?.(info);
      if (info.lastModified && info.lastModified !== lastSeen) {
        const isFirstPoll = lastSeen === null;
        lastSeen = info.lastModified;
        // Don't trigger update on first poll (initial state)
        if (!isFirstPoll) onUpdate(info);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  function schedule() {
    if (stopped) return;
    timer = window.setTimeout(async () => {
      await poll();
      schedule();
    }, intervalMs);
  }

  function onVisibility() {
    if (stopped) return;
    if (!document.hidden) {
      // Tab became visible — poll immediately
      poll();
      if (timer !== null) clearTimeout(timer);
      schedule();
    }
  }

  // Start
  poll();
  schedule();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  // Return stop function
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}
