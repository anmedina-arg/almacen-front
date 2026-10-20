# Dominio: Store/Platform

Autenticación, perfiles de usuario, y las Stores en sí (el "tenant" del
sistema). Consolidado en #87 (spec #81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `stores.sql` | El tenant. `supabase_multitenant_schema_expand.sql` es su fuente original (#10) — no se descarta hasta que las otras 13 tablas de ese archivo confirmen su parte. Policies: lectura pública sin restricción; sin escritura vía RLS (alta/edición manual, ver ADR-0006). `feature_flags JSONB NOT NULL DEFAULT '{}'` desde #23 — catálogo de 7 flags por Store (`combos` se retiró en #117, ADR-0013), ver el comentario de columna en el archivo y `src/lib/store/featureFlags.ts`. `is_demo BOOLEAN NOT NULL DEFAULT false` desde #153: marca de Demo Store (ver `CONTEXT.md`), la única que la saca de `/stores`, del sitemap y de `get_orders_count_by_store`; la lee `src/features/store/services/listPublicStores.ts`. |
| `store_admins.sql` | Membresía explícita de un profile como admin de una Store (ADR-0005). Sin policies de escritura — mismo motivo que `stores`. |
| `profiles.sql` | Extiende `auth.users` con nombre/rol/avatar. Sin `store_id` — no es tabla de negocio por-Store. |

## Funciones RPC (las que llama la API)

| Archivo | Qué hace |
|---|---|
| `provision_store.sql` | Alta de una Store nueva (#26, ADR-0006): INSERT en `stores` + `store_admins` en una sola transacción. Sin `SECURITY DEFINER` ni `GRANT` — pensada para llamarse solo con el `service_role` key (bypassea RLS por rol de Postgres), nunca desde una ruta pública. Ver `src/features/store/services/provisionStore.ts` y `scripts/provision-store.ts`. Desde #153 acepta `p_is_demo` (default false) para marcar la Demo Store en el alta — al cambiar la firma, en una base existente hay que `DROP` la versión anterior antes del `CREATE` (ver header). |
| `get_orders_count_by_store.sql` | Pedidos de cada Store en una tabla (#151): total y desglose por estado, incluye Stores sin pedidos. **Solo `super_admin`** (chequeo directo sobre `profiles.role`, no `is_store_admin()`, porque cruza todas las Stores y un Store admin no debe verlas). `SECURITY DEFINER` + `GRANT` solo a `authenticated`. La llama la página `/admin` del Platform admin vía `src/features/store/services/getOrdersCountByStore.ts`. Excluye la Demo Store (`is_demo`, #153): sus pedidos son pruebas de prospectos, no métrica. |

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `handle_new_user.sql` | **Objeto de riesgo particular**: el trigger `on_auth_user_created` vive sobre `auth.users` (schema de Supabase Auth, no `public`) — se declara en este mismo archivo, no junto a una tabla canónica (no la tenemos ni la vamos a tener para `auth.users`). Crea el `profile` al registrarse un usuario nuevo. |
| `handle_updated_at.sql` | Al UPDATE en `profiles`. Específica de este dominio — no confundir con `update_updated_at_column()` (Products #85, usada por `stores`/`products`/etc). |

## Gaps conocidos, no corregidos acá

- **`on_auth_user_created` no existe en el entorno de test**, solo en producción. No introducido por #87 — se decidió explícitamente no aplicarlo a test durante este ticket, para no alterar el comportamiento de fixtures de test existentes sin evaluarlo aparte. Sigue vigente en la base local de Docker (2026-10-17): el canónico `handle_new_user.sql` sí lo crea, y `supabase/local-only/02_drop_on_auth_user_created.sql` lo vuelve a sacar, porque los fixtures hacen `insert` en `profiles` después de `auth.admin.createUser` y con el trigger activo chocan con `profiles_pkey` (16 archivos de test). Para cerrar este gap habría que pasar esos fixtures a `upsert` y borrar el archivo local-only.
- **El AC original de #87 menciona `supabase_fix_super_admin_remaining_policies.sql` como "fix a descartar según la regla de #77"**, pero ese archivo no toca `stores`/`store_admins`/`profiles` en ningún lado — sus policies son sobre `category_affinity_rules`, `clients`, `combo_components` (ya muerta, superseded por #18), `product_price_history` (ya muerta, superseded por #84), `product_stock`/`stock_movement_log` (ya muertas, superseded por #83). Lo que sigue vivo (`clients`, `category_affinity_rules`) pertenece a Clients (#88) y Recomendaciones (#90), no a este dominio — no se tocó el archivo acá. Referencia imprecisa en el AC, probablemente por asociar "super_admin" conceptualmente con Store/Platform sin revisar qué tablas toca el archivo en la práctica.
