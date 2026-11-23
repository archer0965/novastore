-- Order idempotency + atomic stock-gated insert (prevent oversell / double-submit)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_uidx
  ON public.orders (client_request_id)
  WHERE client_request_id IS NOT NULL;

COMMENT ON COLUMN public.orders.client_request_id IS
  'Client idempotency token; duplicate submits reuse the same order row';

CREATE OR REPLACE FUNCTION public.insert_store_order_atomic(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid := (p_payload->>'product_id')::uuid;
  v_qty integer := (p_payload->>'quantity')::integer;
  v_stock integer;
  v_ordered integer;
  v_remaining integer;
  v_client_request_id uuid;
  v_row public.orders%ROWTYPE;
BEGIN
  IF p_payload ? 'client_request_id'
     AND NULLIF(trim(p_payload->>'client_request_id'), '') IS NOT NULL THEN
    v_client_request_id := (p_payload->>'client_request_id')::uuid;
  ELSE
    v_client_request_id := NULL;
  END IF;

  IF v_client_request_id IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.orders
    WHERE client_request_id = v_client_request_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'deduped', true,
        'order', to_jsonb(v_row)
      );
    END IF;
  END IF;

  SELECT stock INTO v_stock
  FROM public.products
  WHERE id = v_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'NOT_FOUND',
      'error', '找不到商品'
    );
  END IF;

  IF v_stock IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0)::integer INTO v_ordered
    FROM public.orders
    WHERE product_id = v_product_id;

    v_remaining := v_stock - v_ordered;
    IF v_remaining <= 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'STOCK',
        'error', '已售完',
        'remaining', 0
      );
    END IF;
    IF v_qty > v_remaining THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'STOCK',
        'error', format('庫存不足，目前剩餘 %s 件', v_remaining),
        'remaining', v_remaining
      );
    END IF;
  END IF;

  INSERT INTO public.orders (
    product_id,
    buyer_name,
    quantity,
    total_amount,
    subtotal_amount,
    discount_amount,
    shipping_fee,
    coupon_id,
    coupon_code,
    atm_last5,
    store_type,
    store_info,
    receiver_phone,
    selected_color,
    selected_size,
    items,
    items_summary,
    payment_status,
    payment_type,
    fulfillment_status,
    client_request_id
  ) VALUES (
    v_product_id,
    trim(p_payload->>'buyer_name'),
    v_qty,
    (p_payload->>'total_amount')::numeric,
    NULLIF(p_payload->>'subtotal_amount', '')::numeric,
    COALESCE((p_payload->>'discount_amount')::numeric, 0),
    COALESCE((p_payload->>'shipping_fee')::numeric, 0),
    NULLIF(p_payload->>'coupon_id', '')::uuid,
    NULLIF(p_payload->>'coupon_code', ''),
    p_payload->>'atm_last5',
    p_payload->>'store_type',
    p_payload->>'store_info',
    p_payload->>'receiver_phone',
    COALESCE(p_payload->>'selected_color', ''),
    COALESCE(p_payload->>'selected_size', ''),
    COALESCE(p_payload->'items', '[]'::jsonb),
    COALESCE(p_payload->>'items_summary', ''),
    'pending',
    'atm',
    'unfulfilled',
    v_client_request_id
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'deduped', false,
    'order', to_jsonb(v_row)
  );
EXCEPTION
  WHEN unique_violation THEN
    IF v_client_request_id IS NOT NULL THEN
      SELECT * INTO v_row
      FROM public.orders
      WHERE client_request_id = v_client_request_id;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'deduped', true,
          'order', to_jsonb(v_row)
        );
      END IF;
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'CONFLICT',
      'error', '下單失敗（重複請求）'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_store_order_atomic(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_store_order_atomic(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
