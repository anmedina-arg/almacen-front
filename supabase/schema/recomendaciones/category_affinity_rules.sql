-- ============================================================================
-- Tabla: category_affinity_rules
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Scoping por
-- Store: #21.
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
-- completamente extraído — ver supabase/README.md) +
-- #21 (policy reescrita contra is_store_admin(store_id) en vez de rol
-- global — no hay UI de CRUD para estas reglas todavía, solo se tocan a
-- mano en el SQL Editor, pero la policy sí queda alineada con el resto de
-- las tablas de negocio).
--
-- Policy aplicada y confirmada en producción el 2026-08-24 (pg_policies).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.category_affinity_rules (
  id               SERIAL PRIMARY KEY,
  from_category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  to_category_id   INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  boost            NUMERIC(5, 2) NOT NULL DEFAULT 1.5,
  store_id         INTEGER NOT NULL REFERENCES public.stores(id),

  CONSTRAINT category_affinity_rules_unique UNIQUE (from_category_id, to_category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_affinity_rules_store_id ON public.category_affinity_rules(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.category_affinity_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage category_affinity_rules" ON public.category_affinity_rules;
CREATE POLICY "Admins can manage category_affinity_rules"
  ON public.category_affinity_rules FOR ALL
  USING (public.is_store_admin(category_affinity_rules.store_id))
  WITH CHECK (public.is_store_admin(category_affinity_rules.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado). No confundir con
-- el puente de negocio de refresh_product_affinity.sql (reglas globales
-- con store_id NULL aplicando a todas las Stores) — ese es un diseño
-- deliberado y permanente, no el bridge de autorización de este ADR.
