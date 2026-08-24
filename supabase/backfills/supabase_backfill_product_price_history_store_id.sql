-- ============================================================================
-- Backfill #46: recuperar product_price_history.store_id vía join a products
-- ============================================================================
-- log_price_change() (trigger sobre products, ver
-- supabase/schema/orders/log_price_change.sql) nunca seteó store_id al
-- insertar en product_price_history desde su creación (supabase_pricing.sql)
-- hasta el fix de #46 — cada cambio de precio/costo real dejaba una fila
-- huérfana. 39 filas confirmadas en producción el 2026-08-24, durante la
-- investigación de #22 (contract: store_id NOT NULL en las 13 tablas).
--
-- A diferencia del backfill original (#11, supabase_backfill_store_id.sql —
-- "todo pertenece a market-del-cevil", único criterio posible en ese
-- momento porque no había ambigüedad), acá SÍ hay una fuente más precisa
-- disponible: cada fila de product_price_history tiene product_id, y el
-- producto correspondiente casi siempre ya tiene su propio store_id
-- correcto. Se usa un JOIN en vez de un default ciego — deriva el store_id
-- real de cada fila en vez de asumir.
--
-- 38 de las 39 filas se resuelven así. La fila restante (product_id=750,
-- "Pascualina sin gluten la salteña") no se puede resolver por join porque
-- el producto EN SÍ está huérfano (store_id NULL) — mismo cluster
-- encontrado durante #22 (producto + categoría "SIN GLUTEN" + 2
-- subcategorías + su product_stock, todos creados 2026-08-10/11, sin
-- backfillear por #11 en su momento). Esa fila se resuelve cuando #22
-- backfillee ese producto — no acá, para no mezclar el criterio "derivado
-- por join" con un criterio "asumido" en el mismo script.
--
-- Corrido en test primero, luego en producción, ambos vía SQL Editor de
-- Supabase (a diferencia de supabase_backfill_store_id.sql, este UPDATE no
-- necesita el patrón de PROCEDURE en lotes con COMMIT — 39 filas es
-- trivial, no hay riesgo de lock largo).
-- ============================================================================

UPDATE product_price_history pph
SET store_id = p.store_id
FROM products p
WHERE pph.product_id = p.id
  AND pph.store_id IS NULL
  AND p.store_id IS NOT NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Debería devolver 1 (la fila de product_id=750, pendiente de #22) hasta
-- que ese ticket backfillee el producto huérfano — después de eso, 0.
SELECT count(*) AS filas_null_restantes FROM product_price_history WHERE store_id IS NULL;
