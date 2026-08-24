-- ============================================================================
-- Backfill #22: cluster huérfano de "Pascualina sin gluten la salteña"
-- ============================================================================
-- El backfill original (#11, supabase_backfill_store_id.sql) asignó
-- store_id a TODO lo que existía en la base al momento de correr ese
-- script (2026-08-10). Un cluster completo — 1 producto, su categoría, sus
-- 2 subcategorías y su fila de stock — quedó fuera porque se creó DESPUÉS
-- de ese backfill pero contra alguna ruta que en ese momento todavía no
-- seteaba store_id (no identificado con precisión cuál; el gap se cerró
-- indirectamente por el resto de los tickets de scoping, #15-#21, que sí
-- fuerzan store_id en sus rutas actuales). Encontrado durante la
-- investigación de #22 (contract: store_id NOT NULL en las 13 tablas).
--
-- Sin ambigüedad de a qué Store pertenece: creado 2026-08-10/11, y
-- "yo-heladerias" (la única otra Store) recién se creó el 2026-08-18 — en
-- la ventana de creación de este cluster, market-del-cevil era la única
-- Store que existía. Mismo criterio de "única Store con actividad real en
-- esa ventana" que #70 (supabase_backfill_null_store_orders.sql).
--
-- Filas:
--   - products.id = 750 ("Pascualina sin gluten la salteña")
--   - categories.id = 12 ("SIN GLUTEN")
--   - subcategories.id IN (47, 48) ("Frescos", "Alfajores y chocolates")
--   - product_stock.id = 3666 (product_id = 750)
--
-- Corrido ANTES de aplicar NOT NULL a store_id en las 13 tablas (#22): es
-- la última fuente de filas NULL en products/categories/subcategories/
-- product_stock, y de rebote en product_price_history (1 fila) y
-- stock_movement_log (2 filas) — ver los backfills de #46/#52, que ya
-- resolvían todo lo demás vía JOIN pero no podían resolver estas por
-- depender de que el producto en sí tuviera store_id primero.
-- ============================================================================

UPDATE products SET store_id = 1 WHERE id = 750 AND store_id IS NULL;
UPDATE categories SET store_id = 1 WHERE id = 12 AND store_id IS NULL;
UPDATE subcategories SET store_id = 1 WHERE id IN (47, 48) AND store_id IS NULL;
UPDATE product_stock SET store_id = 1 WHERE product_id = 750 AND store_id IS NULL;

-- Re-correr los backfills de #46/#52 (JOIN, no default ciego) para que
-- recojan las filas de auditoría del producto que recién se backfilleó.
UPDATE product_price_history pph
SET store_id = p.store_id
FROM products p
WHERE pph.product_id = p.id
  AND pph.store_id IS NULL
  AND p.store_id IS NOT NULL;

UPDATE stock_movement_log sml
SET store_id = ps.store_id
FROM product_stock ps
WHERE sml.product_id = ps.product_id
  AND sml.store_id IS NULL
  AND ps.store_id IS NOT NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Debe devolver 0 filas en las 13 tablas — esta es la última fuente de
-- filas NULL conocida, así que 0 acá habilita el ALTER TABLE ... SET NOT
-- NULL de #22 en las 13.
SELECT 'products' AS table_name, COUNT(*) FROM public.products WHERE store_id IS NULL
UNION ALL SELECT 'categories', COUNT(*) FROM public.categories WHERE store_id IS NULL
UNION ALL SELECT 'subcategories', COUNT(*) FROM public.subcategories WHERE store_id IS NULL
UNION ALL SELECT 'clients', COUNT(*) FROM public.clients WHERE store_id IS NULL
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders WHERE store_id IS NULL
UNION ALL SELECT 'order_items', COUNT(*) FROM public.order_items WHERE store_id IS NULL
UNION ALL SELECT 'order_payments', COUNT(*) FROM public.order_payments WHERE store_id IS NULL
UNION ALL SELECT 'product_stock', COUNT(*) FROM public.product_stock WHERE store_id IS NULL
UNION ALL SELECT 'stock_movement_log', COUNT(*) FROM public.stock_movement_log WHERE store_id IS NULL
UNION ALL SELECT 'product_affinity', COUNT(*) FROM public.product_affinity WHERE store_id IS NULL
UNION ALL SELECT 'category_affinity_rules', COUNT(*) FROM public.category_affinity_rules WHERE store_id IS NULL
UNION ALL SELECT 'product_price_history', COUNT(*) FROM public.product_price_history WHERE store_id IS NULL
UNION ALL SELECT 'combo_components', COUNT(*) FROM public.combo_components WHERE store_id IS NULL
ORDER BY table_name;
