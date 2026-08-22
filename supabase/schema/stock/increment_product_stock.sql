-- ============================================================================
-- Función RPC: increment_product_stock
-- Dominio: Stock (#83, spec #81, mapa #74) — objeto de prioridad 1
-- ============================================================================
-- Suma una cantidad incremental al stock existente (quantity = quantity +
-- p_increment), a diferencia de upsert_product_stock que reemplaza. Usada
-- por la feature "Ingreso de Stock" (/admin/stock/entry). Tipo de
-- movimiento fijo: 'purchase'.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Cruzado contra su historial:
--   - #17 (supabase_store_scoping_stock.sql): agregó p_store_id.
--   - #17 code review (supabase_fix_stock_scoping_gaps.sql): p_store_id
--     movido a posición temprana, SIN default (mismo razonamiento que
--     upsert_product_stock — ver ese archivo y ADR-0008).
-- La firma de abajo (con p_store_id como 3er parámetro, sin default) es la
-- vigente — confirmado.
--
-- Firma anterior a la actual (histórico, solo referencia):
--   increment_product_stock(integer, numeric, text, integer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id   INTEGER,
  p_increment    NUMERIC(12, 3),
  p_store_id     INTEGER,
  p_notes        TEXT DEFAULT NULL
)
RETURNS public.product_stock
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result  public.product_stock;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Product not found in this store: %', p_product_id;
  END IF;

  IF p_increment <= 0 THEN
    RAISE EXCEPTION 'Increment must be greater than 0, got: %', p_increment;
  END IF;

  PERFORM set_config('app.movement_type', 'purchase', true);

  INSERT INTO public.product_stock (product_id, quantity, updated_by, notes, store_id)
  VALUES (p_product_id, p_increment, v_user_id, p_notes, p_store_id)
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity   = public.product_stock.quantity + EXCLUDED.quantity,
    updated_by = EXCLUDED.updated_by,
    notes      = EXCLUDED.notes,
    store_id   = EXCLUDED.store_id,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, INTEGER, TEXT) TO authenticated;
