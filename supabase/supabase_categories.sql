-- ============================================================================
-- Categories & Subcategories - Supabase Migration
-- ============================================================================
-- Tables: categories, subcategories
-- Relationships: subcategories.category_id → categories.id (ON DELETE CASCADE)
-- RLS: public read, admin write
-- Triggers: auto-update updated_at using shared update_updated_at_column()
-- ============================================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create subcategories table (1 category → N subcategories)
CREATE TABLE IF NOT EXISTS public.subcategories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, name)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);

-- 4. Triggers (reuses shared function already in DB)
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subcategories_updated_at ON public.subcategories;
CREATE TRIGGER trg_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can read subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admins can insert subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admins can update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admins can delete subcategories" ON public.subcategories;

-- Categories policies
CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Subcategories policies
CREATE POLICY "Anyone can read subcategories"
  ON public.subcategories FOR SELECT USING (true);

CREATE POLICY "Admins can insert subcategories"
  ON public.subcategories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update subcategories"
  ON public.subcategories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete subcategories"
  ON public.subcategories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
