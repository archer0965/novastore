-- Optional buyer-facing label for external checkout link
-- (賣貨便 / 好賣+ / 蝦皮 / 其他專屬連結)
alter table public.profiles
  add column if not exists cod_label text;

comment on column public.profiles.enable_cod is
  '啟用外部結帳連結（賣貨便／好賣+／蝦皮／其他專屬連結）';
comment on column public.profiles.cod_url is
  '外部結帳網址（賣貨便、好賣+、蝦皮或其他專屬連結）';
comment on column public.profiles.cod_label is
  '買家結帳頁顯示的選項名稱，例如：蝦皮下單、7-11 賣貨便';
