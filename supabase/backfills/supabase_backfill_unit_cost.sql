-- ============================================================================
-- BACKFILL: recalcular unit_cost en order_items históricos
-- ============================================================================
--
-- CONTEXTO
-- --------
-- Como consecuencia del bug documentado en supabase_fix_create_order_unit_cost.sql,
-- todos los pedidos creados vía WhatsApp tienen unit_cost = 0.00 en order_items.
-- Este script recalcula ese valor para los registros existentes.
--
-- FÓRMULA
-- -------
-- unit_cost = unit_price × (products.cost / products.price)
--
-- Esta fórmula es correcta para todos los tipos de venta:
--
--   Tipo    | unit_price guardado       | Resultado
--   --------|---------------------------|----------------------------------
--   unit    | product.price             | cost/price × price      = cost
--   100gr   | product.price / 100       | cost/price × price/100  = cost/100
--   kg      | product.price / 1000      | cost/price × price/1000 = cost/1000
--
-- El ratio (cost / price) normaliza automáticamente independientemente del
-- tipo de venta, porque unit_price ya viene normalizado a la misma base.
--
-- CONDICIONES DEL UPDATE
-- ----------------------
-- Solo actualiza filas donde:
--   - unit_cost = 0           → no sobreescribe snapshots históricos válidos
--   - product.cost > 0        → el producto tiene costo cargado
--   - product.price > 0       → evita división por cero
--
-- CUÁNDO EJECUTAR
-- ---------------
-- Una única vez, DESPUÉS de haber ejecutado supabase_fix_create_order_unit_cost.sql.
-- Es idempotente: si se ejecuta más de una vez no produce efectos incorrectos
-- (solo toca filas con unit_cost = 0).
--
-- VERIFICACIÓN POST-EJECUCIÓN
-- ---------------------------
-- SELECT o.id, oi.product_name, oi.unit_price, oi.unit_cost, oi.subtotal
-- FROM order_items oi
-- JOIN orders o ON o.id = oi.order_id
-- WHERE oi.unit_cost = 0
-- LIMIT 20;
--
-- Si la query devuelve filas, esos productos tienen cost = 0 en la tabla
-- products (precio de costo no cargado en el admin).
-- ============================================================================

UPDATE order_items oi
SET unit_cost = oi.unit_price * (p.cost / NULLIF(p.price, 0))
FROM products p
WHERE oi.product_id = p.id
  AND oi.unit_cost = 0       -- solo corrige registros sin costo capturado
  AND p.cost  > 0            -- producto tiene costo cargado
  AND p.price > 0;           -- evita división por cero

-- ============================================================================
-- TRIGGER DE SINCRONIZACIÓN FUTURA (opcional pero recomendado)
-- ============================================================================
-- Instala un trigger que, cuando el admin actualice products.cost en el futuro,
-- recalcula automáticamente unit_cost para order_items previos con unit_cost = 0.
-- Útil para pedidos de productos cuyo costo se cargue después de la venta.
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

DROP TRIGGER IF EXISTS trg_sync_order_items_cost ON products;
CREATE TRIGGER trg_sync_order_items_cost
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_items_unit_cost();
