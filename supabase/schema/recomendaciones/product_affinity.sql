-- ============================================================================
-- Tabla: product_affinity
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Prepara
-- terreno para #21.
-- ============================================================================
-- Matriz de afinidad producto-a-producto por co-ocurrencia en pedidos
-- (últimos 30 días), recalculada por refresh_product_affinity(). Ambas
-- direcciones (a→b y b→a) se guardan como filas separadas para lookup
-- directo desde get_recommendations().
--
-- Verificado contra producción el 2026-08-24. Fuentes:
-- supabase_recommendations.sql (creación original) +
-- supabase_multitenant_schema_expand.sql (store_id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_affinity (
  product_id_a  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id_b  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  score         NUMERIC(8, 4) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id      INTEGER REFERENCES public.stores(id),

  PRIMARY KEY (product_id_a, product_id_b)
);

CREATE INDEX IF NOT EXISTS idx_affinity_a ON public.product_affinity(product_id_a);
CREATE INDEX IF NOT EXISTS idx_affinity_b ON public.product_affinity(product_id_b);
CREATE INDEX IF NOT EXISTS idx_product_affinity_store_id ON public.product_affinity(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.product_affinity ENABLE ROW LEVEL SECURITY;

-- Lectura pública sin restricción — la API de recomendaciones del catálogo
-- es pública (sin login). NO scoped por Store todavía, ver #21.
DROP POLICY IF EXISTS "Public can read product_affinity" ON public.product_affinity;
CREATE POLICY "Public can read product_affinity"
  ON public.product_affinity FOR SELECT USING (true);
