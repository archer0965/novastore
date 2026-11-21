-- PayCheck TW / 對帳通 Check Pay
-- Phase 1: Database schema + RLS for Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (賣家資料)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL DEFAULT '',
  bank_code TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  line_user_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_type IN ('free', 'starter', 'pro', 'unlimited')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'half_yearly', 'yearly')),
  trial_ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  expiry_reminder_3d_for TIMESTAMPTZ,
  expiry_reminder_1d_for TIMESTAMPTZ,
  monthly_usage_count INTEGER NOT NULL DEFAULT 0
    CHECK (monthly_usage_count >= 0),
  usage_month TEXT NOT NULL DEFAULT to_char(timezone('Asia/Taipei', now()), 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.profiles IS '賣家資料與訂閱方案';
COMMENT ON COLUMN public.profiles.usage_month IS '目前額度計數所屬月份 (YYYY-MM, Asia/Taipei)';

-- ---------------------------------------------------------------------------
-- payment_reports (買家對帳回報)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  bank_last_five TEXT NOT NULL CHECK (char_length(bank_last_five) = 5),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'auto_confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS payment_reports_seller_id_idx
  ON public.payment_reports (seller_id);

CREATE INDEX IF NOT EXISTS payment_reports_seller_created_idx
  ON public.payment_reports (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_reports_status_idx
  ON public.payment_reports (seller_id, status);

-- ---------------------------------------------------------------------------
-- Public shop view (買家頁只暴露安全欄位)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.shop_public
WITH (security_invoker = false)
AS
SELECT
  id,
  shop_name,
  bank_code,
  bank_account
FROM public.profiles;

GRANT SELECT ON public.shop_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper (optional for future)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;

-- profiles: 使用者只能讀取與更新自己的資料
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- payment_reports:
-- 訪客可 INSERT（只需提供 seller_id）
DROP POLICY IF EXISTS "Anyone can insert payment reports" ON public.payment_reports;
CREATE POLICY "Anyone can insert payment reports"
  ON public.payment_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = seller_id)
  );

-- 只有對應賣家可 SELECT
DROP POLICY IF EXISTS "Sellers can view own reports" ON public.payment_reports;
CREATE POLICY "Sellers can view own reports"
  ON public.payment_reports
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- 只有對應賣家可 UPDATE（狀態核對）
DROP POLICY IF EXISTS "Sellers can update own reports" ON public.payment_reports;
CREATE POLICY "Sellers can update own reports"
  ON public.payment_reports
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Free plan monthly limit helper (optional RPC for service role / app)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_free_plan_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 15;
$$;
