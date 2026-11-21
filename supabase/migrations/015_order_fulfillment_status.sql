-- Store order fulfillment tracking for NovaStore sellers

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled', 'fulfilled'));

CREATE INDEX IF NOT EXISTS orders_fulfillment_status_idx
  ON public.orders (fulfillment_status);

COMMENT ON COLUMN public.orders.fulfillment_status IS
  '出貨狀態：unfulfilled=未出貨，fulfilled=已出貨';
