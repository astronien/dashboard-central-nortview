export default async function handler(req, res) {
  // Temporary: expose full token for debugging (remove after)
  if (req.query?.reveal === '1') {
    return res.status(200).json({
      qstashToken: process.env.QSTASH_TOKEN,
      qstashUrl: process.env.QSTASH_URL,
    });
  }
  return res.status(200).json({
    qstashTokenLen: process.env.QSTASH_TOKEN?.length ?? 0,
  });
}
