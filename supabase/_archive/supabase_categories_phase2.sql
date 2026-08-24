-- Phase 2: Asociar Productos a Categorías y Subcategorías
-- Ejecutar manualmente en el Supabase SQL Editor

-- 1. Agregar FKs nullable a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- 2. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);

-- 3. Hacer main_category nullable con default 'otros'
--    para que los nuevos productos no requieran el campo legacy
ALTER TABLE products ALTER COLUMN main_category SET DEFAULT 'otros';
ALTER TABLE products ALTER COLUMN main_category DROP NOT NULL;
