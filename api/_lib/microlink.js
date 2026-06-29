/**
 * Microlink.io screenshot API helper.
 *
 * Free tier: 50 requests/day, no API key required.
 * Docs: https://microlink.io/docs/api/parameters
 *
 * Returns a PNG buffer for a given URL with the specified viewport and
 * CSS selector to wait for. Used by the Telegram bot to render the
 * PIA dashboard for a single PIA, then send the resulting image.
 *
 * IMPORTANT parameter names (per docs):
 *   - waitForSelector  (NOT 'waitFor')
 *   - viewport.width / viewport.height / viewport.deviceScaleFactor  (NOT 'screenshot.*')
 *   - timeout          (top-level, format "30s", NOT 'screenshot.timeout')
 *   - waitForTimeout   (ms to wait AFTER selector appears, for chart animation)
 *
 * Timing budget for Vercel 60s function limit:
 *   - 3 sequential captures × ~12s = 36s
 *   - sendPhoto × 3 + sendMessage = ~3s
 *   - Total: ~39s (comfortable margin)
 */

const MICROLINK_API = "https://api.microlink.io";

/**
 * Capture a single screenshot of the given URL.
 *
 * @param {object} opts
 * @param {string} opts.url - URL to capture (must be publicly reachable)
 * @param {"sales"|"csat"|"today"|"target"} [opts.view="sales"] - view param appended to URL
 * @param {number} [opts.width=1600] - viewport width
 * @param {number} [opts.height=1200] - viewport height
 * @param {number} [opts.deviceScaleFactor=2] - device pixel ratio (2x retina)
 * @param {string} [opts.waitForSelector='body[data-bot-ready="1"]'] - CSS selector to wait for
 * @param {number} [opts.waitForTimeout=1500] - ms to wait AFTER selector appears (chart animation)
 * @param {number} [opts.timeoutSec=20] - max seconds for Microlink request
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function captureWithMicrolink({
  url,
  view = "sales",
  width = 1600,
  height = 1200,
  deviceScaleFactor = 2,
  waitForSelector = 'body[data-bot-ready="1"]',
  waitForTimeout = 1500,
  timeoutSec = 20,
}) {
  const apiKey = process.env.MICROLINK_API_KEY; // optional, not required
  const sep = url.includes("?") ? "&" : "?";
  const targetUrl = `${url}${sep}view=${view}`;

  const u = new URL(MICROLINK_API);
  u.searchParams.set("url", targetUrl);
  u.searchParams.set("screenshot", "true");
  u.searchParams.set("meta", "false");
  // NOTE: do NOT pass `embed=screenshot.url` — without it, Microlink returns JSON
  // with `data.screenshot.url` (CDN). We then download the PNG from that URL.
  u.searchParams.set("waitUntil", "domcontentloaded");
  u.searchParams.set("waitForSelector", waitForSelector);
  u.searchParams.set("waitForTimeout", String(waitForTimeout));
  // Viewport params (NOT screenshot.* — per docs they live under viewport.*)
  u.searchParams.set("viewport.width", String(width));
  u.searchParams.set("viewport.height", String(height));
  u.searchParams.set("viewport.deviceScaleFactor", String(deviceScaleFactor));
  u.searchParams.set("screenshot.fullPage", "true");
  // Top-level timeout (format "15s"), NOT screenshot.timeout
  u.searchParams.set("timeout", `${timeoutSec}s`);
  if (apiKey) u.searchParams.set("apiKey", apiKey);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Microlink ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json.data?.screenshot?.url) {
    throw new Error("Microlink returned no screenshot URL");
  }

  // Download the PNG from Microlink's CDN
  const img = await fetch(json.data.screenshot.url);
  if (!img.ok) throw new Error(`PNG download ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Capture 3 sections of a PIA report SEQUENTIALLY (not parallel).
 *
 * Free tier Microlink has concurrency limits — parallel requests cause
 * one of the 3 to fail (the "only 2 images" bug). Sequential is slower
 * but reliable. No retry here (keeps total under Vercel's 60s limit).
 *
 * Each section uses a different ?view= so the web app shows a different table.
 * Returns { kpi: Buffer|null, wonder: Buffer|null, category: Buffer|null, errors: string[] }.
 */
export async function capturePiaSections(url) {
  const sections = [
    { key: "kpi", view: "sales" },
    { key: "wonder", view: "csat" },
    { key: "category", view: "today" },
  ];
  const results = { errors: [] };

  for (const { key, view } of sections) {
    try {
      results[key] = await captureWithMicrolink({ url, view });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[microlink] ${key} failed:`, msg);
      results[key] = null;
      results.errors.push(`${key}: ${msg}`);
    }
    // brief pause between sections to be gentle on free tier
    await sleep(300);
  }
  return results;
}

/**
 * Capture 1 full-page screenshot (single-image mode).
 */
export async function capturePiaSingle(url) {
  return captureWithMicrolink({ url, view: "sales" });
}
