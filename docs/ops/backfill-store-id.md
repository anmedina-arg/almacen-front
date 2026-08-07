# Backfill: Store Market del Cevil + store_id (ticket #11)

Aplica `supabase/supabase_backfill_store_id.sql`: da de alta la Store `market-del-cevil` en `stores` y asigna su `store_id` a todas las filas existentes en las 13 tablas de negocio (mismas del ticket #10). Requiere que `supabase_multitenant_schema_expand.sql` (#10) ya esté aplicado en el entorno.

**Corre en lotes, no en una transacción única**: el `PROCEDURE public.backfill_store_id_batch` hace `COMMIT` después de cada lote de 500 filas — libera el lock de escritura entre lotes en vez de sostenerlo por todo el backfill de la tabla.

**Idempotente y reanudable**: cada lote solo toca filas con `store_id IS NULL`. Si el script se corta a mitad de camino (timeout, error de red), volver a correr el script completo es seguro — retoma donde quedó, y el `INSERT ... ON CONFLICT (slug) DO NOTHING` no duplica la Store.

**El procedure se autolimpia**: es una herramienta de un solo uso (asignar "todo lo existente" a la Store #1) — el propio script lo borra con `DROP PROCEDURE` después de las 13 `CALL`. La Store #2 (ticket #27) arranca vacía y no lo necesita.

## Cómo correrlo

**Primero en el proyecto de test, nunca directo en producción.**

1. Confirmá que `supabase_multitenant_schema_expand.sql` (#10) ya corrió en el entorno que vas a migrar.
2. Abrí el SQL Editor del proyecto Supabase de **test** (Dashboard → SQL Editor).
3. Pegá y ejecutá el contenido completo de `supabase/supabase_backfill_store_id.sql`.
4. Verificá el resultado (ver sección de abajo).
5. Recién con la verificación en verde: repetí el mismo script en el SQL Editor del proyecto de **producción**, y volvé a verificar ahí.

## Verificación

- Las dos queries al final del script: debe existir exactamente 1 fila en `stores` (`market-del-cevil`), y las 13 filas del `UNION ALL` deben mostrar `count = 0`.
- Contra el proyecto de **test** únicamente: corré la suite de tests con `.env.test` configurado, incluyendo `TEST_SUPABASE_SERVICE_ROLE_KEY` (`npm test`) — el test de integración `src/test/integration/backfill-store-id.test.ts` confirma automáticamente la Store y las 13 tablas.
  - Usa la **service_role key**, no la anon key: la mayoría de estas tablas solo permiten `SELECT` a admins vía RLS, así que con la anon key el conteo de `store_id IS NULL` daría siempre 0 sea cierto o no (falso positivo). `service_role` bypassea RLS y refleja el estado real.
- En producción no hay test automatizado corriendo (`TEST_SUPABASE_URL` nunca debe apuntar ahí) — alcanza con repetir las dos queries de verificación en el SQL Editor.
- Verificá manualmente que la app admin sigue funcionando igual (pedidos, stock, catálogo) en el entorno que acabás de migrar.

## Registro

| Fecha | Entorno | Resultado |
|-------|---------|-----------|
| _pendiente_ | test | |
| _pendiente_ | producción | |
