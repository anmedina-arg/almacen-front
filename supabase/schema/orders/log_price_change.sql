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
--
-- #189 (spec #179): products.cost se borra y el costo vive en product_costs. El historial
-- sigue registrando el costo, con dos funciones:
--   - log_price_change (sobre products): INSERT y cambios de precio. El costo del registro
--     es el vigente en product_costs (0 si no hay fila).
--   - log_cost_change (sobre product_costs, ver products/product_costs.sql): cuando se
--     carga, cambia o quita un costo. El precio del registro es el vigente del producto.
-- Nada del código lee esta tabla; sigue siendo historial append-only.
--
-- Aplicado en producción el 2026-08-24, junto con el backfill de las 39
-- filas huérfanas (ver supabase/backfills/supabase_backfill_product_price_history_store_id.sql)
-- — confirmado 1 fila NULL restante (producto huérfano "Pascualina", #750,
-- pendiente de #22), como se esperaba.
-- ============================================================================

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
    VALUES (
      NEW.id, NEW.price,
      COALESCE((SELECT cost FROM product_costs WHERE product_id = NEW.id), 0),
      NOW(), NEW.store_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
      INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
      VALUES (
        NEW.id, NEW.price,
        COALESCE((SELECT cost FROM product_costs WHERE product_id = NEW.id), 0),
        NOW(), NEW.store_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Historial de un cambio de Costo (#189). Dispara AFTER INSERT/UPDATE/DELETE ON product_costs.
-- Quitar el costo se registra como 0. Si el producto ya no existe (borrado en cascada) no hay
-- nada que registrar: la FK de la historia apuntaría a un producto inexistente.
CREATE OR REPLACE FUNCTION log_cost_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT price INTO v_price FROM products WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
    VALUES (OLD.product_id, v_price, 0, NOW(), OLD.store_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' OR OLD.cost IS DISTINCT FROM NEW.cost THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at, store_id)
    VALUES (NEW.product_id, v_price, NEW.cost, NOW(), NEW.store_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
