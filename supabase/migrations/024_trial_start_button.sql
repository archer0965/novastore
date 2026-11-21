-- Trial starts only via in-app「開始免費試用七天」button (not on auth signup).
-- Early-bird seats (signup_early_bird) are claimed at button time, not register.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, trial_ends_at, signup_early_bird)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', ''),
    NULL,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.signup_early_bird IS
  '早鳥：後台點開始試用時占用（限量 15）；終身月 9／半年 85／年 8 折';

COMMENT ON COLUMN public.profiles.trial_ends_at IS
  '全功能免費試用截止（UTC）；僅在後台按「開始免費試用七天」後寫入；NULL 表示尚未開始或已結束';

NOTIFY pgrst, 'reload schema';
