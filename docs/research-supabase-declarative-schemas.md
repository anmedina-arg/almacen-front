# Investigación: flujo declarativo `schemas/` + `migrations/` del Supabase CLI

> Research para issue [#75](https://github.com/anmedina-arg/almacen-front/issues/75) (hijo del wayfinder map issue [#74](https://github.com/anmedina-arg/almacen-front/issues/74)).
> Fecha de investigación: 2026-08-21. Fuentes primarias: docs oficiales de Supabase, repo `supabase/cli` en GitHub, changelog/blog oficial. Sin blogs de terceros como fuente de una claim (solo se usaron, cuando aparecen, para *encontrar* la fuente primaria).

## TL;DR

Sí existe, y es más o menos como lo describe el ticket: un archivo por objeto en `supabase/schemas/*.sql` que representa el estado deseado, editado a mano, y `supabase/migrations/` generado por `supabase db diff` comparando esos archivos de schema contra el historial de migraciones — **no contra la base de datos en vivo**. Pero:

- Es relativamente reciente (anuncio GA: abril 2025) y el motor de diff está en pleno cambio: pasó de `migra` (basado en Python, de terceros) a `pg-delta` (motor propio de Supabase, en TypeScript), que a agosto 2026 ya es el **default**, con `migra` todavía disponible como fallback vía flag/config.
- `pg-delta` estaba en **alpha pública** recién en abril 2026 ("this is still very much alpha, things will break, coverage is not complete yet") y ya se convirtió en default unos meses después — el ritmo de cambio es alto.
- Cubre tablas, vistas, funciones y policies, pero con una lista de exclusiones documentada nada trivial (DML, ALTER POLICY, materialized views, comments, partitions, domains, publications) y con al menos un bug reportado y confirmado de triggers en `auth.users` invisibles al diff — que es exactamente el patrón que ya usa este repo (`supabase_fix_oauth_trigger.sql`, trigger `on_auth_user_created` sobre `auth.users`).
- El repo hoy no tiene ninguna instalación/scaffolding del CLI: no hay `supabase/config.toml`, no hay `supabase` como devDependency en `package.json` (solo los clientes JS `@supabase/supabase-js`, `@supabase/ssr`, `@supabase/auth-helpers-nextjs`), y `supabase/` es una carpeta plana de 47 archivos `.sql` sueltos ejecutados manualmente en el SQL Editor. Adoptar el flujo declarativo es empezar de cero: instalar CLI, Docker, `supabase init`, `supabase link`, y bootstrapear `schemas/` con `db dump` o `db pull --use-pg-delta`.

---

## 1. ¿Existe el flujo tal como lo describe el ticket?

Sí. La guía oficial lo describe explícitamente como: *"Manage your database schemas in one place and generate versioned migrations"* — un enfoque declarativo en el que se declara el estado deseado en archivos de schema, y las migraciones se generan automáticamente en vez de escribirse a mano.

Mecánica documentada:
- Los archivos en `supabase/schemas/` son la fuente de verdad. Los cambios se hacen editando esos archivos, **no** vía Studio ni SQL editor.
- `supabase db diff` compara los archivos de schema **contra las migraciones ya generadas** (no contra la base de datos en vivo) para producir el SQL incremental.
- Advertencia textual de la doc: *"supabase db diff compares those files against your migrations — it does not read the live database."* Cualquier cambio hecho directo en Studio/SQL editor/`psql` es invisible para el diff y se pierde silenciosamente si no se replica también en el archivo de schema.

Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)

Workflow de bootstrap/actualización documentado:
1. Crear/editar un archivo `.sql` en `supabase/schemas/` con el objeto deseado.
2. `supabase db diff -f <nombre_migracion>` genera el archivo de migración correspondiente en `supabase/migrations/`.
3. `supabase start` + `supabase migration up` (o `db reset`) aplica la migración generada localmente.
4. Revisión manual del diff generado antes de aplicar — la doc recomienda que cada migración generada contenga un cambio incremental y sea revisada.

Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)

## 2. Versión del CLI que lo soporta y cómo se activa

- **Anuncio original / GA**: blog post oficial *"Declarative Schemas for Simpler Database Management"*, publicado el **3 de abril de 2025**. El post no fija un número de versión mínima del CLI, pero aclara que la herramienta viene de tooling interno que Supabase usaba "desde hace 2 años" antes de exponerla en el CLI. Objetos mencionados explícitamente: tablas, vistas, funciones, RLS policies, role grants, tipos custom y constraints.
  Fuente: [Declarative Schemas for Simpler Database Management — Supabase Blog](https://supabase.com/blog/declarative-schemas)
- **Activación/config**: no requiere un flag especial para empezar — basta con crear archivos `.sql` bajo `supabase/schemas/` y usar `supabase db diff`. La configuración fina vive en `supabase/config.toml`, sección `[db.migrations]`, clave `schema_paths`, que acepta rutas explícitas o globs (ej. `["./supabase/schemas/profiles.sql", "./supabase/schemas/*.sql"]`) para controlar el orden de ejecución de los archivos (relevante para dependencias entre objetos, ej. una vista que depende de una función).
  Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
- **Motor de diff nuevo (`pg-delta`)**: anunciado como **alpha pública** el **16 de abril de 2026** por el maintainer `avallete`, vía GitHub Discussion. Introduce el comando `supabase db schema declarative sync` (con variante no interactiva `--apply --name <migration_name>`) como workflow principal, además de extender `db diff`/`db pull` con `--use-pg-delta`. Cita textual sobre su estado en ese momento: *"This is still very much alpha, things will break, coverage is not complete yet."*
  Fuente: [\[Public Alpha\] Declarative Schema Management with pg-delta — GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938), [changelog entry](https://supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta)
- **Estado a agosto 2026 (hoy)**: `pg-delta` ya es el motor **default** para `db diff`, `db pull` y `declarative schema generate/sync` — reemplazando la implementación legacy (`migra`). El release note advierte explícitamente a quien actualice CI: *"schema diffing now uses the bundled pg-delta engine, and supabase test db fails when it finds zero tests"* — es decir, es un cambio de default con potencial de romper pipelines existentes. `migra` se puede seguir usando con `--use-migra` o poniendo `enabled = false` bajo `[experimental.pgdelta]` en `config.toml`.
  Fuente: búsqueda dirigida a supabase.com/docs y GitHub, resultados consistentes con [supabase/cli releases](https://github.com/supabase/cli/releases) y [CLI reference — db diff](https://supabase.com/docs/reference/cli/supabase-db-diff)

  **Nota de discrepancia entre fuentes**: al consultar la página de referencia de `supabase db diff` de forma aislada, la respuesta indicó `migra` como default con `pg-delta` de alternativa — lo opuesto a lo que confirma la búsqueda dirigida y el changelog de abril 2026. Esto probablemente refleja que la página de docs no está perfectamente sincronizada con el cambio de default reciente, o que el resumen automático leyó una sección desactualizada de la misma página. **Recomendación**: antes de adoptar, correr `supabase --version` y `supabase db diff --help` en el proyecto real para confirmar cuál es el default vigente en la versión instalada, no asumir por esta investigación.

## 3. Qué tipos de objetos cubre

Este repo necesita los cuatro: tablas, funciones/RPCs, RLS policies y triggers (además de algunas vistas). Cobertura documentada:

**Soportado** (según la guía de límites de la doc oficial y el blog de anuncio):
- Tablas, foreign keys.
- Vistas (con salvedades, ver abajo).
- Funciones.
- RLS policies (creación).
- Role grants, tipos custom, constraints.

**Explícitamente NO cubierto / con gotchas**, lista textual de la guía oficial de límites:
- Statements DML (INSERT/UPDATE/DELETE) — no se capturan, tienen que seguir siendo migraciones manuales.
- Vistas: no se trackea el owner ni los grants de la vista; no se trackea `security_invoker`; no se trackean materialized views; las vistas no se recrean automáticamente cuando cambia el tipo de una columna de la que dependen.
- RLS policies: los `ALTER POLICY` no se capturan (solo `CREATE POLICY`); privilegios de columna no se trackean.
- Privilegios de schema no se trackean (cada schema se diffea por separado).
- Comments no se trackean.
- Partitions no se trackean.
- `ALTER PUBLICATION ... ADD TABLE ...` no se trackea.
- `CREATE DOMAIN` se ignora.
- Los `GRANT` se duplican respecto a los default privileges (falso positivo en el diff).

Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas), sección de límites conocidos.

**Gotcha específico y directamente relevante para este repo — triggers en `auth.users`**: en la discusión de alpha de `pg-delta`, el usuario `mntzrr` reportó que los triggers sobre `auth.users` estaban completamente ausentes del diff generado por `pg-delta`, mientras que `migra` sí los detectaba correctamente (regresión). Este repo tiene exactamente ese patrón: `supabase/supabase_fix_oauth_trigger.sql` define `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users` + `CREATE OR REPLACE FUNCTION public.handle_new_user()` para manejar signup vía Google OAuth. Si se migrara este objeto al flujo declarativo con `pg-delta` como motor, hay riesgo documentado (no solo teórico) de que el trigger no se refleje correctamente en futuros diffs.

Fuente: [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938) (comentario de `mntzrr`)

Relacionado — comportamiento de exclusión de schema en `db pull`: por default, `supabase db pull` **excluye** los schemas `auth` y `storage` del pull/diff; hay que pasar explícitamente `--schema auth,storage` para incluirlos. Esto también coincide con lo reportado en la discusión: `pg-delta` "excludes Supabase-controlled schemas" (`auth`, `storage`) por diseño, aunque según los comentarios de usuarios el filtro a veces es más agresivo de lo esperado y se come objetos definidos por el usuario dentro de esos schemas (como el trigger de arriba).

Fuentes: [CLI reference — db pull](https://supabase.com/docs/reference/cli/supabase-db-pull), [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)

## 4. Cómo funciona `supabase db diff` en la práctica

**Contra qué compara**: NO compara contra la base de datos "real" en el sentido ingenuo. El mecanismo es:
1. Se levanta una **shadow database** en un contenedor Docker separado, aplicando las migraciones existentes en `supabase/migrations/` desde cero.
2. Se compara esa shadow database contra el *target* elegido:
   - `--local`: contra la base de datos local corriendo (`supabase start`).
   - `--linked`: contra el proyecto remoto vinculado (`supabase link`).
   - `--db-url <url>`: contra cualquier Postgres self-hosted, vía URL percent-encoded.
3. Cuando se usa el flujo declarativo (`schemas/`), el target efectivo son los archivos de `supabase/schemas/`, no la base viva — de ahí la advertencia de la doc de que cambios hechos directo en producción/Studio son invisibles hasta que se reflejen a mano en un archivo de schema.

Fuentes: [CLI reference — db diff](https://supabase.com/docs/reference/cli/supabase-db-diff), [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)

**Motores de diff disponibles** (flags de `db diff`): `--use-migra` (legacy/default histórico), `--use-pg-delta` (nuevo default a agosto 2026), `--use-pg-schema` (pg-schema-diff, alternativa), `--use-pgadmin` (pgAdmin, alternativa).

Fuente: [CLI reference — db diff](https://supabase.com/docs/reference/cli/supabase-db-diff)

**Confiabilidad para cambios complejos**:
- `CREATE OR REPLACE FUNCTION`: no hay confirmación explícita en la doc oficial de que esto se maneje siempre bien; el `pg-delta` alpha thread menciona coverage incompleta en general sin enumerar funciones específicamente, así que hay que asumir "no probado a fondo" hasta ver evidencia en contra.
- Policies: soportado para `CREATE POLICY`, pero **`ALTER POLICY` no se captura** — es una limitación documentada explícita, no un rumor. Si el flujo real de este repo depende de alterar policies existentes (common en RLS multi-tenant, que este repo tiene — ver `supabase_store_scoping_*.sql`, `supabase_fix_super_admin_remaining_policies.sql`), hay que verificar caso por caso que el diff genere un `DROP POLICY` + `CREATE POLICY` en vez de asumir que el diff detecta el cambio.
- Triggers sobre `auth.users`: bug confirmado y reportado (ver sección 3), no solo limitación de la doc.
- Extensiones tipo `storage`, `pgmq`, `pg_cron`, `vector`: diffing incompleto porque "blur the line between schema and data", según el propio maintainer de Supabase.

Fuentes: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas), [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)

## 5. Costo de adopción para este repo específico

**Estado actual verificado en el repo** (`almacen-front`, worktree `agent-a20cc9ae95c11b430`, rama base `fix/header-dropdown-store-admin-visibility`):
- No existe `supabase/config.toml` ni ningún artefacto de scaffolding del CLI.
- `package.json` no tiene `supabase` (el CLI) como dependencia — solo los clientes JS `@supabase/supabase-js` (`^2.112.0`), `@supabase/ssr` (`^0.8.0`), `@supabase/auth-helpers-nextjs` (`^0.15.0`), que son librerías de runtime, no el CLI.
- La carpeta `supabase/` contiene 47 archivos `.sql` sueltos con prefijo `supabase_*.sql` (más 1 en `_archive/`), cada uno un script imperativo ejecutado manualmente en el SQL Editor de Supabase — exactamente el patrón "loose SQL files" que el ticket da por sentado, confirmado.

**Qué implica adoptar el flujo**, en orden:
1. Instalar el CLI (no viene con `supabase-js`). Opciones documentadas: `npm`/`pnpm`/`yarn`/`bun` como devDependency de proyecto (recomendado por la doc sobre instalación global), Homebrew (macOS/Linux), Scoop (Windows — relevante porque el entorno de este repo es Windows). Requiere Node 20+ si se instala vía `npx`.
   Fuente: [Getting started — Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
2. **Docker es obligatorio** — el stack local corre en contenedores; se necesita Docker Desktop o alternativa (Rancher Desktop, Podman, OrbStack, colima). Sin esto no hay shadow database, y por lo tanto no hay `db diff`.
   Fuente: [Getting started — Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
3. `supabase init` — crea la carpeta `supabase/` con `config.toml` (segura de commitear). Como este repo ya tiene una carpeta `supabase/` con contenido, hay que revisar que `init` no pise nada — probablemente requiera consolidar/mover los `.sql` sueltos primero.
4. `supabase link` — vincula el proyecto local al proyecto Supabase remoto ya existente (production). Necesario antes de poder diffear contra producción.
5. **Bootstrap de `schemas/` desde el estado actual de producción**: sí hay introspección automática, no hay que escribir todo a mano desde cero:
   - `supabase db dump > supabase/schemas/prod.sql` — vuelca el schema completo a un único archivo (documentado en la guía declarativa como el punto de partida para proyectos existentes).
   - Alternativa más nueva: `supabase db pull --use-pg-delta` — "declarative pg-delta export workflow" en vez del flujo de archivo de migración tradicional.
   - Ninguno de los dos separa automáticamente por objeto ("un archivo por tabla/función/policy") — ambos comandos producen un dump consolidado; separar en archivos individuales por objeto (como describe el ticket) es trabajo manual posterior de reorganización, no algo que el CLI haga solo.
   - Recordar: el pull/dump por default **excluye** `auth` y `storage` — hay que pedirlos explícito con `--schema auth,storage` si se quiere capturar el trigger de OAuth mencionado en la sección 3.

Fuentes: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas), [CLI reference — db pull](https://supabase.com/docs/reference/cli/supabase-db-pull), [Getting started — Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## 6. Limitaciones / gotchas que bajan el atractivo superficial del modelo

1. **Motor de diff en movimiento activo** (`migra` → `pg-delta`) — adoptar hoy significa adoptar una herramienta que cambió su default hace pocos meses (según release notes consultados en agosto 2026) y que estaba en alpha pública apenas cuatro meses antes de eso (abril 2026). El propio maintainer de Supabase calificó la cobertura de "incompleta" y advirtió que "probablemente te vas a encontrar con casos donde el diff está mal o incompleto" en el anuncio de alpha.
   Fuente: [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)
2. **`ALTER POLICY` no se captura** — solo `CREATE POLICY`. Este repo tiene un historial visible de parches iterativos sobre policies (`supabase_fix_super_admin_remaining_policies.sql`, múltiples `supabase_store_scoping_*.sql`, `supabase_fix_stock_scoping_gaps.sql`) — sugiere que las policies de este proyecto se alteran con frecuencia, exactamente el caso no cubierto.
   Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
3. **Triggers en `auth.users` con bug confirmado de invisibilidad en el diff** (`pg-delta`), reportado por un usuario en la discusión oficial, y que coincide con un objeto real y ya existente en este repo (`on_auth_user_created`).
   Fuente: [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)
4. **`auth`/`storage` excluidos por default** de `db pull`/diffing — hay que acordarse de pedirlos explícitamente, y aun pidiéndolos el filtrado "es más agresivo de lo esperado" según reportes de usuarios en la misma discusión.
   Fuente: [CLI reference — db pull](https://supabase.com/docs/reference/cli/supabase-db-pull), [GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)
5. **Bug de detección de versión de Postgres local desactualizada**: si el contenedor Docker local queda con una imagen de Postgres vieja después de actualizar el CLI, `supabase db schema declarative sync` puede generar una migración incorrecta (ej. un `DROP EXTENSION pg_graphql` inválido) sin avisar del desfase. Confirmado como bug real (issue #5555), cerrado por PR #5646, pero ilustra que el mecanismo tiene dependencias implícitas de entorno (versión de Docker image) que pueden romper el diff silenciosamente.
   Fuente: [supabase/cli issue #5555](https://github.com/supabase/cli/issues/5555)
6. **DML no cubierto** — cualquier seed/backfill (este repo tiene varios: `supabase_backfill_null_store_orders.sql`, `supabase_backfill_store_id.sql`, `supabase_backfill_unit_cost.sql`) seguiría necesitando migraciones escritas a mano fuera del flujo declarativo, siempre.
   Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
7. **Vistas con cambios de tipo de columna no se recrean solas**, y `security_invoker`/materialized views no se trackean — relevante si el proyecto usa vistas para reporting (hay funciones de export: `supabase_export_ventas_fn.sql`, `supabase_export_productos_fn.sql`).
   Fuente: [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
8. **Requiere Docker corriendo siempre para diffear** — no hay modo "solo archivos, sin contenedor" para generar el diff; el shadow database se levanta en cada `db diff`. Esto es un cambio de fricción de desarrollo no trivial para un equipo que hoy solo pega SQL en el editor web.
   Fuente: [CLI reference — db diff](https://supabase.com/docs/reference/cli/supabase-db-diff)

## 7. Fuentes consultadas

- [Declarative database schemas — Supabase Docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
- [Database Migrations — Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)
- [CLI reference — supabase db diff](https://supabase.com/docs/reference/cli/supabase-db-diff)
- [CLI reference — supabase db pull](https://supabase.com/docs/reference/cli/supabase-db-pull)
- [CLI reference — introduction](https://supabase.com/docs/reference/cli/introduction)
- [Getting started — Supabase CLI (install, Docker requirement, `init`)](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Declarative Schemas for Simpler Database Management — Supabase Blog, 2025-04-03](https://supabase.com/blog/declarative-schemas)
- [Declarative Schemas — Supabase Features page](https://supabase.com/features/declarative-schemas)
- [\[Public Alpha\] Declarative Schema Management with pg-delta — Changelog, 2026-04-16](https://supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta)
- [\[Public Alpha\] Declarative Schema Management with pg-delta — GitHub Discussion #44938](https://github.com/orgs/supabase/discussions/44938)
- [supabase/cli issue #5555 — stale Postgres container version not detected before declarative schema sync](https://github.com/supabase/cli/issues/5555)
- [supabase/cli releases](https://github.com/supabase/cli/releases)

## 8. Evidencia local (este repo, verificada durante la investigación)

- `supabase/` es plana: 47 archivos `.sql` con prefijo `supabase_*.sql` en la raíz de `supabase/`, más 1 en `supabase/_archive/`. No hay `config.toml`.
- `package.json`: sin el CLI de Supabase como dependencia; solo clientes de runtime (`@supabase/supabase-js@^2.112.0`, `@supabase/ssr@^0.8.0`, `@supabase/auth-helpers-nextjs@^0.15.0`).
- `supabase/supabase_fix_oauth_trigger.sql`: define `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users` + `CREATE OR REPLACE FUNCTION public.handle_new_user()` — el patrón exacto que el bug de `pg-delta` (sección 3/6) reporta como no confiable en el diff.
- Múltiples scripts de policies iterativas (`supabase_store_scoping_products.sql`, `supabase_store_scoping_orders.sql`, `supabase_store_scoping_stock.sql`, `supabase_store_scoping_combos.sql`, `supabase_fix_stock_scoping_gaps.sql`, `supabase_fix_super_admin_remaining_policies.sql`, `supabase_rls_products.sql`, `supabase_block4_rls.sql`, `supabase_stores_read_policy.sql`) — el caso de uso de "alterar policies existentes" que `ALTER POLICY` no cubre en el diff.
- Scripts de backfill/DML (`supabase_backfill_null_store_orders.sql`, `supabase_backfill_store_id.sql`, `supabase_backfill_unit_cost.sql`) — quedarían fuera del flujo declarativo de todas formas.
