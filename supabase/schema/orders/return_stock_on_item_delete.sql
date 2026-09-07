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
--
-- #73: la devolución de stock (combo-aware) se extrajo a
-- return_order_stock() — vivía duplicada acá, en cancel_order() y en
-- adjust_stock_on_item_update() (rama de baja de cantidad). Sin cambio de
-- comportamiento.
-- ============================================================================

CREATE OR REPLACE FUNCTION return_stock_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
BEGIN
  SELECT status INTO v_order_status FROM orders WHERE id = OLD.order_id;

  IF v_order_status != 'pending' THEN
    RETURN OLD;
  END IF;

  IF OLD.product_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM set_config('app.movement_type', 'return', true);
  PERFORM return_order_stock(OLD.product_id, OLD.quantity, OLD.store_id);

  RETURN OLD;
END;
$$;
