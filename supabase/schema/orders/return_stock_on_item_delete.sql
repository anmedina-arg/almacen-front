-- ============================================================================
-- Función trigger: return_stock_on_item_delete
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara BEFORE DELETE ON order_items (ver order_items.sql). Solo devuelve
-- stock para órdenes 'pending' (admin borra un ítem). Combo-aware: devuelve
-- a cada componente si el producto es combo.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22: la
-- versión vigente es la combo-aware de supabase_combos.sql (PART 1i), NO
-- la versión simple de supabase_orders_v2.sql (PART 5) — mismo reemplazo
-- limpio que cancel_order/adjust_stock_on_item_update.
--
-- #97 (ADR-0012): con is_stock_tracked(OLD.store_id) = false, no devuelve
-- stock — mismo criterio que create_order.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION return_stock_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
  v_is_combo     BOOLEAN;
  v_component    RECORD;
BEGIN
  SELECT status INTO v_order_status FROM orders WHERE id = OLD.order_id;

  IF v_order_status != 'pending' THEN
    RETURN OLD;
  END IF;

  IF OLD.product_id IS NULL THEN
    RETURN OLD;
  END IF;

  IF NOT is_stock_tracked(OLD.store_id) THEN
    RETURN OLD;
  END IF;

  PERFORM set_config('app.movement_type', 'return', true);

  SELECT is_combo INTO v_is_combo FROM products WHERE id = OLD.product_id;

  IF v_is_combo THEN
    FOR v_component IN
      SELECT * FROM combo_components WHERE combo_product_id = OLD.product_id
    LOOP
      UPDATE product_stock
      SET quantity = quantity + (OLD.quantity * v_component.quantity)
      WHERE product_id = v_component.component_product_id;
    END LOOP;
  ELSE
    UPDATE product_stock
    SET quantity = quantity + OLD.quantity
    WHERE product_id = OLD.product_id;
  END IF;

  RETURN OLD;
END;
$$;
