import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserEmailById, isExcludedFromStats } from "@/lib/admin";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { sendExpiryReminderEmail } from "@/lib/email";
import { buildExpiryReminderLineText } from "@/lib/expiry-notify";
import { sendLineTextMessage } from "@/lib/line";
import { daysUntilExpiry, isSubscriptionExpired } from "@/lib/subscription";
import {
  isPaidPlan,
  normalizeBillingCycle,
  normalizePlan,
} from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  return authorizeCronRequest(request, "expiry-reminders");
}

/**
 * Only remind when the subscription is still ending in exactly 1 or 3 days.
 * If the customer already renewed, expires_at moves forward → daysLeft grows → skip.
 */
async function stillNeedsReminder(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  expectedExpiresAt: string,
  expectedDays: 1 | 3,
  now: Date
): Promise<{
  ok: boolean;
  reason?: string;
  fresh?: {
    expires_at: string;
    plan_type: string;
    billing_cycle: string | null;
    shop_name: string | null;
    line_user_id: string | null;
    line_channel_access_token: string | null;
    expiry_reminder_3d_for: string | null;
    expiry_reminder_1d_for: string | null;
  };
}> {
  const { data, error } = await admin
    .from("profiles")
    .select(
      "expires_at, plan_type, billing_cycle, shop_name, line_user_id, line_channel_access_token, expiry_reminder_3d_for, expiry_reminder_1d_for"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "profile_missing" };
  }
  if (!isPaidPlan(normalizePlan(data.plan_type))) {
    return { ok: false, reason: "not_paid" };
  }
  if (!data.expires_at || isSubscriptionExpired(data.expires_at, now)) {
    return { ok: false, reason: "expired_or_missing" };
  }

  // Renewed / extended: expiry date changed since candidate snapshot
  if (data.expires_at !== expectedExpiresAt) {
    return { ok: false, reason: "already_renewed_expires_changed" };
  }

  const days = daysUntilExpiry(data.expires_at, now);
  if (days !== expectedDays) {
    // e.g. was 3 days, now 4+ after renew; or calendar rolled past the window
    return { ok: false, reason: "days_no_longer_match" };
  }

  const already =
    expectedDays === 3
      ? data.expiry_reminder_3d_for === data.expires_at
      : data.expiry_reminder_1d_for === data.expires_at;
  if (already) {
    return { ok: false, reason: "already_sent_for_this_expiry" };
  }

  return {
    ok: true,
    fresh: {
      expires_at: data.expires_at,
      plan_type: data.plan_type,
      billing_cycle: data.billing_cycle,
      shop_name: data.shop_name,
      line_user_id: data.line_user_id,
      line_channel_access_token: data.line_channel_access_token,
      expiry_reminder_3d_for: data.expiry_reminder_3d_for,
      expiry_reminder_1d_for: data.expiry_reminder_1d_for,
    },
  };
}

async function runReminders() {
  const admin = createAdminClient();
  const now = new Date();
  const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, plan_type, billing_cycle, expires_at, line_user_id, expiry_reminder_3d_for, expiry_reminder_1d_for"
    )
    .not("expires_at", "is", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", inFourDays.toISOString());

  if (error) throw error;

  let sent3 = 0;
  let sent1 = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const row of rows || []) {
    if (!isPaidPlan(normalizePlan(row.plan_type))) {
      skipped += 1;
      skipReasons.not_paid = (skipReasons.not_paid || 0) + 1;
      continue;
    }
    if (!row.expires_at) {
      skipped += 1;
      skipReasons.missing_expiry = (skipReasons.missing_expiry || 0) + 1;
      continue;
    }

    const days = daysUntilExpiry(row.expires_at, now);
    if (days !== 1 && days !== 3) {
      skipped += 1;
      skipReasons.not_1_or_3 = (skipReasons.not_1_or_3 || 0) + 1;
      continue;
    }

    // Live re-check: customer may have renewed after the batch query
    const live = await stillNeedsReminder(
      admin,
      row.id,
      row.expires_at,
      days,
      now
    );
    if (!live.ok || !live.fresh) {
      skipped += 1;
      const reason = live.reason || "live_skip";
      skipReasons[reason] = (skipReasons[reason] || 0) + 1;
      continue;
    }

    const email = await getUserEmailById(row.id);
    if (!email || isExcludedFromStats(email)) {
      skipped += 1;
      skipReasons.no_email_or_excluded = (skipReasons.no_email_or_excluded || 0) + 1;
      continue;
    }

    const fresh = live.fresh;
    const mail = await sendExpiryReminderEmail({
      to: email,
      shopName: fresh.shop_name,
      planType: fresh.plan_type,
      billingCycle: normalizeBillingCycle(fresh.billing_cycle),
      expiresAt: fresh.expires_at,
      daysLeft: days,
    });

    if (fresh.line_user_id) {
      await sendLineTextMessage(
        fresh.line_user_id,
        buildExpiryReminderLineText({
          planType: fresh.plan_type,
          expiresAt: fresh.expires_at,
          daysLeft: days,
        }),
        { accessToken: fresh.line_channel_access_token }
      );
    }

    if (!mail.ok && !mail.skipped) {
      console.error("[expiry-reminders] mail failed", row.id, mail.error);
      skipped += 1;
      skipReasons.mail_failed = (skipReasons.mail_failed || 0) + 1;
      continue;
    }

    const patch =
      days === 3
        ? { expiry_reminder_3d_for: fresh.expires_at }
        : { expiry_reminder_1d_for: fresh.expires_at };

    const { error: updErr } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", row.id)
      // Guard: only mark if expiry still the same (renew race)
      .eq("expires_at", fresh.expires_at);

    if (updErr) {
      console.error("[expiry-reminders] mark failed", row.id, updErr);
      continue;
    }

    if (days === 3) sent3 += 1;
    else sent1 += 1;
  }

  return {
    checked: rows?.length ?? 0,
    sent3,
    sent1,
    skipped,
    skipReasons,
    at: now.toISOString(),
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[expiry-reminders]", error);
    return NextResponse.json({ success: false, error: "Cron failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
