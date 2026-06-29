export default async function handler(req, res) {
  return res.status(200).json({
    qstashTokenLen: process.env.QSTASH_TOKEN?.length ?? 0,
    qstashTokenStart: process.env.QSTASH_TOKEN?.slice(0, 6) ?? "",
    qstashUrl: process.env.QSTASH_URL ?? "",
    curKeyLen: process.env.QSTASH_CURRENT_SIGNING_KEY?.length ?? 0,
    nextKeyLen: process.env.QSTASH_NEXT_SIGNING_KEY?.length ?? 0,
    webBotTokenLen: process.env.WEB_BOT_TOKEN?.length ?? 0,
    telegramBotTokenLen: process.env.TELEGRAM_BOT_TOKEN?.length ?? 0,
  });
}
