-- Multi-variant line items on store orders

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS items_summary TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.orders.items IS
  '購買明細 JSON：[{ "color": "黑", "size": "M", "quantity": 1 }, ...]';
COMMENT ON COLUMN public.orders.items_summary IS
  '購買明細摘要文字（後台／LINE 顯示用）';

-- Backfill from legacy single-variant columns
UPDATE public.orders
SET
  items = jsonb_build_array(
    jsonb_build_object(
      'color', COALESCE(NULLIF(TRIM(selected_color), ''), ''),
      'size', COALESCE(NULLIF(TRIM(selected_size), ''), ''),
      'quantity', quantity
    )
  ),
  items_summary = TRIM(
    BOTH ' · ' FROM CONCAT_WS(
      ' · ',
      NULLIF(
        TRIM(
          BOTH ' / ' FROM CONCAT_WS(
            ' / ',
            NULLIF(TRIM(selected_color), ''),
            NULLIF(TRIM(selected_size), '')
          )
        ),
        ''
      ) || CASE
        WHEN COALESCE(NULLIF(TRIM(selected_color), ''), NULLIF(TRIM(selected_size), '')) IS NOT NULL
          THEN ' ×' || quantity::text
        ELSE '共 ' || quantity::text || ' 件'
      END
    )
  )
WHERE items = '[]'::jsonb
  AND quantity > 0;

NOTIFY pgrst, 'reload schema';
