-- Product stock + preorder fields for NovaStore storefronts

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INTEGER
    CHECK (stock IS NULL OR stock >= 0),
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_notice TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.products.stock IS
  '可售庫存上限；NULL=不限量。剩餘 = stock - 已下單數量';
COMMENT ON COLUMN public.products.is_preorder IS
  '是否為預購商品（true 時前台顯示預購徽章與備註）';
COMMENT ON COLUMN public.products.preorder_notice IS
  '預購出貨說明（例如預計發貨日），僅 is_preorder=true 時建議填寫';
