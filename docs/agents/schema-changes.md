# Cambios de schema en Supabase

Flujo obligatorio para cualquier cambio a una función, policy, trigger o tabla en `supabase/`. Nace de dos incidentes de producción reales (issue #70: overload silencioso de `create_order` por saltear el `DROP FUNCTION`; una regresión de stock virtual de combos por escribir sobre la versión más vieja de un archivo en vez de la definición viva) — la causa raíz de ambos fue la misma: confiar en el contenido de un archivo `.sql` del repo como si fuera la definición actual en la base, en vez de verificarla contra la base misma.

**Regla base: el repo no es la fuente de verdad — la base sí.** Un archivo `.sql` en `supabase/` registra la intención con la que se aplicó un cambio en su momento; no garantiza que sea lo que corre hoy (puede haber sido pisado por un fix posterior, un archivo hermano, o una migración aplicada a mano que nunca se commiteó). Por qué esta convención (archivo canónico por objeto, sin CLI declarativo) en vez de otra: ver ADR-0011.

## Los 8 pasos

1. **Verificar contra producción** qué es lo que corre *hoy* — no lo que dice el archivo más reciente que menciona el objeto. Usar el template de verificación (abajo) contra el proyecto de producción antes de escribir una sola línea de SQL nueva. Si el objeto aparece en más de un archivo, la definición viva es la que gana, no la más reciente por fecha de archivo.
2. **Escribir en el archivo canónico** del dominio (`supabase/schema/<dominio>/`), no en un archivo nuevo suelto en la raíz de `supabase/`.
3. **Policies: `DROP POLICY IF EXISTS` + `CREATE POLICY`, nunca `ALTER POLICY`** — ya es la convención del repo; mantenerla también importa para compatibilidad futura con el diff declarativo de la CLI de Supabase (ver ADR-0011 e investigación de #75).
4. **Si la firma de una función cambia** (parámetro agregado, quitado, o reordenado), `DROP FUNCTION <firma vieja exacta>` explícito antes del `CREATE OR REPLACE FUNCTION` — verificar la firma vieja con `pg_get_function_identity_arguments` (paso 1), no asumirla. Sin el `DROP`, Postgres crea un overload silencioso en vez de reemplazar (causa raíz de #70). El `DROP` es un paso operativo, se corre una vez contra la base (test y luego producción) y se verifica con el mismo template — **no hace falta que quede como sentencia literal en el archivo canónico**: ese archivo describe el estado deseado vigente, no el historial de migración. Un comentario mencionando la firma vieja alcanza (ver `upsert_product_stock.sql`/`get_top_products.sql` como ejemplos) — si algún día hace falta repetir el `DROP` (ej. bootstrapear un proyecto nuevo desde cero con un overload viejo dando vueltas), la firma exacta ya quedó documentada ahí.
5. **Correr primero en el proyecto de test.** Confirmar explícitamente contra qué proyecto apunta la sesión (`.env.test` vs `.env.local` — este último apunta a producción) antes de ejecutar nada.
6. **Aplicar en producción** solo después de confirmar el resultado en test, re-confirmando explícitamente el proyecto destino antes de correr.
7. **`NOTIFY pgrst, 'reload schema';` siempre** que se toque una función, policy, o tabla — no solo cuando "parece" necesario. El cache de schema de PostgREST no se invalida solo de forma confiable.
8. **Verificar manualmente** el resultado (re-correr el template de verificación contra el objeto recién aplicado) y **commitear referenciando el número de issue** explícito en el mensaje — necesario para saber, más adelante, si un archivo de fix ya aplicado y confirmado puede descartarse (ver regla de retención de archivos, `supabase/README.md`).

## Validar que una fila pertenece a la misma Store que su padre

Cuando una tabla tiene una FK a otra tabla store-scoped (ej. `variedades.familia_id` →
`familias`, `order_items.product_id` → `products`), nada garantiza por sí solo que las dos
filas sean de la misma Store — hay que elegir cómo se impone eso. Dos técnicas usadas en
este repo para el mismo tipo de problema, con criterio explícito de cuándo usar cada una
(no es una preferencia estética, ver #92/#103 para el porqué):

- **FK compuesta** `FOREIGN KEY (padre_id, store_id) REFERENCES padre(id, store_id)` —
  preferirla cuando la tabla padre ya tiene (o puede agregarse sin fricción) un
  `UNIQUE(id, store_id)`, y la regla es simplemente "el padre tiene que ser de la misma
  Store" sin lógica condicional adicional. Declarativa, la valida Postgres nativamente,
  sin función que mantener. Ejemplo: `variedades`/`products.familia_id` → `familias`
  (`familias_id_store_id_key`, #92).
- **Trigger** `BEFORE INSERT OR UPDATE ... CHECK EXISTS (...)` — usarlo cuando la tabla
  padre no tiene (y no conviene agregarle) ese `UNIQUE(id, store_id)`, o cuando la
  validación necesita lógica más allá de "¿existe esta combinación?" (ej. dejar pasar un
  valor `NULL` en casos particulares). Ejemplo: `order_items.product_id` → `products`
  (`validate_order_item_store()`, #103) — `products` no tiene `UNIQUE(id, store_id)`, y el
  trigger además tiene que dejar pasar `product_id IS NULL` (producto borrado,
  `ON DELETE SET NULL`).

No usar ninguna de las dos es la falla real que originó #103 (incidente de producción) —
la elección entre FK compuesta y trigger es secundaria a elegir *alguna*.

## Agregar un objeto o dominio nuevo

Los dominios actuales (`stock`, `orders`, `products`, `combos`, `store`, `clients`, `ranking`, `recomendaciones`, `producto-surtido` — ver `supabase/README.md`) no son una lista cerrada; los 8 primeros existían al momento de la reorganización de #74/#81 (issues #82-#90), `producto-surtido` se sumó en #92 como ejemplo de dominio nuevo agregado siguiendo esta misma convención. Un objeto nuevo:

- **Encaja en un dominio existente** (ej. una función más para Orders): agregá el archivo en `supabase/schema/<dominio>/<objeto>.sql` siguiendo el paso 2 de arriba, y sumalo a la tabla correspondiente (Tablas / Funciones RPC / Funciones trigger / Funciones auxiliares) del `README.md` de ese dominio.
- **No encaja en ninguno** (un concepto de negocio nuevo, ej. una feature que necesita tablas propias): creá `supabase/schema/<dominio-nuevo>/` con su propio `README.md`, mismo formato de 5 secciones que los demás (ver la sección "README.md de dominio" en `supabase/README.md`). No hace falta pedir permiso especial ni abrir un ticket de "scaffolding" — ese costo ya se pagó una vez en #82, la convención está para reusarse directo.
- **Toca objetos de más de un dominio** (ej. una tabla nueva con una columna FK a otro dominio): el objeto compartido documenta en su propio header de qué otro dominio depende, igual que `orders/order_items.sql` documenta su columna `from_suggestion` viniendo de Recomendaciones. No es necesario un archivo "compartido" aparte — cada objeto vive en el dominio que lo posee semánticamente (la tabla en quien la creó, el trigger junto a la tabla en la que dispara, la función junto a quien la posee — ver `products/products.sql` para un ejemplo con triggers de otro dominio declarados ahí).

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
