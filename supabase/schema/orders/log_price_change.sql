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
-- Setea store_id desde NEW.store_id (#46) — NEW es la fila de products que
-- disparó el trigger, así que no hace falta ningún lookup/join para
-- resolverlo (a diferencia de un backfill sobre filas ya huérfanas). Ojo:
-- products.store_id todavía es nullable (puente permisivo, ADR-0008,
-- pendiente de #22) — si el producto en sí tiene store_id NULL, la fila
-- nueva de product_price_history también queda NULL. Esto arregla el flujo
-- normal hacia adelante, no reemplaza el backfill de productos huérfanos
-- (#22).
--
-- Gap encontrado el 2026-08-18 durante #15: la fila insertada nunca llevaba
-- store_id, dejando cada cambio de precio real con store_id NULL en
-- product_price_history — bloqueaba el NOT NULL de #22.
-- ============================================================================

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
    VALUES (NEW.id, NEW.price, NEW.cost, NOW(), NEW.store_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.price IS DISTINCT FROM NEW.price) OR (OLD.cost IS DISTINCT FROM NEW.cost) THEN
      INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
      VALUES (NEW.id, NEW.price, NEW.cost, NOW(), NEW.store_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
