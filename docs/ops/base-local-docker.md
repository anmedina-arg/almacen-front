# Base de datos de test local en Docker

Desde 2026-10-17 los integration tests (`src/test/integration/`) corren contra un stack de Supabase **local en Docker**, levantado con la Supabase CLI, en vez del proyecto hosteado `market-test`. Motivo: el plan free de Supabase permite 2 proyectos activos y los dos cupos están ocupados (`market` = producción, `contability-demo`), así que `market-test` quedó pausado y la suite entera fallaba con `ENOTFOUND`. Reemplaza a `docs/ops/poblar-test-db.md` (que queda como historial).

## Cómo funciona

- **Schema**: no hay migraciones escritas a mano. `scripts/build-local-schema.mjs` concatena los archivos canónicos de `supabase/schema/` en el orden que fija `supabase/schema/apply-order.txt` y escribe `supabase/migrations/00000000000001_canonical_schema.sql`. La carpeta `supabase/migrations/` está **gitignoreada**: es un artefacto derivado, la fuente de verdad sigue siendo el canónico por objeto ([ADR-0011](../adr/0011-supabase-canonical-files-not-declarative-cli.md)). Si un canónico nuevo no está en `apply-order.txt`, el build falla a propósito.
- **Ajustes solo-local**: `supabase/local-only/*.sql` se concatena en una segunda migración. Son las dos diferencias deliberadas que ya tenía el proyecto de test hosteado: (1) drop de las 3 FKs a `auth.users` (`profiles.id`, `orders.user_id`, `orders.confirmed_by`), porque varios tests siembran `profiles` con un UUID random sin pasar por auth; (2) drop del trigger `on_auth_user_created` (decisión de #87, ver `supabase/schema/store/README.md`), porque los fixtures hacen `insert` en `profiles` después de `auth.admin.createUser` y con el trigger activo chocan con `profiles_pkey` — 16 archivos de test rotos cuando se probó dejarlo. Cada archivo documenta cómo cerrar esa diferencia.
- **Seed**: `supabase/seed.sql` carga lo mínimo que los tests dan por sentado: la Store `market-del-cevil` (id 1, feature flags copiados de producción) y el perfil `super_admin` del admin de plataforma con membership en esa Store. Todo lo demás lo crea cada test como fixture descartable.
- **Servicios**: `supabase/config.toml` deja prendidos solo DB, Auth, PostgREST (vía Kong) y Studio. Realtime, Storage, Edge Runtime, Analytics y el SMTP local están apagados — no los usa ningún test. Puertos corridos a `5433x` para no chocar con el stack local de `contability` (que usa los `5432x` por defecto).

| Servicio | URL local |
|---|---|
| API (PostgREST/Auth) | `http://127.0.0.1:54331` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54332/postgres` |
| Studio | `http://127.0.0.1:54333` |

Las keys `anon` y `service_role` son las demo keys fijas de la CLI (las imprime `npm run db:status`); están en `.env.test.example` listas para copiar.

## Comandos

```bash
npm run db:start      # build de migraciones + supabase start (primera vez baja imágenes)
npm run db:reset      # build + supabase db reset: recrea desde cero, aplica migraciones y seed
npm run db:status     # URLs y keys
npm run db:stop       # apaga los contenedores (los datos quedan en el volumen)
npm run test:integration
npm run test:unit
npm test              # todo
```

`.env.test` tiene que apuntar al stack local (copiar `.env.test.example`). `vitest.setup.ts` sigue cortando la suite si `TEST_SUPABASE_URL` coincide con la URL de producción.

## Flujo para un cambio de schema

Es el mismo de [`docs/agents/schema-changes.md`](../agents/schema-changes.md), con la base local ocupando el lugar del "proyecto de test" en el paso 5:

1. Editar el archivo canónico en `supabase/schema/<dominio>/` (si es un objeto nuevo, agregarlo a `apply-order.txt` respetando dependencias).
2. `npm run db:reset` — confirma que el canónico aplica limpio desde cero.
3. `npm run test:integration`.
4. Recién después, aplicar en producción siguiendo los pasos 6-8.

## Verificación de fidelidad contra producción (2026-10-17)

> Foto del momento en que se armó la base local, **antes** de #133. Desde #133 los canónicos (y por lo tanto la base local) van un paso adelante de producción hasta que se aplique allá el SQL de ese issue: `get_all_products_with_stock` y `get_low_stock_products` devuelven `category_name` en vez de `main_category`, y la vista `v_product_stock` ya no existe. Eso es lo esperado del flujo (local primero, prod después); si hace falta re-verificar fidelidad, repetir las consultas por categoría de catálogo en ambos lados.

Al armarlo se comparó la base local contra producción con las mismas consultas de catálogo en los dos lados (hash md5 por categoría). Resultado:

| Categoría | Resultado |
|---|---|
| Columnas (tipo, nulabilidad, default, identity) de 20 tablas + 1 vista | idéntico (167 columnas) |
| Índices | idéntico (80) |
| Policies RLS | idéntico (55) |
| Triggers (incluye `on_auth_user_created` sobre `auth.users`) | idéntico (19) tras la migración canónica; `local-only/` después quita `on_auth_user_created` (ver arriba) |
| RLS habilitada por tabla | idéntico |
| Vista `v_product_stock` | idéntico (retirada después en #133: nada la leía) |
| Enum `order_status` | idéntico |
| Propiedades de funciones (SECURITY DEFINER, volatilidad, `search_path`) | idéntico (38) |
| Cuerpo de las 38 funciones | idéntico ignorando comentarios y espacios (los canónicos tienen más comentarios que lo que se pegó históricamente en el SQL Editor) |
| Constraints | idéntico tras la migración canónica (91); `local-only/` después quita las 3 FKs a `auth.users` |

Fuera del alcance de la base local, a propósito: las 3 tablas legacy sin RLS de producción (`inventory`, `products_backup`, `categories_backup`), que ningún código ni test usa y cuya eliminación está pendiente de decisión (advisors de Supabase, auditoría 2026-10-17).

## Problemas conocidos

- `supabase start` necesita Docker Desktop corriendo. Si otro proyecto ya usa los puertos `5433x`, cambiarlos en `supabase/config.toml` **y** en `.env.test`.
- El stack de `contability` y este conviven en el mismo Docker sin conflicto: distinto `project_id` en `config.toml` → distintos nombres de contenedor y volumen.
- `supabase db reset` borra todos los datos locales (incluidos los que hayas cargado a mano desde Studio) y vuelve al seed.
