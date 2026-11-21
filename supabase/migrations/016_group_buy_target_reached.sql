-- 團購達標追蹤：current_quantity + is_target_reached（避免重複通知）

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS current_quantity INTEGER NOT NULL DEFAULT 0
    CHECK (current_quantity >= 0);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_target_reached BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.current_quantity IS '團購目前已累積訂購數量';
COMMENT ON COLUMN public.products.is_target_reached IS '是否已達成團門檻（用於只通知一次）';
COMMENT ON COLUMN public.products.target_quantity IS '團購目標成團數量（件）';

-- 回填累積數量與達標旗標
UPDATE public.products p
SET current_quantity = COALESCE(s.qty, 0)
FROM (
  SELECT product_id, COALESCE(SUM(quantity), 0)::INTEGER AS qty
  FROM public.orders
  GROUP BY product_id
) s
WHERE p.id = s.product_id;

UPDATE public.products
SET is_target_reached = true
WHERE mode = 'group_buy'
  AND target_quantity IS NOT NULL
  AND current_quantity >= target_quantity
  AND is_target_reached = false;

UPDATE public.products
SET is_target_reached = true
WHERE mode = 'group_buy'
  AND status = 'success'
  AND is_target_reached = false;

-- 觸發器：下單後同步 current_quantity，達標時標記 success
-- is_target_reached 由應用層原子更新，用於只發送一次 LINE 通知
CREATE OR REPLACE FUNCTION public.refresh_group_buy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_sum INTEGER;
BEGIN
  SELECT mode, target_quantity, status
    INTO v_mode, v_target, v_status
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_sum
  FROM public.orders
  WHERE product_id = NEW.product_id;

  UPDATE public.products
  SET current_quantity = v_sum
  WHERE id = NEW.product_id;

  IF v_mode = 'group_buy'
     AND v_status = 'active'
     AND v_target IS NOT NULL
     AND v_sum >= v_target THEN
    UPDATE public.products
    SET status = 'success', current_quantity = v_sum
    WHERE id = NEW.product_id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_refresh_group_buy ON public.orders;
CREATE TRIGGER orders_refresh_group_buy
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.refresh_group_buy_status();

NOTIFY pgrst, 'reload schema';
