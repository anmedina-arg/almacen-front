-- ============================================================================
-- Función trigger: sync_combo_cost
-- Dominio: Combos (#86, spec #81, mapa #74)
-- ============================================================================
-- Dispara AFTER INSERT/UPDATE/DELETE ON combo_components (ver
-- combo_components.sql). Recalcula products.cost del combo como la suma de
-- (cantidad × costo) de cada componente. No gana p_store_id: opera sobre el
-- combo_product_id de la fila que cambió, ya resuelto por el caller — ver
-- nota de #18 en combo_components.sql sobre por qué agregar el parámetro
-- acá sería Speculative Generality sin un caller real que lo necesite.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_combos.sql (PART 1c, creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_combo_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_combo_id INTEGER;
BEGIN
  v_combo_id := COALESCE(NEW.combo_product_id, OLD.combo_product_id);

  UPDATE products
  SET cost = (
    SELECT COALESCE(SUM(cc.quantity * p.cost), 0)
    FROM combo_components cc
    JOIN products p ON p.id = cc.component_product_id
    WHERE cc.combo_product_id = v_combo_id
  )
  WHERE id = v_combo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
