/**
 * LINE Messaging API authentication & signature verification.
 *
 * - verifyLineSignature: HMAC-SHA256 check on webhook body
 * - getLineUserProfile: fetch display name from LINE Profile API
 *
 * The webhook handler in api/line-webhook.js uses these to authorize
 * and personalize responses.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the X-Line-Signature header against the raw request body.
 * LINE signs the body with HMAC-SHA256 using your channel secret as the key.
 * The signature is base64-encoded.
 *
 * @param rawBody  string or Buffer — the unparsed request body
 * @param signature string from `x-line-signature` header
 * @param channelSecret string — your LINE channel secret
 * @returns boolean — true if the signature matches
 */
export function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!rawBody || !signature || !channelSecret) return false;
  const expected = createHmac("SHA256", channelSecret).update(rawBody).digest("base64");
  // timingSafeEqual requires equal-length buffers
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  try {
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Fetch a LINE user's display name from the Profile API.
 * @param userId  LINE user ID
 * @param accessToken  Channel access token
 * @returns display name (or null on failure)
 */
export async function getLineUserProfile(userId, accessToken) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.displayName ?? null;
  } catch {
    return null;
  }
}

/**
 * Download a file's binary content from LINE Content API.
 * Used in webhook to fetch the actual Excel bytes that the user sent.
 *
 * @param messageId  ID of the file/image message
 * @param accessToken  Channel access token
 * @returns Buffer (or null on failure)
 */
export async function getLineContent(messageId, accessToken) {
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}
