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
--
-- #164 (definición viva re-verificada con pg_get_functiondef contra
-- producción el 2026-11-05: idéntica a la de este archivo antes del cambio):
-- cuando se elimina el pedido entero, los ítems se borran por
-- ON DELETE CASCADE *después* de que la fila de orders ya no existe. El
-- SELECT de abajo deja v_order_status en NULL, y con `!=` el IF no cortaba
-- (`NULL != 'pending'` es NULL): el trigger devolvía stock en cualquier
-- estado, también para un pedido cancelado que ya lo había devuelto (pasó
-- en producción el 2026-10-31, stock duplicado). Ahora el chequeo es
-- IS DISTINCT FROM: sin orden, no devuelve nada. La devolución al eliminar
-- un pedido *pendiente* la hace return_stock_on_order_delete() (BEFORE
-- DELETE ON orders, cuando los ítems todavía existen) — este trigger queda
-- solo para borrar un ítem suelto de un pedido pendiente.
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

  -- NULL = la orden ya no existe (cascade de un DELETE sobre orders): no es
  -- este trigger el que devuelve, ver header (#164).
  IF v_order_status IS DISTINCT FROM 'pending' THEN
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
