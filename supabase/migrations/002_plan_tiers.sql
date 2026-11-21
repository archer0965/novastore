-- Superseded by 003_pricing_v3.sql (kept for deploy history)
-- Expand plan tiers historically: free / plus / premium
-- Current canonical tiers: free / starter / pro / unlimited (see 003)

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IN ('free', 'plus', 'premium', 'pro', 'starter', 'unlimited'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_billing_cycle_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'yearly', 'half_yearly'));
