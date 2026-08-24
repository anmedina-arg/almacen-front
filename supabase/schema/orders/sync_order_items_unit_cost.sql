-- ============================================================================
-- Función trigger: sync_order_items_unit_cost
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara AFTER UPDATE ON products (tabla del dominio Products, #85 — la
-- sentencia CREATE TRIGGER que la ata a products le corresponde a ese
-- ticket cuando arme products.sql; ver nota en el README de este dominio).
-- Cuando cambia products.cost, sincroniza unit_cost en los order_items
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
BEGIN
  IF (OLD.cost IS DISTINCT FROM NEW.cost) AND NEW.cost > 0 AND NEW.price > 0 THEN
    UPDATE order_items
    SET unit_cost = unit_price * (NEW.cost / NEW.price)
    WHERE product_id = NEW.id
      AND unit_cost = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
