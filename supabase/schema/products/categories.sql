-- ============================================================================
-- Tabla: categories
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción el 2026-08-22. Fuentes: supabase_categories.sql
-- (creación) + supabase_categories_image.sql (image_url) +
-- supabase_sort_order.sql (sort_order) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_products.sql (#15 — reemplazó el UNIQUE global de
-- `name` por UNIQUE(store_id, name); policies reescritas contra
-- is_store_admin()).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  store_id   INTEGER NOT NULL REFERENCES public.stores(id),

  CONSTRAINT categories_store_id_name_key UNIQUE (store_id, name)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);

-- ── Trigger ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_store_admin(categories.store_id));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_store_admin(categories.store_id))
  WITH CHECK (public.is_store_admin(categories.store_id));

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_store_admin(categories.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado).
