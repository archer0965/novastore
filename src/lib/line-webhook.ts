import crypto from "crypto";

export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret = process.env.LINE_CHANNEL_SECRET
): boolean {
  if (!signature || !channelSecret) {
    console.warn("[LINE] signature check skipped missing", {
      hasSignature: !!signature,
      hasSecret: !!channelSecret,
    });
    return false;
  }

  const digest = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export async function replyLineMessage(
  replyToken: string,
  text: string
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return;

  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    console.error("[LINE] reply failed", res.status, await res.text());
  }
}
