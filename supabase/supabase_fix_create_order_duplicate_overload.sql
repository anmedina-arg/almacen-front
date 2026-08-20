-- ============================================================================
-- Fix #70 (hallazgo, no la causa original documentada en el issue): dos
-- create_order() conviviendo como overload en la base.
-- ============================================================================
-- create_order() fue redefinida vía CREATE OR REPLACE FUNCTION en 6 archivos
-- SQL distintos a lo largo del tiempo (ver #49). CREATE OR REPLACE solo
-- reemplaza cuando la firma coincide — supabase_recommendations.sql:190
-- declaró create_order con 4 parámetros (sin p_store_id), distinta de la
-- firma de 5 parámetros de supabase_store_scoping_orders.sql (#16, con
-- p_store_id). Al no coincidir la firma, Postgres las dejó como DOS
-- funciones separadas (overload) en vez de que una reemplace a la otra.
--
-- Confirmado en producción el 2026-08-20 (pg_get_function_identity_arguments):
--   - create_order(p_user_id uuid, p_notes text, p_whatsapp_message text, p_items jsonb)
--     -> INSERT INTO orders sin columna store_id.
--   - create_order(p_user_id uuid, p_notes text, p_whatsapp_message text, p_items jsonb, p_store_id integer)
--     -> la vigente, la que espera src/app/[store]/api/orders/route.ts.
--
-- La ruta SIEMPRE llama con p_store_id incluido, así que en teoría PostgREST
-- debería resolver siempre contra la de 5 parámetros — pero 126 pedidos
-- reales (con whatsapp_message, no pruebas) quedaron con store_id NULL entre
-- el 11/08 y el 19/08, lo que indica que la resolución no fue confiable al
-- 100% (probablemente cache de esquema de PostgREST no refrescado de forma
-- consistente tras aplicar #16). Ver backfill en
-- supabase_backfill_null_store_orders.sql y la traza completa en el comment
-- de #70.
-- ============================================================================

-- 1. Confirmar que efectivamente hay dos antes de borrar nada.
SELECT pg_get_function_identity_arguments(oid) AS argumentos
FROM pg_proc
WHERE proname = 'create_order' AND pronamespace = 'public'::regnamespace;

-- 2. Borrar SOLO la versión vieja (4 parámetros, sin p_store_id).
--    No toca la versión de 5 parámetros que usa la app.
DROP FUNCTION IF EXISTS public.create_order(uuid, text, text, jsonb);

-- 3. Forzar a PostgREST a refrescar su cache de esquema ya mismo.
NOTIFY pgrst, 'reload schema';

-- 4. Verificación: debería devolver una sola fila (la de 5 parámetros).
SELECT pg_get_function_identity_arguments(oid) AS argumentos
FROM pg_proc
WHERE proname = 'create_order' AND pronamespace = 'public'::regnamespace;
