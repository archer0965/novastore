-- 商品顏色／尺寸附加選項 + 訂單選取結果

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_options TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS size_options TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS selected_color TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS selected_size TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.products.color_options IS '可選顏色列表（賣家設定）';
COMMENT ON COLUMN public.products.size_options IS '可選尺寸列表（賣家設定）';
COMMENT ON COLUMN public.orders.selected_color IS '買家選擇的顏色';
COMMENT ON COLUMN public.orders.selected_size IS '買家選擇的尺寸';

NOTIFY pgrst, 'reload schema';
