-- Idempotent ECPay payment callbacks (prevent double subscription extension)
create table if not exists public.ecpay_processed_trades (
  merchant_trade_no text primary key,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  rtn_code text,
  plan_field text,
  created_at timestamptz not null default now()
);

create index if not exists ecpay_processed_trades_seller_id_idx
  on public.ecpay_processed_trades (seller_id);

alter table public.ecpay_processed_trades enable row level security;
