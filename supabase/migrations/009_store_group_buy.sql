-- 代購／團購模組：products + orders + shop_slug

-- ---------------------------------------------------------------------------
-- profiles.shop_slug（買家連結 /[username]/[product_id]）
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_shop_slug_uidx
  ON public.profiles (shop_slug)
  WHERE shop_slug IS NOT NULL AND shop_slug <> '';

COMMENT ON COLUMN public.profiles.shop_slug IS '公開店舖 URL slug（小寫英數與連字）';

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  mode TEXT NOT NULL CHECK (mode IN ('agency', 'group_buy')),
  target_quantity INTEGER CHECK (target_quantity IS NULL OR target_quantity > 0),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'success', 'closed')),
  variant_note TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT products_group_buy_fields_chk CHECK (
    (mode = 'agency' AND target_quantity IS NULL AND deadline IS NULL)
    OR (mode = 'group_buy')
  )
);

CREATE INDEX IF NOT EXISTS products_user_id_idx
  ON public.products (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS products_user_status_idx
  ON public.products (user_id, status);

COMMENT ON TABLE public.products IS '代購／團購商品與開團主表';

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  atm_last5 TEXT NOT NULL CHECK (char_length(atm_last5) BETWEEN 4 AND 5),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'matched')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS orders_product_id_idx
  ON public.orders (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_product_payment_idx
  ON public.orders (product_id, payment_status);

COMMENT ON TABLE public.orders IS '團購／代購訂單與匯款末五碼對帳';

-- ---------------------------------------------------------------------------
-- 團購達標：累積數量 >= target_quantity 時自動 success
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_group_buy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_sum INTEGER;
BEGIN
  SELECT mode, target_quantity, status
    INTO v_mode, v_target, v_status
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF v_mode = 'group_buy'
     AND v_status = 'active'
     AND v_target IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_sum
    FROM public.orders
    WHERE product_id = NEW.product_id;

    IF v_sum >= v_target THEN
      UPDATE public.products
      SET status = 'success'
      WHERE id = NEW.product_id
        AND status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_refresh_group_buy ON public.orders;
CREATE TRIGGER orders_refresh_group_buy
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.refresh_group_buy_status();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own products" ON public.products;
CREATE POLICY "Sellers manage own products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can view open products" ON public.products;
CREATE POLICY "Public can view open products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'success', 'closed'));

DROP POLICY IF EXISTS "Sellers view orders for own products" ON public.orders;
CREATE POLICY "Sellers view orders for own products"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers update orders for own products" ON public.orders;
CREATE POLICY "Sellers update orders for own products"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.status IN ('active', 'success')
    )
  );

NOTIFY pgrst, 'reload schema';
