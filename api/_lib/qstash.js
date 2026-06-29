/**
 * Upstash QStash client wrapper.
 *
 * Used for background processing (e.g. /report all sends 13 PIAs).
 * QStash schedules HTTP calls to our endpoints and retries on failure.
 *
 * Free tier: 500 messages/day.
 */

import { Client, Receiver } from "@upstash/qstash";

let _client = null;

export function getQStash() {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error("QSTASH_TOKEN not set");
    // Use the URL from env (e.g. https://qstash-us-east-1.upstash.io)
    // If not set, default to the SDK's auto-detection
    const baseUrl = process.env.QSTASH_URL;
    _client = baseUrl ? new Client({ token, baseUrl }) : new Client({ token });
  }
  return _client;
}

export function getReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey) {
    throw new Error("QSTASH_CURRENT_SIGNING_KEY not set");
  }
  return new Receiver({ currentSigningKey, nextSigningKey });
}

function getVercelUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://dashboard-central-nortview.vercel.app";
}

/**
 * Schedule a PIA processing job to run after `delay` seconds.
 */
export async function schedulePiaJob({ staffId, branchId, chatId, delay = 0 }) {
  const qstash = getQStash();
  return qstash.publishJSON({
    url: `${getVercelUrl()}/api/process-pia`,
    body: { staffId, branchId, chatId },
    delay,
  });
}

/**
 * Verify that a request came from QStash (HMAC-SHA256).
 */
export async function verifyQStashRequest(signature, body) {
  if (!signature) return false;
  try {
    const receiver = getReceiver();
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}
