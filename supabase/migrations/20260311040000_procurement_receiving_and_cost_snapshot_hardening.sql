-- Procurement receiving + cost snapshot hardening
-- Keeps existing flows intact while adding immutable cost snapshot fields.

ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot numeric(14, 2);

UPDATE public.purchase_order_lines
SET unit_cost_snapshot = unit_price
WHERE unit_cost_snapshot IS NULL;

ALTER TABLE public.work_order_part_usage
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot numeric(14, 2);

UPDATE public.work_order_part_usage
SET unit_cost_snapshot = unit_cost
WHERE unit_cost_snapshot IS NULL;

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot numeric(14, 2);

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'purchase_received',
      'receipt_from_po',
      'work_order_usage',
      'part_used_on_work_order',
      'adjustment',
      'transfer_in',
      'transfer_out',
      -- legacy
      'receipt',
      'issue',
      'return'
    )
  );

CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
  p_company_id uuid,
  p_product_id uuid,
  p_stock_location_id uuid,
  p_quantity_change numeric,
  p_transaction_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_unit_cost_snapshot numeric DEFAULT NULL
)
RETURNS TABLE (
  balance_id uuid,
  quantity_on_hand numeric,
  transaction_id uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance_id uuid;
  v_current_qty numeric;
  v_next_qty numeric;
  v_transaction_id uuid;
  v_existing_qty numeric;
  v_existing_balance_id uuid;
  v_existing_tx_id uuid;
BEGIN
  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Quantity change must be non-zero.';
  END IF;

  IF p_transaction_type NOT IN (
    'purchase_received',
    'receipt_from_po',
    'work_order_usage',
    'part_used_on_work_order',
    'adjustment',
    'transfer_in',
    'transfer_out',
    'receipt',
    'issue',
    'return'
  ) THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
    SELECT it.id, ib.id, ib.quantity_on_hand
    INTO v_existing_tx_id, v_existing_balance_id, v_existing_qty
    FROM public.inventory_transactions it
    LEFT JOIN public.inventory_balances ib
      ON ib.product_id = it.product_id
     AND ib.stock_location_id = it.stock_location_id
    WHERE it.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT v_existing_balance_id, COALESCE(v_existing_qty, 0), v_existing_tx_id;
      RETURN;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Product not found for company.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stock_locations sl
    WHERE sl.id = p_stock_location_id
      AND sl.company_id = p_company_id
      AND sl.active = true
  ) THEN
    RAISE EXCEPTION 'Stock location not found, inactive, or outside company scope.';
  END IF;

  INSERT INTO public.inventory_balances (
    product_id,
    stock_location_id,
    quantity_on_hand
  )
  VALUES (p_product_id, p_stock_location_id, 0)
  ON CONFLICT (product_id, stock_location_id) DO NOTHING;

  SELECT ib.id, ib.quantity_on_hand
  INTO v_balance_id, v_current_qty
  FROM public.inventory_balances ib
  WHERE ib.product_id = p_product_id
    AND ib.stock_location_id = p_stock_location_id
  FOR UPDATE;

  v_next_qty := COALESCE(v_current_qty, 0) + p_quantity_change;
  IF v_next_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available %, requested delta %.', COALESCE(v_current_qty, 0), p_quantity_change;
  END IF;

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_next_qty,
      updated_at = now()
  WHERE id = v_balance_id;

  INSERT INTO public.inventory_transactions (
    company_id,
    product_id,
    stock_location_id,
    inventory_item_id,
    quantity_change,
    quantity_delta,
    transaction_type,
    reference_type,
    reference_id,
    notes,
    idempotency_key,
    unit_cost_snapshot
  )
  VALUES (
    p_company_id,
    p_product_id,
    p_stock_location_id,
    NULL,
    p_quantity_change,
    p_quantity_change,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_notes,
    NULLIF(btrim(COALESCE(p_idempotency_key, '')), ''),
    p_unit_cost_snapshot
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_balance_id, v_next_qty, v_transaction_id;
END;
$$;
