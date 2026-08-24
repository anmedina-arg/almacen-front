-- ============================================================================
-- Función RPC: upsert_product_stock
-- Dominio: Stock (#83, spec #81, mapa #74) — objeto de prioridad 1
-- ============================================================================
-- Crea o actualiza el stock de un producto (reemplaza quantity, no suma —
-- para sumar ver increment_product_stock). Verifica membership de
-- store_admins (o super_admin) vía is_store_admin() y que el producto
-- pertenezca a esa Store.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Cruzado contra su historial de
-- issues/fixes:
--   - #17 (supabase_store_scoping_stock.sql): agregó p_store_id.
--   - #17 code review (supabase_fix_stock_scoping_gaps.sql): p_store_id
--     movido a posición temprana, SIN default — is_store_admin(NULL)
--     devuelve true (puente permisivo, ADR-0008), así que un p_store_id
--     opcional hubiera dejado pasar el check de autorización sin querer.
-- La firma de abajo (con p_store_id como 3er parámetro, sin default) es la
-- vigente — confirmado.
--
-- Firma anterior a la actual (histórico, NO ejecutar — solo referencia para
-- quien necesite el DROP FUNCTION exacto si esta firma cambia de nuevo):
--   upsert_product_stock(integer, numeric, numeric, text, text, integer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_product_stock(
  p_product_id INTEGER,
  p_quantity NUMERIC(12, 3),
  p_store_id INTEGER,
  p_min_stock NUMERIC(12, 3) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'manual_adjustment'
)
RETURNS public.product_stock
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result public.product_stock;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  -- Producto debe existir Y pertenecer a la Store del caller — evita que
  -- un admin de la Store A pueda tocar el stock de un product_id de la
  -- Store B adivinando el id.
  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Product not found in this store: %', p_product_id;
  END IF;

  PERFORM set_config('app.movement_type', p_movement_type, true);

  INSERT INTO public.product_stock (
    product_id, quantity, min_stock, updated_by, notes, store_id
  ) VALUES (
    p_product_id, p_quantity, p_min_stock, v_user_id, p_notes, p_store_id
  )
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    min_stock = EXCLUDED.min_stock,
    updated_by = EXCLUDED.updated_by,
    notes = EXCLUDED.notes,
    store_id = EXCLUDED.store_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.upsert_product_stock IS 'Crea o actualiza el stock de un producto, scoped por Store (p_store_id requerido). Verifica membership de store_admins (o super_admin) y que el producto pertenezca a esa Store.';
