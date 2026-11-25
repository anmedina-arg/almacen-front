-- ============================================================================
-- Función trigger: sync_combo_cost
-- Dominio: Combos (#86, spec #81, mapa #74; reescrita en #183, spec #179)
-- ============================================================================
-- Dispara AFTER INSERT/UPDATE/DELETE ON combo_components (ver
-- combo_components.sql). Recalcula el Costo del combo como la suma de
-- (cantidad × costo) de cada componente que tiene Costo registrado. No gana
-- p_store_id: opera sobre el combo_product_id de la fila que cambió, ya
-- resuelto por el caller — ver nota de #18 en combo_components.sql sobre por
-- qué agregar el parámetro acá sería Speculative Generality sin un caller real
-- que lo necesite.
--
-- Desde #183 el Costo vive en product_costs (ver products/product_costs.sql):
-- esta función lee los costos de los componentes de esa tabla y escribe el del
-- combo ahí. Si la suma da 0 (ningún componente con costo), el combo queda
-- "sin costo registrado": se borra su fila en vez de guardar un cero. El
-- espejo hacia products.cost lo mantiene el trigger de product_costs.
--
-- Hasta #187 el cálculo corre siempre; ahí pasa a depender de la flag `costos`.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 (versión
-- anterior, que escribía products.cost directo).
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_combo_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_combo_id INTEGER;
  v_cost     NUMERIC;
BEGIN
  v_combo_id := COALESCE(NEW.combo_product_id, OLD.combo_product_id);

  SELECT COALESCE(SUM(cc.quantity * pc.cost), 0)
  INTO v_cost
  FROM combo_components cc
  JOIN product_costs pc ON pc.product_id = cc.component_product_id
  WHERE cc.combo_product_id = v_combo_id;

  IF v_cost > 0 THEN
    INSERT INTO product_costs (product_id, store_id, cost)
    SELECT p.id, p.store_id, v_cost
    FROM products p
    WHERE p.id = v_combo_id
    ON CONFLICT (product_id, store_id) DO UPDATE SET cost = EXCLUDED.cost;
  ELSE
    DELETE FROM product_costs WHERE product_id = v_combo_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql
SET search_path = public;  -- search_path fijo (advisor function_search_path_mutable, 2026-11-10).
