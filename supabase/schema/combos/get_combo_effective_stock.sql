-- ============================================================================
-- Función: get_combo_effective_stock
-- Dominio: Combos (#86, spec #81, mapa #74)
-- ============================================================================
-- Stock virtual de un combo: el mínimo de (stock disponible del componente
-- / cantidad que usa cada unidad de combo), redondeado hacia abajo. Llamada
-- desde get_all_products_with_stock() (Stock, ver
-- supabase/schema/stock/get_all_products_with_stock.sql) — ya recibe
-- p_product_id resuelto por ese caller, scoped por Store desde #17/la
-- regresión de combos. No gana p_store_id propio — mismo razonamiento que
-- sync_combo_cost.sql.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_combos.sql (PART 1d, creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_combo_effective_stock(p_product_id INTEGER)
RETURNS NUMERIC(12, 3) AS $$
  SELECT FLOOR(MIN(COALESCE(ps.quantity, 0) / cc.quantity))
  FROM combo_components cc
  LEFT JOIN product_stock ps ON ps.product_id = cc.component_product_id
  WHERE cc.combo_product_id = p_product_id;
$$ LANGUAGE sql STABLE;
