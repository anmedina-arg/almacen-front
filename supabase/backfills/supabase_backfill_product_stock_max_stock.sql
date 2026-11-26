-- ============================================================================
-- Backfill #184 (spec #179): el máximo de stock pasa a `product_stock.max_stock`
-- ============================================================================
-- Paso operativo único en producción, DESPUÉS de agregar la columna y su CHECK
-- (ver el encabezado de supabase/schema/stock/product_stock.sql) y ANTES de
-- desplegar el código que lee de ahí. Es idempotente: se puede volver a correr.
--
-- Copia el máximo de cada producto que lo tiene cargado. Si el producto ya tiene
-- fila de stock, solo se completa max_stock (la cantidad no se toca); si no, se
-- crea con quantity = 0 (un combo no tiene stock propio). Con quantity = 0 el
-- trigger de carga inicial no registra ningún movimiento.
--
-- Verificación esperada en producción (relevado el 2026-11-25): ningún producto
-- de ninguna Store tiene max_stock cargado, así que no copia nada.
-- ============================================================================

INSERT INTO public.product_stock (product_id, store_id, quantity, max_stock)
SELECT id, store_id, 0, max_stock FROM public.products WHERE max_stock IS NOT NULL
ON CONFLICT (product_id) DO UPDATE SET max_stock = EXCLUDED.max_stock;
