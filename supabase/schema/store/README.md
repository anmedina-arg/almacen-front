# Dominio: Store/Platform

Autenticación, perfiles de usuario, y las Stores en sí (el "tenant" del
sistema). Consolidado en #87 (spec #81, mapa #74).

## Tablas

| Archivo | Qué es |
|---|---|
| `stores.sql` | El tenant. `supabase_multitenant_schema_expand.sql` es su fuente original (#10) — no se descarta hasta que las otras 13 tablas de ese archivo confirmen su parte. Policies: lectura pública sin restricción; sin escritura vía RLS (alta/edición manual, ver ADR-0006). |
| `store_admins.sql` | Membresía explícita de un profile como admin de una Store (ADR-0005). Sin policies de escritura — mismo motivo que `stores`. |
| `profiles.sql` | Extiende `auth.users` con nombre/rol/avatar. Sin `store_id` — no es tabla de negocio por-Store. |

## Funciones RPC (las que llama la API)

Ninguna en este dominio.

## Funciones trigger (no se llaman directo)

| Archivo | Cuándo dispara |
|---|---|
| `handle_new_user.sql` | **Objeto de riesgo particular**: el trigger `on_auth_user_created` vive sobre `auth.users` (schema de Supabase Auth, no `public`) — se declara en este mismo archivo, no junto a una tabla canónica (no la tenemos ni la vamos a tener para `auth.users`). Crea el `profile` al registrarse un usuario nuevo. |
| `handle_updated_at.sql` | Al UPDATE en `profiles`. Específica de este dominio — no confundir con `update_updated_at_column()` (Products #85, usada por `stores`/`products`/etc). |

## Gaps conocidos, no corregidos acá

- **`on_auth_user_created` no existe en el proyecto de test** (confirmado: 0 filas en `pg_trigger` para `auth.users`), solo en producción. No introducido por #87 — se decidió explícitamente no aplicarlo a test durante este ticket, para no alterar el comportamiento de fixtures de test existentes sin evaluarlo aparte. Documentado acá por primera vez.
- **El AC original de #87 menciona `supabase_fix_super_admin_remaining_policies.sql` como "fix a descartar según la regla de #77"**, pero ese archivo no toca `stores`/`store_admins`/`profiles` en ningún lado — sus policies son sobre `category_affinity_rules`, `clients`, `combo_components` (ya muerta, superseded por #18), `product_price_history` (ya muerta, superseded por #84), `product_stock`/`stock_movement_log` (ya muertas, superseded por #83). Lo que sigue vivo (`clients`, `category_affinity_rules`) pertenece a Clients (#88) y Recomendaciones (#90), no a este dominio — no se tocó el archivo acá. Referencia imprecisa en el AC, probablemente por asociar "super_admin" conceptualmente con Store/Platform sin revisar qué tablas toca el archivo en la práctica.
