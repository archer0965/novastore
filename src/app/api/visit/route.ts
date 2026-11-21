import { NextResponse } from "next/server";
import { z } from "zod";
import { recordSiteVisit, shouldTrackPath } from "@/lib/visits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  path: z.string().min(1).max(300),
  visitorKey: z.string().min(8).max(80).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    let json: unknown = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = {};
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!shouldTrackPath(parsed.data.path)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fire-and-forget style but await briefly so serverless doesn't freeze
    await recordSiteVisit({
      path: parsed.data.path,
      visitorKey: parsed.data.visitorKey,
      referrer: parsed.data.referrer,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/visit]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
