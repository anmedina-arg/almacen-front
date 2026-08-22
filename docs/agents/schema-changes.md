# Cambios de schema en Supabase

Flujo obligatorio para cualquier cambio a una función, policy, trigger o tabla en `supabase/`. Nace de dos incidentes de producción reales (issue #70: overload silencioso de `create_order` por saltear el `DROP FUNCTION`; una regresión de stock virtual de combos por escribir sobre la versión más vieja de un archivo en vez de la definición viva) — la causa raíz de ambos fue la misma: confiar en el contenido de un archivo `.sql` del repo como si fuera la definición actual en la base, en vez de verificarla contra la base misma.

**Regla base: el repo no es la fuente de verdad — la base sí.** Un archivo `.sql` en `supabase/` registra la intención con la que se aplicó un cambio en su momento; no garantiza que sea lo que corre hoy (puede haber sido pisado por un fix posterior, un archivo hermano, o una migración aplicada a mano que nunca se commiteó).

## Los 8 pasos

1. **Verificar contra producción** qué es lo que corre *hoy* — no lo que dice el archivo más reciente que menciona el objeto. Usar el template de verificación (abajo) contra el proyecto de producción antes de escribir una sola línea de SQL nueva. Si el objeto aparece en más de un archivo, la definición viva es la que gana, no la más reciente por fecha de archivo.
2. **Escribir en el archivo canónico** del dominio (`supabase/schema/<dominio>/`), no en un archivo nuevo suelto en la raíz de `supabase/`.
3. **Policies: `DROP POLICY IF EXISTS` + `CREATE POLICY`, nunca `ALTER POLICY`** — ya es la convención del repo; mantenerla también importa para compatibilidad futura con el diff declarativo de la CLI de Supabase (ver ADR pendiente / investigación de #75).
4. **Si la firma de una función cambia** (parámetro agregado, quitado, o reordenado), `DROP FUNCTION <firma vieja exacta>` explícito antes del `CREATE OR REPLACE FUNCTION` — verificar la firma vieja con `pg_get_function_identity_arguments` (paso 1), no asumirla. Sin el `DROP`, Postgres crea un overload silencioso en vez de reemplazar (causa raíz de #70).
5. **Correr primero en el proyecto de test.** Confirmar explícitamente contra qué proyecto apunta la sesión (`.env.test` vs `.env.local` — este último apunta a producción) antes de ejecutar nada.
6. **Aplicar en producción** solo después de confirmar el resultado en test, re-confirmando explícitamente el proyecto destino antes de correr.
7. **`NOTIFY pgrst, 'reload schema';` siempre** que se toque una función, policy, o tabla — no solo cuando "parece" necesario. El cache de schema de PostgREST no se invalida solo de forma confiable.
8. **Verificar manualmente** el resultado (re-correr el template de verificación contra el objeto recién aplicado) y **commitear referenciando el número de issue** explícito en el mensaje — necesario para saber, más adelante, si un archivo de fix ya aplicado y confirmado puede descartarse (ver regla de retención de archivos, `supabase/README.md`).

## Template de verificación reusable

Contra el proyecto que corresponda (test primero, producción después de confirmar), vía el SQL Editor de Supabase.

**Definición actual de una función:**

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = '<nombre_funcion>';
```

**Firma exacta (para el `DROP FUNCTION` del paso 4, si hay más de un overload):**

```sql
SELECT proname, pg_get_function_identity_arguments(oid) AS signature
FROM pg_proc
WHERE proname = '<nombre_funcion>';
```

**Policies activas de una tabla:**

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '<nombre_tabla>';
```

**Triggers de una tabla (incluye `auth.users`, donde puede haber triggers de onboarding):**

```sql
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = '<schema.tabla>'::regclass AND NOT tgisinternal;
```

## Los 4 objetos de prioridad 1 (verificación reforzada)

`upsert_product_stock`, `increment_product_stock`, `get_all_products_with_stock`, `get_low_stock_products` — además del paso 1, cruzar la definición viva contra el issue/fix más reciente que los tocó (#17, #70, la regresión de stock virtual de combos) antes de dar la migración por completa. Ver ticket de dominio Stock (#83).
