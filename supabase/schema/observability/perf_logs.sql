-- ============================================================================
-- Tabla: perf_logs
-- Dominio: Observability (#141, hijo de spec #139)
-- ============================================================================
-- Registro de duración (en ms) de rutas de código instrumentadas para medir
-- el impacto real de los fixes de performance del spec #139 — necesita ser
-- persistente y consultable para comparar "antes" (antes de #144-147) contra
-- "después" (una vez que cada fix aterrice), algo que los logs de stdout de
-- Vercel no dan por sí solos (retención corta, no agregable con SQL).
--
-- Tabla desechable a propósito: no es dato de negocio, es instrumentación
-- temporal para la remediación de performance en curso. Cuando esa
-- remediación cierre, se puede dropear sin impacto — no hace falta
-- backfill ni migración de datos hacia otro lado.
--
-- No tiene RLS de lectura para nadie más que service_role (bypassea RLS) —
-- se consulta solo desde el SQL Editor con la connection de admin, nunca
-- desde el cliente. INSERT sí está abierto a cualquier rol (anon incluido)
-- porque el catálogo público (visitantes sin sesión) también se instrumenta
-- acá, no solo rutas de admin — con la anon key pública, cualquiera podría
-- insertar filas arbitrarias directo contra el REST endpoint sin pasar por
-- la app (hallazgo de code review de #141). Como defensa en profundidad
-- (no reemplaza autenticación, que acá no aplica a propósito): `route`
-- limitado a las rutas que la app realmente instrumenta hoy, y
-- `duration_ms` acotado a un rango físicamente razonable — no elimina la
-- posibilidad de spam volumétrico con valores válidos, pero sí el caso más
-- barato (basura con cualquier string/número).
--
-- `CREATE TABLE IF NOT EXISTS` es un no-op si la tabla ya existe — válido
-- para esta primera creación (no existe todavía en ningún proyecto), pero
-- si en el futuro se agrega/cambia un CHECK acá, hace falta un
-- `ALTER TABLE ... ADD CONSTRAINT` explícito aparte para que se aplique
-- donde la tabla ya exista, editar este archivo solo no alcanza (hallazgo
-- de code review de #141).
--
-- Aplicado y confirmado en producción el 2026-09-09 (tabla, índice, RLS,
-- policy de INSERT, y los 4 constraints — pkey/route check/duration_ms
-- check/store_id fkey — verificados con pg_constraint). Antes aplicado y
-- probado con inserts válidos/inválidos reales contra el proyecto de test.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.perf_logs (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL CHECK (route IN (
                'catalog_ssr',
                'catalog_search',
                'catalog_category_pagination',
                'catalog_admin_fetch',
                'admin_layout_guard',
                'admin_api_guard',
                'public_api_route'
              )),
  duration_ms NUMERIC(10, 2) NOT NULL CHECK (duration_ms >= 0 AND duration_ms < 3600000),
  store_id    INTEGER REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────────────────
-- Por route + created_at: el patrón de consulta es siempre "promedio/p95 de
-- esta route en este rango de fechas" para comparar antes/después.
CREATE INDEX IF NOT EXISTS idx_perf_logs_route_created_at ON public.perf_logs(route, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.perf_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert perf logs" ON public.perf_logs;
CREATE POLICY "Anyone can insert perf logs"
  ON public.perf_logs FOR INSERT
  WITH CHECK (true);

-- Sin policy de SELECT/UPDATE/DELETE para anon/authenticated a propósito —
-- solo service_role (bypassea RLS) puede leer o limpiar esta tabla.
