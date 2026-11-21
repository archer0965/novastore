import { NextResponse } from "next/server";
import { replyLineMessage, verifyLineSignature } from "@/lib/line-webhook";

export const runtime = "nodejs";

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type?: string; text?: string };
};

/**
 * LINE Messaging API webhook.
 * Must return HTTP 200 for LINE platform verification ("核實").
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  // LINE verify / empty ping: still need valid signature when secret is configured
  if (!verifyLineSignature(rawBody, signature)) {
    // Log for debugging; keep 401 for forged requests
    console.error("[line/webhook] invalid signature", {
      bodyLen: rawBody.length,
      hasSignature: !!signature,
      hasSecret: !!process.env.LINE_CHANNEL_SECRET,
    });
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: { events?: LineEvent[] } = {};
  try {
    payload = JSON.parse(rawBody || "{}") as { events?: LineEvent[] };
  } catch {
    // LINE verify sometimes still expects 200 after signature ok
    return NextResponse.json({ ok: true });
  }

  const events = payload.events || [];
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Respond 200 ASAP; process replies without blocking verify
  const tasks = events.map(async (event) => {
    const userId = event.source?.userId;
    const replyToken = event.replyToken;
    if (!userId || !replyToken) return;

    if (event.type === "follow" || event.type === "message") {
      const text = [
        "NovaStore 已連線 ✅",
        "",
        "你的 LINE User ID：",
        userId,
        "",
        "請複製上方 ID，貼到後台「個人設定 → LINE User ID」並儲存。",
        `${baseUrl}/dashboard/settings`,
        "",
        "之後買家提交對帳，就會推播通知到這裡。",
      ].join("\n");

      try {
        await replyLineMessage(replyToken, text);
      } catch (error) {
        console.error("[line/webhook] reply failed", error);
      }
    }
  });

  // Await replies before returning — Vercel freezes the isolate after the response
  await Promise.allSettled(tasks);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    service: "novastore",
    webhook: "ready",
    hasSecret: !!process.env.LINE_CHANNEL_SECRET,
    hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}
