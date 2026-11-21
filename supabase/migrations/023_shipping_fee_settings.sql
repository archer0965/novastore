-- Shipping fee + free-shipping threshold (profiles ≈ stores)
alter table public.profiles
  add column if not exists shipping_fee numeric(12, 0) not null default 0;

alter table public.profiles
  add column if not exists free_shipping_enabled boolean not null default false;

alter table public.profiles
  add column if not exists free_shipping_threshold numeric(12, 0);

comment on column public.profiles.shipping_fee is
  '預設固定運費（新台幣）；0 表示不另外收運費';
comment on column public.profiles.free_shipping_enabled is
  '是否啟用滿額免運';
comment on column public.profiles.free_shipping_threshold is
  '滿額免運門檻；null 或 0 且開啟時視為全館免運';

-- Per-order shipping charged
alter table public.orders
  add column if not exists shipping_fee numeric(12, 0) not null default 0;

comment on column public.orders.shipping_fee is
  '該筆訂單實際收取運費（免運時為 0）';
comment on column public.orders.subtotal_amount is
  '商品小計（折抵前）';
comment on column public.orders.discount_amount is
  '優惠折抵';
comment on column public.orders.total_amount is
  '應付總額 = 商品小計 - 折抵 + 運費';
