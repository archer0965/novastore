-- Paid subscription expiry + renewal reminder dedupe markers

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expiry_reminder_3d_for TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expiry_reminder_1d_for TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.expires_at IS '付費方案到期時間（UTC）；NULL 表示無到期（管理者或未設定）';
COMMENT ON COLUMN public.profiles.expiry_reminder_3d_for IS '已對此 expires_at 寄過 3 天到期提醒';
COMMENT ON COLUMN public.profiles.expiry_reminder_1d_for IS '已對此 expires_at 寄過 1 天到期提醒';

CREATE INDEX IF NOT EXISTS profiles_expires_at_idx
  ON public.profiles (expires_at)
  WHERE expires_at IS NOT NULL;

-- Backfill: existing paid users without expiry get +1 month from now
UPDATE public.profiles
SET expires_at = timezone('utc', now()) + interval '30 days'
WHERE plan_type IN ('starter', 'pro', 'unlimited', 'plus', 'premium')
  AND expires_at IS NULL;
