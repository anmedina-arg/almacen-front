-- ============================================================================
-- Función trigger: recalculate_order_total
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara AFTER INSERT/UPDATE/DELETE ON order_items (ver order_items.sql).
-- Recalcula orders.total sumando quantity*unit_price de todos los ítems de
-- la orden. create_order() también setea total explícitamente al final,
-- pero este trigger es la fuente de verdad para cualquier cambio posterior
-- (admin edita/borra ítems).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_orders.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  target_order_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_order_id := OLD.order_id;
  ELSE
    target_order_id := NEW.order_id;
  END IF;

  UPDATE orders
  SET total = COALESCE(
    (SELECT SUM(quantity * unit_price)
     FROM order_items
     WHERE order_id = target_order_id),
    0
  )
  WHERE id = target_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
