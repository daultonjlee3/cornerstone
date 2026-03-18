-- Work order number sequence and generator
-- Ensures globally unique, monotonically increasing work_order_number values.

CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq
  INCREMENT BY 1
  MINVALUE 1000
  NO MAXVALUE
  START WITH 1000
  OWNED BY NONE;

-- Align the sequence to at least the current maximum numeric portion of existing work_order_number values.
DO $$
DECLARE
  max_existing bigint;
BEGIN
  SELECT max(sub.num) INTO max_existing
  FROM (
    SELECT
      regexp_replace(work_order_number, '\D', '', 'g')::bigint AS num
    FROM public.work_orders
    WHERE work_order_number IS NOT NULL
      AND work_order_number <> ''
      AND regexp_replace(work_order_number, '\D', '', 'g') ~ '^[0-9]+$'
  ) AS sub;

  IF max_existing IS NOT NULL THEN
    PERFORM setval('public.work_order_number_seq', GREATEST(max_existing, 1000));
  ELSE
    PERFORM setval('public.work_order_number_seq', 1000);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Stable function for app usage; keeps format compatible with existing "WO-<number>" pattern.
CREATE OR REPLACE FUNCTION public.next_work_order_number(p_company_id uuid)
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'WO-' || nextval('public.work_order_number_seq')::text;
$$;

GRANT EXECUTE ON FUNCTION public.next_work_order_number(uuid) TO authenticated;

