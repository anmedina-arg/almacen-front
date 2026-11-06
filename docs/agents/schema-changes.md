# Cambios de schema en Supabase

Flujo obligatorio para cualquier cambio a una función, policy, trigger o tabla en `supabase/`. Nace de dos incidentes de producción reales (issue #70: overload silencioso de `create_order` por saltear el `DROP FUNCTION`; una regresión de stock virtual de combos por escribir sobre la versión más vieja de un archivo en vez de la definición viva) — la causa raíz de ambos fue la misma: confiar en el contenido de un archivo `.sql` del repo como si fuera la definición actual en la base, en vez de verificarla contra la base misma.

**Regla base: el repo no es la fuente de verdad — la base sí.** Un archivo `.sql` en `supabase/` registra la intención con la que se aplicó un cambio en su momento; no garantiza que sea lo que corre hoy (puede haber sido pisado por un fix posterior, un archivo hermano, o una migración aplicada a mano que nunca se commiteó). Por qué esta convención (archivo canónico por objeto, sin CLI declarativo) en vez de otra: ver ADR-0011.

## Los 8 pasos

1. **Verificar contra producción** qué es lo que corre *hoy* — no lo que dice el archivo más reciente que menciona el objeto. Usar el template de verificación (abajo) contra el proyecto de producción antes de escribir una sola línea de SQL nueva. Si el objeto aparece en más de un archivo, la definición viva es la que gana, no la más reciente por fecha de archivo.
2. **Escribir en el archivo canónico** del dominio (`supabase/schema/<dominio>/`), no en un archivo nuevo suelto en la raíz de `supabase/`. Si es una función, declarar sus permisos de ejecución ahí mismo (ver "Permisos de ejecución de funciones" abajo).
3. **Policies: `DROP POLICY IF EXISTS` + `CREATE POLICY`, nunca `ALTER POLICY`** — ya es la convención del repo; mantenerla también importa para compatibilidad futura con el diff declarativo de la CLI de Supabase (ver ADR-0011 e investigación de #75).
4. **Si la firma de una función cambia** (parámetro agregado, quitado, o reordenado), `DROP FUNCTION <firma vieja exacta>` explícito antes del `CREATE OR REPLACE FUNCTION` — verificar la firma vieja con `pg_get_function_identity_arguments` (paso 1), no asumirla. Sin el `DROP`, Postgres crea un overload silencioso en vez de reemplazar (causa raíz de #70). El `DROP` es un paso operativo, se corre una vez contra la base (test y luego producción) y se verifica con el mismo template — **no hace falta que quede como sentencia literal en el archivo canónico**: ese archivo describe el estado deseado vigente, no el historial de migración. Un comentario mencionando la firma vieja alcanza (ver `upsert_product_stock.sql`/`get_top_products.sql` como ejemplos) — si algún día hace falta repetir el `DROP` (ej. bootstrapear un proyecto nuevo desde cero con un overload viejo dando vueltas), la firma exacta ya quedó documentada ahí.
5. **Correr primero en la base local de Docker** (`npm run db:reset` — recrea la base desde cero a partir de los canónicos, así también confirma que el archivo aplica limpio — y después `npm run test:integration`; ver `docs/ops/base-local-docker.md`). Desde 2026-10-17 la base local reemplaza al proyecto Supabase de test hosteado (pausado por el límite de 2 proyectos activos del plan). Confirmar explícitamente contra qué base apunta la sesión (`.env.test` → local vs `.env.local` → producción) antes de ejecutar nada.
6. **Aplicar en producción** solo después de confirmar el resultado en test, re-confirmando explícitamente el proyecto destino antes de correr.
7. **`NOTIFY pgrst, 'reload schema';` siempre** que se toque una función, policy, o tabla — no solo cuando "parece" necesario. El cache de schema de PostgREST no se invalida solo de forma confiable.
8. **Verificar manualmente** el resultado (re-correr el template de verificación contra el objeto recién aplicado) y **commitear referenciando el número de issue** explícito en el mensaje — necesario para saber, más adelante, si un archivo de fix ya aplicado y confirmado puede descartarse (ver regla de retención de archivos, `supabase/README.md`).

## Permisos de ejecución de funciones (#154)

Supabase le da `EXECUTE` a `anon` sobre toda función nueva de `public` por default. Eso convierte cualquier RPC en un endpoint público por `/rest/v1/rpc/<nombre>`, aunque la ruta de API que la envuelve valide al usuario antes de llamarla: el RPC se puede llamar directo. Así se abrieron `cancel_order`/`confirm_order` (2026-10-20) y 12 RPC de admin más (#154).

Desde #154 rige `supabase/schema/store/default_privileges.sql`: **las funciones nuevas nacen sin `EXECUTE` para `anon` ni `PUBLIC`** (`authenticated` y `service_role` lo conservan). Reglas para todo canónico que defina una función:

- **RPC de admin** (la llama una ruta bajo `[store]/api/` con sesión): no necesita `GRANT`. Además, si es `SECURITY DEFINER`, valida al caller **adentro** con `is_store_admin(<store>)` y, cuando corresponda, tolera `service_role` (`auth.role() IS DISTINCT FROM 'service_role'`), como `cancel_order.sql`. Las que ya existían llevan `REVOKE EXECUTE ... FROM PUBLIC, anon` explícito porque los defaults no son retroactivos — y hay que nombrar `anon`: un `REVOKE ... FROM PUBLIC` solo no saca el grant explícito de Supabase.
- **RPC pública** (catálogo o checkout, se invoca con la anon key): `GRANT EXECUTE ... TO anon, authenticated, service_role` explícito, con un comentario de por qué es pública. Hoy son `create_order`, `add_order_item_variedades`, `get_recommendations`, `get_top_seller_ids`, `get_available_stock`.
- **Función auxiliar que evalúan las policies RLS o una función `SECURITY INVOKER` pública** (`is_store_admin`, `is_stock_tracked`): también `GRANT ... TO anon`, porque corre con los privilegios de quien consulta, incluido el visitante anónimo. Una auxiliar que solo se llama desde adentro de funciones `SECURITY DEFINER` (`reserve_order_stock`, `return_order_stock`, `get_combo_effective_stock`), o con el `service_role` (`provision_store`), no lleva `GRANT`: en una base nueva nace cerrada. En las bases existentes se le agrega `REVOKE EXECUTE ... FROM PUBLIC, anon` en su canónico, porque conservaban el `EXECUTE` implícito de Supabase.
- **Toda `SECURITY DEFINER`**, RPC o trigger, lleva `SET search_path = public` (advisor `function_search_path_mutable`). Si el cuerpo crea tablas temporales, `pg_temp` sigue resolviéndose implícito.
- Las funciones trigger no necesitan `EXECUTE` para nadie: el privilegio se chequea al crear el trigger, no al dispararse.
- El `REVOKE` global de `default_privileges.sql` alcanza a toda función que `postgres` cree después en cualquier schema. Si se instala una extensión nueva desde el Dashboard y se la usa desde consultas `anon`/`authenticated`, verificar su ACL con la consulta de abajo y dar `GRANT` explícito si hace falta.

**Alinear una base existente (paso operativo único, #154, 2026-11-06).** Los defaults no son retroactivos: una base creada antes de `default_privileges.sql` conserva el `EXECUTE` implícito de Supabase para `PUBLIC` y `anon` en las funciones viejas, incluidas las de trigger. Producción se alineó con la local con un bloque que recorre las funciones de `public`, quita `PUBLIC` a todas y `anon` a todas menos las 7 públicas (`add_order_item_variedades`, `create_order`, `get_available_stock`, `get_recommendations`, `get_top_seller_ids`, `is_stock_tracked`, `is_store_admin`). En una base nueva ese bloque no hace nada. Se verifica con la consulta de abajo: solo esas 7 deben aparecer con `anon_exec`, y ninguna función con `EXECUTE` para `PUBLIC`.

```sql
DO $$
DECLARE
  r record;
  public_rpcs text[] := ARRAY['add_order_item_variedades','create_order','get_available_stock','get_recommendations','get_top_seller_ids','is_stock_tracked','is_store_admin'];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    IF NOT (r.proname = ANY (public_rpcs)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    END IF;
  END LOOP;
END $$;
```

Cómo verificar quién puede ejecutar qué, contra la base que corresponda:

```sql
SELECT p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.prosecdef DESC, anon_exec DESC, p.proname;
```

El test `src/test/integration/secdef-rpc-authorization.test.ts` también cubre esas cuatro auxiliares (anon recibe `42501`) y recorre las RPC de admin con un cliente anónimo (espera `42501`), un admin de otra Store (espera `Forbidden`) y el admin de la Store (espera éxito): al agregar una RPC de admin nueva, sumarla a esa lista.

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
- **No encaja en ninguno** (un concepto de negocio nuevo, ej. una feature que necesita tablas propias): creá `supabase/schema/<dominio-nuevo>/` con su propio `README.md`, mismo formato de 6 secciones (la 5ta opcional) que los demás (ver la sección "README.md de dominio" en `supabase/README.md`). No hace falta pedir permiso especial ni abrir un ticket de "scaffolding" — ese costo ya se pagó una vez en #82, la convención está para reusarse directo.
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
