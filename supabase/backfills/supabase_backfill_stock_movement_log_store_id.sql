-- ============================================================================
-- Backfill #52: recuperar stock_movement_log.store_id vía join a product_stock
-- ============================================================================
-- log_initial_stock() y log_stock_change() (triggers sobre product_stock,
-- ver supabase/schema/stock/log_initial_stock.sql y log_stock_change.sql)
-- nunca setearon store_id al insertar en stock_movement_log desde su
-- creación (supabase_stock_control.sql) hasta el fix de #52 — cada
-- movimiento de stock real dejaba una fila huérfana. 676 filas confirmadas
-- en producción el 2026-08-24, durante la investigación de #22 (contract:
-- store_id NOT NULL en las 13 tablas).
--
-- Mismo criterio que supabase_backfill_product_price_history_store_id.sql
-- (#46, mismo patrón de bug): JOIN contra product_stock.store_id por fila,
-- no un default ciego a market-del-cevil. Verificado antes de correr: 674
-- de las 676 filas se resuelven así — las 2 restantes son movimientos del
-- producto huérfano "Pascualina" (#750, product_stock.store_id también
-- NULL, ver #22), que quedan sin resolver hasta que ese producto se
-- backfillee.
--
-- 39 filas de #46 vs 676 acá: la diferencia de volumen es esperable —
-- product_price_history solo crece con cambios de precio/costo (evento
-- poco frecuente), stock_movement_log crece con cada venta real vía
-- create_order() (evento frecuente, ver log_stock_change() disparado por
-- el UPDATE de product_stock.quantity en cada venta).
-- ============================================================================

UPDATE stock_movement_log sml
SET store_id = ps.store_id
FROM product_stock ps
WHERE sml.product_id = ps.product_id
  AND sml.store_id IS NULL
  AND ps.store_id IS NOT NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Debería devolver 2 (los movimientos del producto huérfano "Pascualina",
-- pendiente de #22) hasta que ese ticket backfillee ese producto — después
-- de eso, 0. Cualquier otro número significa que el JOIN no encontró
-- product_stock.store_id para esas filas, investigar antes de seguir.
SELECT count(*) AS filas_null_restantes FROM stock_movement_log WHERE store_id IS NULL;
