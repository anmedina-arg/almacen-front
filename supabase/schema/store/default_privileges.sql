-- ============================================================================
-- Privilegios por defecto del schema public (#154)
-- Dominio: Store (plataforma)
-- ============================================================================
-- Supabase configura ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA
-- public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role: toda
-- función nueva nace invocable por /rest/v1/rpc con la anon key. Así se
-- abrieron cancel_order/confirm_order (fix 2026-10-20) y así quedaron 12 RPC
-- de admin más (auditoría #154): el patrón "la ruta de API valida antes de
-- llamar al RPC" no protege nada si el RPC se puede llamar directo.
--
-- Esto cambia el default: las funciones nuevas nacen SIN EXECUTE para anon
-- ni PUBLIC. authenticated y service_role lo conservan (siguen en el default
-- ACL de Supabase). Consecuencia para quien escribe un canónico nuevo (ver
-- docs/agents/schema-changes.md, "Permisos de ejecución de funciones"): si la función es
-- pública (catálogo, checkout), lleva GRANT EXECUTE ... TO anon explícito —
-- como create_order.sql, get_top_seller_ids.sql, get_recommendations.sql,
-- get_available_stock.sql, add_order_item_variedades.sql, is_store_admin.sql
-- e is_stock_tracked.sql. Si es de admin, no lleva nada y queda cerrada.
--
-- Solo afecta a funciones creadas DESPUÉS de aplicarse: no toca los grants
-- existentes (por eso aplicarlo en producción no rompe nada, y por eso las
-- RPC de admin ya existentes llevan además su REVOKE propio).
--
-- FOR ROLE postgres porque ese es el owner de todas las funciones del
-- proyecto, en producción (SQL Editor / MCP corren como postgres) y en la
-- base local de Docker (las migraciones también). Va primero en
-- apply-order.txt para que rija sobre todo lo que se crea después.
--
-- Hacen falta DOS sentencias. En Postgres los defaults por schema se SUMAN a
-- los globales del rol, y el EXECUTE para PUBLIC viene del default global
-- incorporado — un REVOKE ... IN SCHEMA no lo puede sacar (verificado en la
-- base local el 2026-11-06: con solo la forma IN SCHEMA, las funciones nuevas
-- perdían `anon=X` pero conservaban `=X`, y anon ejecuta vía PUBLIC igual).
-- El grant a anon sí vive en el default por schema de Supabase, así que ese
-- se saca con IN SCHEMA.
-- ============================================================================

-- Riesgo asumido de la forma global: alcanza a toda función que `postgres`
-- cree después en CUALQUIER schema, incluidas las de una extensión instalada
-- por postgres desde el Dashboard (sus objetos toman los default privileges
-- del creador salvo GRANT propio en el script). Las extensiones ya
-- instaladas y las que crea supabase_admin no cambian. Si se habilita una
-- extensión nueva y se la usa desde consultas anon/authenticated, verificar
-- su ACL (has_function_privilege) y dar GRANT explícito si hace falta.
--
-- 1. Global: sin EXECUTE para PUBLIC en ninguna función nueva de postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 2. Schema public: sacar a anon del default que Supabase configura ahí.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
