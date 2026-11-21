-- Seller storefront bio for /shop/[username]

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_bio TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.profiles.shop_bio IS '公開賣場簡介（/shop/[username]）';

NOTIFY pgrst, 'reload schema';
