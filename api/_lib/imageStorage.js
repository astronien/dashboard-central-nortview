/**
 * Image Storage — uploads generated PNG screenshots to Cloudflare R2.
 *
 * R2 is S3-compatible. We use the AWS SDK v3 (S3 client) configured with
 * the R2 endpoint. After upload, the image is publicly accessible via the
 * R2 public URL (configured via R2_PUBLIC_URL env var).
 *
 * Required Vercel env vars:
 *   R2_ENDPOINT       — e.g. https://ACCOUNT_ID.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY     — R2 API token Access Key
 *   R2_SECRET_KEY     — R2 API token Secret Key
 *   R2_BUCKET         — bucket name (e.g. "pia-reports")
 *   R2_PUBLIC_URL     — public base URL (e.g. https://pia-reports.XXX.r2.dev)
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

let _client = null;

function getR2Client() {
  if (_client) return _client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY;
  const secretAccessKey = process.env.R2_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY on Vercel.",
    );
  }
  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

/**
 * Upload a PNG buffer to R2 and return the public URL.
 * @param {Buffer} buffer
 * @param {string} fileName
 * @returns {Promise<string>} public URL
 */
async function uploadToR2(buffer, fileName) {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) {
    throw new Error("R2_BUCKET and R2_PUBLIC_URL must be set.");
  }

  const key = `pia/${Date.now()}-${fileName}`;
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    }),
  );

  // Strip trailing slash from publicUrl
  const base = publicUrl.replace(/\/$/, "");
  return `${base}/${key}`;
}

module.exports = { uploadToR2 };
