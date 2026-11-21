-- Early bird (max 5 seats), admin-assigned lifetime special discount

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_early_bird BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discount_tier TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_discount_tier_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_discount_tier_check
      CHECK (
        discount_tier IS NULL
        OR discount_tier IN ('lifetime_special')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_is_early_bird_idx
  ON public.profiles (is_early_bird)
  WHERE is_early_bird = true;

COMMENT ON COLUMN public.profiles.is_early_bird IS
  '早鳥資格（全站最多 5 名，由管理員手動開通）';
COMMENT ON COLUMN public.profiles.discount_tier IS
  '折扣層級；lifetime_special = 早鳥終身特價（結帳半價）';

NOTIFY pgrst, 'reload schema';
