-- Signup early-bird: first 15 users get 14-day trial (flagged on profiles)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_early_bird BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_signup_early_bird_idx
  ON public.profiles (signup_early_bird)
  WHERE signup_early_bird = true;

COMMENT ON COLUMN public.profiles.signup_early_bird IS
  '註冊早鳥：前 15 名用戶（限量）享 14 天試用標記';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  early_used INTEGER;
  trial_days INTEGER;
  is_early BOOLEAN;
BEGIN
  SELECT COUNT(*)::INTEGER INTO early_used
  FROM public.profiles
  WHERE signup_early_bird = true;

  IF early_used < 15 THEN
    trial_days := 14;
    is_early := true;
  ELSE
    trial_days := 7;
    is_early := false;
  END IF;

  INSERT INTO public.profiles (id, shop_name, trial_ends_at, signup_early_bird)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', ''),
    timezone('utc', now()) + make_interval(days => trial_days),
    is_early
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
