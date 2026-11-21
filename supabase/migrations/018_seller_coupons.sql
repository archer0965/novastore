-- Seller promo coupons + order discount fields

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  -- percentage: 90 = 九折 (pay 90%); fixed: absolute TWD off
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  min_spend NUMERIC(12, 2) CHECK (min_spend IS NULL OR min_spend >= 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT coupons_percentage_value_chk CHECK (
    discount_type <> 'percentage'
    OR (discount_value >= 1 AND discount_value <= 99)
  ),
  CONSTRAINT coupons_code_format_chk CHECK (
    char_length(code) BETWEEN 2 AND 32
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_seller_code_uidx
  ON public.coupons (seller_id, lower(code));

CREATE INDEX IF NOT EXISTS coupons_seller_id_idx
  ON public.coupons (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coupons_seller_active_idx
  ON public.coupons (seller_id, is_active);

COMMENT ON TABLE public.coupons IS '賣家自訂優惠碼（百分比成數／固定金額）';
COMMENT ON COLUMN public.coupons.discount_type IS 'percentage=打折成數(90=九折)；fixed=折固定金額';
COMMENT ON COLUMN public.coupons.discount_value IS '折扣數值';
COMMENT ON COLUMN public.coupons.min_spend IS '最低消費門檻（以折扣前小計計算）';
COMMENT ON COLUMN public.coupons.usage_limit IS '使用次數上限；null=不限';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12, 2);

COMMENT ON COLUMN public.orders.coupon_code IS '下單時套用的優惠碼快照';
COMMENT ON COLUMN public.orders.discount_amount IS '優惠折抵金額';
COMMENT ON COLUMN public.orders.subtotal_amount IS '折扣前小計';

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own coupons" ON public.coupons;
CREATE POLICY "Sellers manage own coupons"
  ON public.coupons
  FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

NOTIFY pgrst, 'reload schema';
