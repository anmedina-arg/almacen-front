# Migración: tabla `stores` + `store_id` (ticket #10)

Aplica `supabase/supabase_multitenant_schema_expand.sql`: crea la tabla `stores` y agrega `store_id` (nullable, FK a `stores`, sin default) a las 13 tablas de negocio existentes. Es la base del modelo multi-tenant (ver `CONTEXT.md` y `docs/adr/0004-shared-db-store-id-rls.md`).

**Por qué es segura sin ventana de mantenimiento**: agregar una columna nullable sin `DEFAULT` es una operación de solo-metadata en Postgres — no reescribe la tabla ni toma un lock prolongado, incluso en tablas grandes. No se toca RLS ni se backfillea ningún dato (eso es el ticket #11): las policies, triggers y funciones existentes quedan exactamente iguales, así que ninguna query actual debería verse afectada.

**Idempotente**: usa `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` — correrlo dos veces no falla.

## Cómo correrlo

**Primero en el proyecto de test, nunca directo en producción.**

1. Abrí el SQL Editor del proyecto Supabase de **test** (Dashboard → SQL Editor).
2. Pegá y ejecutá el contenido completo de `supabase/supabase_multitenant_schema_expand.sql`.
3. Revisá el resultado de las dos queries de verificación al final del script: la tabla `stores` debe aparecer, y las 13 filas de `information_schema.columns` (una por tabla) deben mostrar `store_id`, `is_nullable = YES`, `column_default = NULL`.
4. Corré la suite de tests con `.env.test` configurado (`npm test`) — el test de integración `src/test/integration/multitenant-schema.test.ts` confirma automáticamente que `stores` existe y que las 13 tablas exponen `store_id`.
5. Verificá manualmente que la app admin sigue funcionando igual contra el proyecto de test (pedidos, stock, catálogo) — la migración no debería cambiar ningún comportamiento visible todavía.
6. Recién con (3), (4) y (5) en verde: repetí el mismo script en el SQL Editor del proyecto de **producción**.
7. Corré de nuevo las queries de verificación del paso 3, esta vez contra producción (no hay test automatizado corriendo ahí — `TEST_SUPABASE_URL` nunca debe apuntar a producción, ver `vitest.setup.ts`).

## Registro

| Fecha | Entorno | Resultado |
|-------|---------|-----------|
| _pendiente_ | test | |
| _pendiente_ | producción | |
