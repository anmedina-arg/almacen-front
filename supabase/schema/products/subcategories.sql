-- ============================================================================
-- Tabla: subcategories
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción el 2026-08-22. Fuentes: supabase_categories.sql
-- (creación) + supabase_sort_order.sql (sort_order) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_products.sql (#15 — policies reescritas contra
-- is_store_admin()). A diferencia de categories, su UNIQUE(category_id,
-- name) no se tocó en #15 — category_id ya es indirectamente por-Store
-- (cada categoría pertenece a una sola Store), así que no hacía falta
-- agregar store_id al UNIQUE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subcategories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  store_id    INTEGER NOT NULL REFERENCES public.stores(id),

  UNIQUE (category_id, name)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_sort_order ON public.subcategories(sort_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_store_id ON public.subcategories(store_id);

-- ── Trigger ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_subcategories_updated_at ON public.subcategories;
CREATE TRIGGER trg_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read subcategories" ON public.subcategories;
CREATE POLICY "Anyone can read subcategories"
  ON public.subcategories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert subcategories" ON public.subcategories;
CREATE POLICY "Admins can insert subcategories"
  ON public.subcategories FOR INSERT
  WITH CHECK (public.is_store_admin(subcategories.store_id));

DROP POLICY IF EXISTS "Admins can update subcategories" ON public.subcategories;
CREATE POLICY "Admins can update subcategories"
  ON public.subcategories FOR UPDATE
  USING (public.is_store_admin(subcategories.store_id))
  WITH CHECK (public.is_store_admin(subcategories.store_id));

DROP POLICY IF EXISTS "Admins can delete subcategories" ON public.subcategories;
CREATE POLICY "Admins can delete subcategories"
  ON public.subcategories FOR DELETE
  USING (public.is_store_admin(subcategories.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado).
