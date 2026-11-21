-- COD (賣貨便/好賣+) + order payment_type + daily digest dedupe
-- Conceptual mapping (NovaStore):
--   stores          ≈ profiles
--   store_name      ≈ shop_name
--   line_token      ≈ line_channel_access_token / line_user_id
--   products.store_id ≈ products.user_id
--   orders.customer_name ≈ buyer_name
--   orders.phone    ≈ receiver_phone
--   orders.last_5_code ≈ atm_last5
--   payment_status paid ≈ matched
--   shipping_status ≈ fulfillment_status

alter table public.profiles
  add column if not exists enable_cod boolean not null default false;

alter table public.profiles
  add column if not exists cod_url text;

alter table public.profiles
  add column if not exists last_daily_digest_on text;

comment on column public.profiles.enable_cod is
  '啟用超商貨到付款（賣貨便/好賣+）';
comment on column public.profiles.cod_url is
  '賣貨便/好賣+ 外部商品連結';
comment on column public.profiles.last_daily_digest_on is
  'Asia/Taipei YYYY-MM-DD of last daily LINE digest sent';

alter table public.orders
  add column if not exists payment_type text not null default 'atm';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_type_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_type_check
      check (payment_type in ('atm', 'myship_cod'));
  end if;
end $$;

comment on column public.orders.payment_type is
  'atm = ATM 轉帳；myship_cod = 導向賣貨便貨到付款（通常不在本系統建單）';
