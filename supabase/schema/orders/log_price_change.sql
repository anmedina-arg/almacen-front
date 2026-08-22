-- ============================================================================
-- Función trigger: log_price_change
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara AFTER INSERT/UPDATE ON products (tabla del dominio Products, #85
-- — la sentencia CREATE TRIGGER que la ata a products le corresponde a ese
-- ticket cuando arme products.sql; ver nota en el README de este dominio).
-- Registra en product_price_history (ver product_price_history.sql) cada
-- vez que cambia price o cost, o en cada INSERT.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_pricing.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at)
    VALUES (NEW.id, NEW.price, NEW.cost, NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.price IS DISTINCT FROM NEW.price) OR (OLD.cost IS DISTINCT FROM NEW.cost) THEN
      INSERT INTO product_price_history (product_id, sale_price, cost, changed_at)
      VALUES (NEW.id, NEW.price, NEW.cost, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
