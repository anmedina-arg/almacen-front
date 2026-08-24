-- ============================================================================
-- Backfill #70: recuperar los pedidos con store_id NULL hacia market-del-cevil
-- ============================================================================
-- 126 pedidos reales (whatsapp_message no nulo) quedaron con store_id NULL
-- entre el 11/08 y el 19/08/2026 por el overload de create_order() — ver
-- supabase_fix_create_order_duplicate_overload.sql. Confirmado con Andrés
-- (2026-08-20): en esa ventana la única Store con actividad real de pedidos
-- era market-del-cevil, así que el backfill no tiene ambigüedad de a qué
-- Store pertenecen.
--
-- Correr DESPUÉS de supabase_fix_create_order_duplicate_overload.sql (no es
-- estrictamente necesario en ese orden, pero mantiene la traza cronológica:
-- primero cortar la sangría, después recuperar lo perdido).
-- ============================================================================

-- 0. Contar antes de tocar nada (para comparar con el resultado del UPDATE).
SELECT count(*) AS ordenes_null FROM public.orders WHERE store_id IS NULL;
SELECT count(*) AS items_null FROM public.order_items WHERE store_id IS NULL;

-- 1. Backfill orders.store_id
UPDATE public.orders
SET store_id = (SELECT id FROM public.stores WHERE slug = 'market-del-cevil')
WHERE store_id IS NULL;

-- 2. Backfill order_items.store_id, heredado del order ya corregido
--    (join por order_id, no un blanket UPDATE — así ningún item queda
--    desalineado de su order si alguna vez hay una excepción real).
UPDATE public.order_items oi
SET store_id = o.store_id
FROM public.orders o
WHERE oi.order_id = o.id
  AND oi.store_id IS NULL
  AND o.store_id IS NOT NULL;

-- 3. Verificación: ambos deberían dar 0 ahora.
SELECT count(*) AS ordenes_null_restantes FROM public.orders WHERE store_id IS NULL;
SELECT count(*) AS items_null_restantes FROM public.order_items WHERE store_id IS NULL;
