-- 超商取貨欄位（買家手動填寫）

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_type TEXT
    CHECK (store_type IS NULL OR store_type IN ('711', 'family')),
  ADD COLUMN IF NOT EXISTS store_info TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiver_phone TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.orders.store_type IS '超商取貨：711 / family';
COMMENT ON COLUMN public.orders.store_info IS '取件門市名稱與店號（買家手填）';
COMMENT ON COLUMN public.orders.receiver_phone IS '收件手機（超商取貨通知）';

NOTIFY pgrst, 'reload schema';
