-- Coupon usage modes + per-phone redemption tracking

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS usage_type TEXT;

UPDATE public.coupons
SET usage_type = CASE
  WHEN usage_limit IS NULL THEN 'unlimited'
  ELSE 'limited'
END
WHERE usage_type IS NULL;

ALTER TABLE public.coupons
  ALTER COLUMN usage_type SET DEFAULT 'unlimited';

ALTER TABLE public.coupons
  ALTER COLUMN usage_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_usage_type_chk'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_usage_type_chk
      CHECK (usage_type IN ('unlimited', 'limited'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_limited_requires_limit_chk'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_limited_requires_limit_chk
      CHECK (
        (usage_type = 'unlimited' AND usage_limit IS NULL)
        OR (usage_type = 'limited' AND usage_limit IS NOT NULL AND usage_limit > 0)
      );
  END IF;
END $$;

-- Ensure unlimited rows don't keep a stale usage_limit
UPDATE public.coupons
SET usage_limit = NULL
WHERE usage_type = 'unlimited' AND usage_limit IS NOT NULL;

COMMENT ON COLUMN public.coupons.usage_type IS
  'unlimited=不限總次數(仍每人手機限用一次)；limited=全店總限量';

CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT coupon_usages_phone_chk CHECK (phone ~ '^09[0-9]{8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_coupon_phone_uidx
  ON public.coupon_usages (coupon_id, phone);

CREATE INDEX IF NOT EXISTS coupon_usages_seller_phone_idx
  ON public.coupon_usages (seller_id, phone);

CREATE INDEX IF NOT EXISTS coupon_usages_coupon_id_idx
  ON public.coupon_usages (coupon_id, created_at DESC);

COMMENT ON TABLE public.coupon_usages IS
  '優惠碼使用紀錄：同一優惠碼每個手機號碼僅能使用一次';

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own coupon usages" ON public.coupon_usages;
CREATE POLICY "Sellers view own coupon usages"
  ON public.coupon_usages
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

NOTIFY pgrst, 'reload schema';
