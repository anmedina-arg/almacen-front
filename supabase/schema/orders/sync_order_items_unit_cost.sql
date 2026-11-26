-- ============================================================================
-- Función trigger: sync_order_items_unit_cost
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara AFTER INSERT/UPDATE ON product_costs (ver products/product_costs.sql). Hasta #189
-- disparaba sobre products cuando cambiaba la columna products.cost, que se borra: el costo
-- vive en product_costs. Misma firma (RETURNS TRIGGER), el CREATE OR REPLACE la reemplaza.
-- Cuando se carga o cambia el costo de un producto, sincroniza unit_cost en los order_items
-- existentes que todavía tengan unit_cost = 0 (snapshot histórico
-- respetado si ya tiene costo capturado). Normaliza por el ratio cost/price
-- para que funcione tanto para POS (unit_price = price) como WhatsApp
-- (unit_price normalizado por gramo).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_pricing.sql/supabase_backfill_unit_cost.sql
-- (ambos la redefinían de forma idéntica).
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_order_items_unit_cost()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  IF NEW.cost > 0 AND (TG_OP = 'INSERT' OR OLD.cost IS DISTINCT FROM NEW.cost) THEN
    SELECT price INTO v_price FROM products WHERE id = NEW.product_id;
    IF v_price > 0 THEN
      UPDATE order_items
      SET unit_cost = unit_price * (NEW.cost / v_price)
      WHERE product_id = NEW.product_id
        AND unit_cost = 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
