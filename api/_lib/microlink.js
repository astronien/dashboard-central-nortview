/**
 * Microlink.io screenshot API helper.
 *
 * Free tier: 50 requests/day, no API key required.
 * Docs: https://microlink.io/docs/api
 *
 * Returns a PNG buffer for a given URL with the specified viewport and
 * CSS selectors to wait for. Used by the Telegram bot to render the
 * PIA dashboard for a single PIA, then send the resulting image.
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
 * @param {string} [opts.waitFor='body[data-bot-ready="1"]'] - CSS selector to wait for
 * @param {number} [opts.timeout=25] - max seconds to wait
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function captureWithMicrolink({
  url,
  view = "sales",
  width = 1600,
  height = 1200,
  deviceScaleFactor = 2,
  waitFor = 'body[data-bot-ready="1"]',
  timeout = 25,
}) {
  const apiKey = process.env.MICROLINK_API_KEY; // optional, not required
  const sep = url.includes("?") ? "&" : "?";
  const targetUrl = `${url}${sep}view=${view}`;

  const u = new URL(MICROLINK_API);
  u.searchParams.set("url", targetUrl);
  u.searchParams.set("screenshot", "true");
  u.searchParams.set("meta", "false");
  u.searchParams.set("embed", "screenshot.url");
  u.searchParams.set("waitUntil", "domcontentloaded");
  u.searchParams.set("screenshot.width", String(width));
  u.searchParams.set("screenshot.height", String(height));
  u.searchParams.set("screenshot.deviceScaleFactor", String(deviceScaleFactor));
  u.searchParams.set("screenshot.fullPage", "true");
  u.searchParams.set("waitFor", waitFor);
  u.searchParams.set("screenshot.timeout", String(timeout));
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

/**
 * Capture 3 sections of a PIA report in parallel.
 * Each section uses a different ?view= so the web app shows a different table.
 * Returns { kpi: Buffer, wonder: Buffer, category: Buffer }.
 * Missing sections are null (caller decides how to handle).
 */
export async function capturePiaSections(url) {
  const sections = [
    { key: "kpi", view: "sales" },
    { key: "wonder", view: "csat" },
    { key: "category", view: "today" },
  ];
  const results = {};
  await Promise.all(
    sections.map(async ({ key, view }) => {
      try {
        results[key] = await captureWithMicrolink({ url, view });
      } catch (e) {
        console.error(`[microlink] ${key} failed:`, e instanceof Error ? e.message : String(e));
        results[key] = null;
      }
    })
  );
  return results;
}

/**
 * Capture 1 full-page screenshot (single-image mode).
 */
export async function capturePiaSingle(url) {
  return captureWithMicrolink({ url, view: "sales" });
}
