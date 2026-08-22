-- ============================================================================
-- SORT ORDER: ordenamiento manual de categorías y subcategorías
-- ============================================================================
--
-- PROBLEMA
-- --------
-- El orden de categorías en el catálogo estaba acoplado al orden alfabético
-- de los productos. El admin no tenía control sobre qué categoría aparece
-- primero en la navegación ni en el listado de productos.
--
-- SOLUCIÓN
-- --------
-- Agregar columna sort_order a categories y subcategories.
-- El admin puede reordenar desde /admin/categories con botones ↑ / ↓.
-- El catálogo usa este orden como fuente de verdad.
--
-- EJECUCIÓN
-- ---------
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Es idempotente: ADD COLUMN IF NOT EXISTS no rompe si ya existe.
--
-- ORDEN DE EJECUCIÓN
-- ------------------
-- No tiene dependencias. Ejecutar antes de desplegar el código frontend.
-- ============================================================================

-- 1. Agregar sort_order a categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Inicializar con el orden actual (por id) para no romper el orden existente
UPDATE public.categories
SET sort_order = id
WHERE sort_order = 0;

-- 3. Agregar sort_order a subcategories
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 4. Inicializar subcategories con orden por id dentro de cada categoría
UPDATE public.subcategories s
SET sort_order = (
  SELECT COUNT(*) + 1
  FROM public.subcategories s2
  WHERE s2.category_id = s.category_id
    AND s2.id < s.id
)
WHERE s.sort_order = 0;

-- 5. Índices para ordenamiento eficiente
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_sort_order ON public.subcategories(sort_order);

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================================================
-- SELECT id, name, sort_order FROM categories ORDER BY sort_order;
-- SELECT id, category_id, name, sort_order FROM subcategories ORDER BY category_id, sort_order;
-- ============================================================================
