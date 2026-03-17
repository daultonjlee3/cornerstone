-- Materials & Procurement fix-up migration
-- 1) Allow product/location-native transactions without legacy inventory_item_id.
-- 2) Ensure every product has at least one inventory balance at default stock location.

ALTER TABLE public.inventory_transactions
  ALTER COLUMN inventory_item_id DROP NOT NULL;

INSERT INTO public.inventory_balances (
  product_id,
  stock_location_id,
  quantity_on_hand,
  minimum_stock,
  reorder_point
)
SELECT
  p.id,
  sl.id,
  0,
  NULL,
  p.reorder_point_default
FROM public.products p
JOIN public.stock_locations sl
  ON sl.company_id = p.company_id
 AND sl.is_default = true
LEFT JOIN public.inventory_balances ib
  ON ib.product_id = p.id
 AND ib.stock_location_id = sl.id
WHERE ib.id IS NULL;
