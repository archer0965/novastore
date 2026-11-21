-- Pricing v3: free / starter / pro / unlimited + half_yearly + 7-day trial

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Widen plan_type to accept legacy + new values during migration
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IN ('free', 'starter', 'pro', 'unlimited', 'plus', 'premium'));

-- Legacy mapping: plus → starter, premium → unlimited
UPDATE public.profiles
SET plan_type = 'starter'
WHERE plan_type = 'plus';

UPDATE public.profiles
SET plan_type = 'unlimited'
WHERE plan_type = 'premium';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IN ('free', 'starter', 'pro', 'unlimited'));

-- Billing cycles: monthly / half_yearly / yearly
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_billing_cycle_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'half_yearly', 'yearly'));

-- New signups get a 7-day full-feature trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', ''),
    timezone('utc', now()) + interval '7 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.trial_ends_at IS '全功能免費試用截止時間（UTC）；NULL 表示無試用或已結束';
