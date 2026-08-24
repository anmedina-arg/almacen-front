-- ============================================================================
-- Función RPC: get_low_stock_products
-- Dominio: Stock (#83, spec #81, mapa #74) — objeto de prioridad 1
-- ============================================================================
-- Retorna productos activos de una Store con stock por debajo del mínimo
-- configurado, ordenados por ratio quantity/min_stock ascendente (más
-- crítico primero).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Cruzado contra su historial:
--   - #17 (supabase_store_scoping_stock.sql): agregó p_store_id (requerido,
--     sin default). Sin fixes posteriores — esta función no se vio afectada
--     por la regresión de combos de get_all_products_with_stock (no incluye
--     combos en su resultado, por diseño: un combo no tiene min_stock propio).
-- Filtra por products.store_id.
--
-- NOTA: `docs/agents/schema-changes.md` la marca junto a upsert_product_stock
-- como objeto de "cobertura indirecta" únicamente (sin tests que ejerciten
-- casos borde de cantidad) — ver spec #81, sección Testing Decisions.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_store_id INTEGER)
RETURNS TABLE (
  product_id INTEGER,
  product_name TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  main_category TEXT
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
    ps.product_id,
    p.name::TEXT AS product_name,
    ps.quantity,
    ps.min_stock,
    p.main_category::TEXT
  FROM public.product_stock ps
  JOIN public.products p ON p.id = ps.product_id
  WHERE p.store_id = p_store_id
    AND ps.min_stock IS NOT NULL
    AND ps.quantity <= ps.min_stock
    AND p.active = true
  ORDER BY (ps.quantity / NULLIF(ps.min_stock, 0)) ASC;
END;
$$;

COMMENT ON FUNCTION public.get_low_stock_products IS 'Retorna productos activos de una Store con stock por debajo del mínimo. Filtra por products.store_id.';
