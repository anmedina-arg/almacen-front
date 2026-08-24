-- ============================================================================
-- Tabla: category_affinity_rules
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Prepara
-- terreno para #21 (Scoping por Store: POS/Dashboard/Informes/Recomendaciones).
-- ============================================================================
-- Reglas manuales de afinidad entre categorías (ej: "bebidas → snacks, boost
-- 2.0") — multiplica el score de co-ocurrencia entre productos de esas
-- categorías en refresh_product_affinity() (ver ese archivo). No genera
-- sugerencias por sí sola sin historial de co-ocurrencias — ver la nota en
-- get_recommendations.sql sobre supabase_category_affinity.sql.
--
-- Verificado contra producción el 2026-08-24. Fuentes:
-- supabase_recommendations.sql (creación original) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_fix_super_admin_remaining_policies.sql (2026-08-19 — policy
-- actualizada para reconocer super_admin además de admin; este dominio es
-- el último en confirmar su parte de ese archivo, que ahora queda
-- completamente extraído — ver supabase/README.md).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.category_affinity_rules (
  id               SERIAL PRIMARY KEY,
  from_category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  to_category_id   INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  boost            NUMERIC(5, 2) NOT NULL DEFAULT 1.5,
  store_id         INTEGER REFERENCES public.stores(id),

  CONSTRAINT category_affinity_rules_unique UNIQUE (from_category_id, to_category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_affinity_rules_store_id ON public.category_affinity_rules(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.category_affinity_rules ENABLE ROW LEVEL SECURITY;

-- NO scoped por Store todavía — chequea rol global (admin/super_admin), no
-- is_store_admin(store_id). Ver #21 y Gaps conocidos en el README.
DROP POLICY IF EXISTS "Admins can manage category_affinity_rules" ON public.category_affinity_rules;
CREATE POLICY "Admins can manage category_affinity_rules"
  ON public.category_affinity_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
