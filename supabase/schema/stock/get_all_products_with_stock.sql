-- ============================================================================
-- Función RPC: get_all_products_with_stock
-- Dominio: Stock (#83, spec #81, mapa #74) — objeto de prioridad 1
-- ============================================================================
-- Retorna todos los productos de una Store con su stock (LEFT JOIN — incluye
-- productos sin fila propia en product_stock). Combos muestran stock
-- virtual vía get_combo_effective_stock() (dominio Combos, #86) en vez de
-- su fila de product_stock, que un combo normalmente no tiene.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Cruzado contra su historial:
--   - #17 (supabase_store_scoping_stock.sql): agregó p_store_id (requerido,
--     sin default — no hay caller legacy).
--   - Regresión post-#17 (supabase_fix_get_all_products_with_stock_combo_regression.sql):
--     al agregar p_store_id se reescribió la función basándose en el archivo
--     original sin soporte de combos en vez de en la definición vigente real,
--     perdiendo silenciosamente la lógica de stock virtual que
--     supabase_combos.sql (PART 1e) había agregado antes. Corregido — la
--     definición de abajo tiene ambas cosas (store scoping + combos).
-- Filtra por products.store_id, no product_stock.store_id — evita ocultar
-- stock existente cuyo store_id todavía no se haya backfilleado.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_products_with_stock(p_store_id INTEGER)
RETURNS TABLE (
  stock_id BIGINT,
  product_id INTEGER,
  product_name TEXT,
  product_price NUMERIC,
  main_category TEXT,
  product_active BOOLEAN,
  product_image TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  is_low_stock BOOLEAN,
  updated_by UUID,
  updated_by_name TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ps.id AS stock_id,
    p.id AS product_id,
    p.name AS product_name,
    p.price AS product_price,
    p.main_category,
    p.active AS product_active,
    p.image AS product_image,
    CASE
      WHEN p.is_combo THEN
        CASE WHEN p.max_stock IS NOT NULL
          THEN LEAST(public.get_combo_effective_stock(p.id), p.max_stock)
          ELSE public.get_combo_effective_stock(p.id)
        END
      ELSE ps.quantity
    END AS quantity,
    ps.min_stock,
    CASE
      WHEN p.is_combo THEN false
      WHEN ps.min_stock IS NOT NULL AND ps.quantity IS NOT NULL
        AND ps.quantity <= ps.min_stock
      THEN true
      ELSE false
    END AS is_low_stock,
    ps.updated_by,
    pr.full_name AS updated_by_name,
    ps.notes,
    ps.updated_at
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id
  LEFT JOIN public.profiles pr ON pr.id = ps.updated_by
  WHERE p.store_id = p_store_id
  ORDER BY p.name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_all_products_with_stock IS 'Retorna los productos de una Store con su stock (LEFT JOIN). Combos muestran stock virtual (get_combo_effective_stock). Filtra por products.store_id, no product_stock.store_id — evita ocultar stock cuyo store_id no se haya backfilleado todavía.';
