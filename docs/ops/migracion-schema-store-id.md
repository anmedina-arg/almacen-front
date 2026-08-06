# Migración: tabla `stores` + `store_id` (ticket #10)

Aplica `supabase/supabase_multitenant_schema_expand.sql`: crea la tabla `stores` y agrega `store_id` (nullable, FK a `stores`, sin default) a las 13 tablas de negocio existentes. Es la base del modelo multi-tenant (ver `CONTEXT.md` y `docs/adr/0004-shared-db-store-id-rls.md`).

**Por qué es segura sin ventana de mantenimiento**: agregar una columna nullable sin `DEFAULT` es una operación de solo-metadata en Postgres — no reescribe la tabla ni toma un lock prolongado, incluso en tablas grandes. No se toca RLS ni se backfillea ningún dato (eso es el ticket #11): las policies, triggers y funciones existentes quedan exactamente iguales, así que ninguna query actual debería verse afectada.

**Idempotente**: usa `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` — correrlo dos veces no falla.

## Cómo correrlo

**Primero en el proyecto de test, nunca directo en producción.**

1. Abrí el SQL Editor del proyecto Supabase de **test** (Dashboard → SQL Editor).
2. Pegá y ejecutá el contenido completo de `supabase/supabase_multitenant_schema_expand.sql`.
3. Verificá el resultado (ver sección de abajo).
4. Recién con la verificación en verde: repetí el mismo script en el SQL Editor del proyecto de **producción**, y volvé a verificar ahí.

## Verificación

- Las dos queries al final del script: la tabla `stores` debe aparecer, y las 13 filas de `information_schema.columns` (una por tabla) deben mostrar `store_id`, `is_nullable = YES`, `column_default = NULL`.
- Contra el proyecto de **test** únicamente: corré la suite de tests con `.env.test` configurado (`npm test`) — el test de integración `src/test/integration/multitenant-schema.test.ts` confirma automáticamente que `stores` existe y que las 13 tablas exponen `store_id`. No hay equivalente automatizado corriendo contra producción (`TEST_SUPABASE_URL` nunca debe apuntar ahí, ver `vitest.setup.ts`) — en producción alcanza con repetir las dos queries de arriba en el SQL Editor.
- Verificá manualmente que la app admin sigue funcionando igual (pedidos, stock, catálogo) en el entorno que acabás de migrar — la migración no debería cambiar ningún comportamiento visible todavía.

## Registro

| Fecha | Entorno | Resultado |
|-------|---------|-----------|
| 2026-08-06 | test | Migración aplicada. `npm test` → 16/16 en verde (los 14 del ticket #10 + los 2 de #9), confirmando `stores` y `store_id` en las 13 tablas |
| _pendiente_ | producción | |
