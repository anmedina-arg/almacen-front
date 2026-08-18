-- ============================================================================
-- Backfill de store_id: alta de Market del Cevil + asignación de datos existentes
-- Ticket: #11 (https://github.com/anmedina-arg/almacen-front/issues/11)
-- ============================================================================
-- Requiere: supabase_multitenant_schema_expand.sql (#10) ya aplicado.
--
-- Da de alta la primera Store (Market del Cevil) y asigna su store_id a TODAS
-- las filas existentes en las 13 tablas de negocio — hoy no hay ambigüedad:
-- todo lo que existe en la base pertenece a esta Store.
--
-- El backfill corre en lotes commiteados por separado (no una transacción
-- única) vía un PROCEDURE con COMMIT dentro del loop, para no sostener un
-- lock largo sobre tablas con más filas. Es idempotente y reanudable: cada
-- lote solo toca filas con store_id IS NULL, así que correr la misma CALL
-- de nuevo (tabla completa o cortada a mitad de camino) es seguro.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST (ver docs/ops/), verificar 0 filas
-- con store_id IS NULL, y recién después en producción.
--
-- IMPORTANTE: correr este archivo vía scripts/run-backfill-store-id.sh (psql),
-- NO pegándolo en el SQL Editor de Supabase. El SQL Editor envuelve todo el
-- script pegado en una única transacción explícita, lo que rompe el COMMIT
-- dentro del loop del PROCEDURE (confirmado empíricamente: ERROR 2D000
-- invalid transaction termination). psql sí ejecuta cada sentencia de nivel
-- superior del archivo en su propia transacción autocommiteada, que es lo
-- que este backfill necesita.
-- ============================================================================

-- ── 1. Alta de la Store (idempotente por slug) ─────────────────────────
INSERT INTO public.stores (slug, name)
VALUES ('market-del-cevil', 'Market del Cevil')
ON CONFLICT (slug) DO NOTHING;


-- ── 2. Procedure de backfill en lotes ───────────────────────────────────
-- Cada lote se identifica por ctid (identificador físico de fila), no por
-- primary key: no las 13 tablas comparten una PK uniforme (product_affinity
-- tiene PK compuesta product_id_a/product_id_b, sin columna id) — un batching
-- por PK necesitaría un caso especial por tabla. ctid capturado DENTRO de la
-- misma sentencia UPDATE (no en un paso separado previo) es seguro: no hay
-- ventana de tiempo entre "seleccionar" y "actualizar" donde otra transacción
-- pueda invalidar esos ctid.
CREATE OR REPLACE PROCEDURE public.backfill_store_id_batch(
  p_table       TEXT,
  p_store_slug  TEXT,
  p_batch_size  INTEGER DEFAULT 500
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_store_id INTEGER;
  v_rows     INTEGER;
BEGIN
  SELECT id INTO v_store_id FROM public.stores WHERE slug = p_store_slug;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Store con slug % no existe', p_store_slug;
  END IF;

  LOOP
    EXECUTE format(
      'UPDATE public.%I SET store_id = %s
       WHERE ctid = ANY(ARRAY(
         SELECT ctid FROM public.%I WHERE store_id IS NULL LIMIT %s
       ))',
      p_table, v_store_id, p_table, p_batch_size
    );

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE NOTICE '%: % filas actualizadas', p_table, v_rows;

    COMMIT;

    EXIT WHEN v_rows = 0;
  END LOOP;
END;
$$;

-- Postgres le da EXECUTE a PUBLIC por default en funciones/procedures nuevos
-- (a diferencia de las tablas) y Supabase notifica a PostgREST para recargar
-- su schema cache en cada cambio de DDL — mientras este procedure exista
-- podría quedar expuesto brevemente como endpoint RPC invocable con la anon
-- key, con cualquier p_table/p_store_slug, no solo los de las CALL de abajo.
-- Se lo revocamos apenas se crea; no afecta las CALL de este mismo script,
-- que corren como el rol dueño de la sesión (no como anon/authenticated).
REVOKE EXECUTE ON PROCEDURE public.backfill_store_id_batch(TEXT, TEXT, INTEGER) FROM PUBLIC;


-- ── 3. Backfill de las 13 tablas ────────────────────────────────────────
-- Misma lista autoritativa que supabase_multitenant_schema_expand.sql (#10)
-- y TABLES_WITH_STORE_ID en src/test/integration/backfill-store-id.test.ts
-- (y multitenant-schema.test.ts) — mantener las tres en sync.
CALL public.backfill_store_id_batch('products', 'market-del-cevil');
CALL public.backfill_store_id_batch('categories', 'market-del-cevil');
CALL public.backfill_store_id_batch('subcategories', 'market-del-cevil');
CALL public.backfill_store_id_batch('clients', 'market-del-cevil');
CALL public.backfill_store_id_batch('orders', 'market-del-cevil');
CALL public.backfill_store_id_batch('order_items', 'market-del-cevil');
CALL public.backfill_store_id_batch('order_payments', 'market-del-cevil');
CALL public.backfill_store_id_batch('product_stock', 'market-del-cevil');
CALL public.backfill_store_id_batch('stock_movement_log', 'market-del-cevil');
CALL public.backfill_store_id_batch('product_affinity', 'market-del-cevil');
CALL public.backfill_store_id_batch('category_affinity_rules', 'market-del-cevil');
CALL public.backfill_store_id_batch('product_price_history', 'market-del-cevil');
CALL public.backfill_store_id_batch('combo_components', 'market-del-cevil');


-- ── 4. Limpieza: el procedure es una herramienta de un solo uso ────────
-- (asignar "todo lo existente" a la Store #1). La Store #2 del ticket #27
-- arranca vacía y no lo necesita — no tiene sentido dejarlo en el schema.
DROP PROCEDURE IF EXISTS public.backfill_store_id_batch(TEXT, TEXT, INTEGER);


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Debe existir exactamente 1 fila (Market del Cevil)
SELECT id, slug, name FROM public.stores;

-- Debe devolver 0 filas en las 13 tablas — cualquier tabla con count > 0
-- significa que el backfill no terminó (correr el script de nuevo es seguro).
SELECT 'products' AS table_name, COUNT(*) FROM public.products WHERE store_id IS NULL
UNION ALL
SELECT 'categories', COUNT(*) FROM public.categories WHERE store_id IS NULL
UNION ALL
SELECT 'subcategories', COUNT(*) FROM public.subcategories WHERE store_id IS NULL
UNION ALL
SELECT 'clients', COUNT(*) FROM public.clients WHERE store_id IS NULL
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders WHERE store_id IS NULL
UNION ALL
SELECT 'order_items', COUNT(*) FROM public.order_items WHERE store_id IS NULL
UNION ALL
SELECT 'order_payments', COUNT(*) FROM public.order_payments WHERE store_id IS NULL
UNION ALL
SELECT 'product_stock', COUNT(*) FROM public.product_stock WHERE store_id IS NULL
UNION ALL
SELECT 'stock_movement_log', COUNT(*) FROM public.stock_movement_log WHERE store_id IS NULL
UNION ALL
SELECT 'product_affinity', COUNT(*) FROM public.product_affinity WHERE store_id IS NULL
UNION ALL
SELECT 'category_affinity_rules', COUNT(*) FROM public.category_affinity_rules WHERE store_id IS NULL
UNION ALL
SELECT 'product_price_history', COUNT(*) FROM public.product_price_history WHERE store_id IS NULL
UNION ALL
SELECT 'combo_components', COUNT(*) FROM public.combo_components WHERE store_id IS NULL
ORDER BY table_name;
