-- ============================================================================
-- Scoping por Store: products, categories, subcategories
-- Ticket: #15 (https://github.com/anmedina-arg/almacen-front/issues/15)
-- ============================================================================
-- Reemplaza el chequeo de admin global (profiles.role = 'admin') en las
-- policies de escritura/lectura-admin por membership scoped a la Store de
-- la fila (store_admins), o super_admin (#13). Puente temporal
-- (`OR store_id IS NULL`) para no romper filas legacy hasta el ticket de
-- contract (#22) que haga store_id NOT NULL.
--
-- Las policies de lectura pública ("Public can view active products",
-- "Anyone can read categories/subcategories") NO se tocan: un visitante
-- anónimo no tiene membership que comparar, así que el aislamiento del
-- catálogo público se resuelve a nivel aplicación (fetchPublicProducts
-- filtra por store_id explícitamente), no acá.
--
-- Idempotente y seguro de re-correr: si ya corriste una versión anterior de
-- este mismo archivo (con el predicado repetido inline en vez de la función
-- is_store_admin), este script reemplaza esas policies sin problema —
-- CREATE OR REPLACE FUNCTION + DROP POLICY IF EXISTS.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-scoping-products.test.ts), y recién después en producción.
-- ============================================================================

-- ── categories.name: UNIQUE global -> UNIQUE por Store ─────────────────────
-- categories.name tenía UNIQUE global (declarado inline en el CREATE TABLE
-- original, sin nombre explícito) — dos Stores no podían tener ambas una
-- categoría "Bebidas". Se busca el nombre real de la constraint en
-- pg_constraint (mismo patrón que #13 con profiles.role) en vez de asumirlo.
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.categories'::regclass
    AND contype = 'u'
    AND (SELECT array_agg(attname) FROM pg_attribute
         WHERE attrelid = 'public.categories'::regclass
           AND attnum = ANY(conkey)) = ARRAY['name']::name[];

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  -- No falla si ya se aplicó antes (re-correr este script no debería romper).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_store_id_name_key'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_store_id_name_key UNIQUE (store_id, name);
  END IF;
END $$;

-- ── is_store_admin() ────────────────────────────────────────────────────
-- Único lugar con el predicado del puente permisivo — antes se repetía
-- inline 10 veces entre las 12 policies de abajo (encontrado en code
-- review). STABLE (no LANGUAGE plpgsql: es una sola query, sql alcanza) —
-- ayuda al planner dentro de una misma policy evaluation.
CREATE OR REPLACE FUNCTION public.is_store_admin(check_store_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.profile_id = auth.uid() AND sa.store_id = check_store_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR check_store_id IS NULL;
$$;

-- ── products ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_store_admin(products.store_id))
  WITH CHECK (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_store_admin(products.store_id));

-- ── categories ───────────────────────────────────────────────────────────
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

-- ── subcategories ────────────────────────────────────────────────────────
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

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('products', 'categories', 'subcategories')
ORDER BY tablename, cmd;
