-- ============================================================================
-- Scoping por Store: product_stock, stock_movement_log
-- Ticket: #17 (https://github.com/anmedina-arg/almacen-front/issues/17)
-- ============================================================================
-- NOTA: code review encontró que p_store_id en upsert_product_stock/
-- increment_product_stock quedó con DEFAULT NULL a pesar de que este mismo
-- comment decía "sin default" — corregido en
-- supabase_fix_stock_scoping_gaps.sql (reordena el parámetro). Ese mismo
-- review también cuestionó la lectura de product_stock (acá no se toca a
-- propósito, ver el comment más abajo) — se investigó y se decidió NO
-- tocarla: la policy real en producción ("Anyone can view stock", USING
-- true) sostiene el catálogo público para visitantes anónimos, tightening
-- la hubiera roto. Ver el header de supabase_fix_stock_scoping_gaps.sql
-- para el detalle completo de esa investigación.
-- ============================================================================
-- Mismo patrón que #15/#16: RLS de escritura/lectura-admin reescrita contra
-- is_store_admin() (ya existe desde #15, no se repite acá). Puente
-- permisivo (`store_id IS NULL`, dentro de is_store_admin) para no romper
-- filas legacy hasta el ticket de contract (#22).
--
-- Las 4 funciones RPC (upsert_product_stock, increment_product_stock,
-- get_all_products_with_stock, get_low_stock_products) ganan p_store_id
-- SIN default — a diferencia de create_order (#16), acá no hay ningún
-- caller legacy que pueda invocarlas sin store_id (las 5 rutas de API son
-- el único caller), así que no hace falta el puente en la firma misma.
--
-- IMPORTANTE (lección de #70): agregar un parámetro nuevo a una función
-- existente sin DROP FUNCTION primero puede dejar dos firmas conviviendo
-- como overload en vez de reemplazarse. Cada CREATE OR REPLACE de acá va
-- precedido de su DROP FUNCTION con la firma vieja exacta, verificada
-- contra pg_get_function_identity_arguments en producción antes de escribir
-- este archivo (no asumida de ningún .sql viejo).
--
-- get_all_products_with_stock/get_low_stock_products filtran por
-- products.store_id (confiable, backfilleada desde #15) en vez de
-- product_stock.store_id — evita ocultar stock existente cuyo store_id
-- todavía no se haya backfilleado. stock_movement_log sigue sin que sus
-- triggers seteen store_id (#52, sin resolver, fuera de alcance acá); la
-- ruta de historial valida el producto contra `products` en vez de
-- filtrar el log por su propio store_id.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-scoping-stock.test.ts), y recién después en producción.
-- ============================================================================

-- ── Backfill: la única fila de product_stock sin store_id ──────────────────
UPDATE public.product_stock ps
SET store_id = p.store_id
FROM public.products p
WHERE ps.product_id = p.id AND ps.store_id IS NULL;

-- ── product_stock: RLS de escritura ─────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert stock" ON public.product_stock;
CREATE POLICY "Admins can insert stock"
  ON public.product_stock FOR INSERT
  WITH CHECK (public.is_store_admin(product_stock.store_id));

DROP POLICY IF EXISTS "Admins can update stock" ON public.product_stock;
CREATE POLICY "Admins can update stock"
  ON public.product_stock FOR UPDATE
  USING (public.is_store_admin(product_stock.store_id))
  WITH CHECK (public.is_store_admin(product_stock.store_id));

DROP POLICY IF EXISTS "Admins can delete stock" ON public.product_stock;
CREATE POLICY "Admins can delete stock"
  ON public.product_stock FOR DELETE
  USING (public.is_store_admin(product_stock.store_id));

-- La policy de lectura pública de product_stock (nombre real en producción:
-- "Anyone can view stock", USING true — no "Authenticated users can view
-- stock" como decía supabase_stock_control.sql, desactualizado; verificado
-- con pg_policies durante code review) NO se toca — igual que la lectura
-- pública de products en #15, el aislamiento de esa lectura se resuelve a
-- nivel aplicación (fetchPublicProducts ya filtra por store_id), no acá.

-- ── stock_movement_log: RLS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view stock log" ON public.stock_movement_log;
CREATE POLICY "Admins can view stock log"
  ON public.stock_movement_log FOR SELECT
  USING (public.is_store_admin(stock_movement_log.store_id));

DROP POLICY IF EXISTS "System can insert stock log" ON public.stock_movement_log;
CREATE POLICY "System can insert stock log"
  ON public.stock_movement_log FOR INSERT
  WITH CHECK (public.is_store_admin(stock_movement_log.store_id));

-- ── upsert_product_stock(): + p_store_id ────────────────────────────────
-- Firma vieja verificada en producción: (integer, numeric, numeric, text, text)
DROP FUNCTION IF EXISTS public.upsert_product_stock(INTEGER, NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_product_stock(
  p_product_id INTEGER,
  p_quantity NUMERIC(12, 3),
  p_min_stock NUMERIC(12, 3) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'manual_adjustment',
  p_store_id INTEGER DEFAULT NULL
)
RETURNS public.product_stock
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result public.product_stock;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  -- Producto debe existir Y pertenecer a la Store del caller — evita que
  -- un admin de la Store A pueda tocar el stock de un product_id de la
  -- Store B adivinando el id.
  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Product not found in this store: %', p_product_id;
  END IF;

  PERFORM set_config('app.movement_type', p_movement_type, true);

  INSERT INTO public.product_stock (
    product_id, quantity, min_stock, updated_by, notes, store_id
  ) VALUES (
    p_product_id, p_quantity, p_min_stock, v_user_id, p_notes, p_store_id
  )
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    min_stock = EXCLUDED.min_stock,
    updated_by = EXCLUDED.updated_by,
    notes = EXCLUDED.notes,
    store_id = EXCLUDED.store_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.upsert_product_stock IS 'Crea o actualiza el stock de un producto, scoped por Store. Verifica membership de store_admins (o super_admin) y que el producto pertenezca a esa Store.';

-- ── increment_product_stock(): + p_store_id ─────────────────────────────
-- Firma vieja verificada en producción: (integer, numeric, text)
DROP FUNCTION IF EXISTS public.increment_product_stock(INTEGER, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id   INTEGER,
  p_increment    NUMERIC(12, 3),
  p_notes        TEXT DEFAULT NULL,
  p_store_id     INTEGER DEFAULT NULL
)
RETURNS public.product_stock
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result  public.product_stock;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Product not found in this store: %', p_product_id;
  END IF;

  IF p_increment <= 0 THEN
    RAISE EXCEPTION 'Increment must be greater than 0, got: %', p_increment;
  END IF;

  PERFORM set_config('app.movement_type', 'purchase', true);

  INSERT INTO public.product_stock (product_id, quantity, updated_by, notes, store_id)
  VALUES (p_product_id, p_increment, v_user_id, p_notes, p_store_id)
  ON CONFLICT (product_id)
  DO UPDATE SET
    quantity   = public.product_stock.quantity + EXCLUDED.quantity,
    updated_by = EXCLUDED.updated_by,
    notes      = EXCLUDED.notes,
    store_id   = EXCLUDED.store_id,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, TEXT, INTEGER) TO authenticated;

-- ── get_all_products_with_stock(): + p_store_id (requerido) ────────────
-- Firma vieja verificada en producción: () — sin parámetros.
DROP FUNCTION IF EXISTS public.get_all_products_with_stock();

CREATE OR REPLACE FUNCTION public.get_all_products_with_stock(p_store_id INTEGER)
RETURNS TABLE (
  stock_id BIGINT,
  product_id INTEGER,
  product_name TEXT,
  product_price NUMERIC,
  main_category TEXT,
  product_active BOOLEAN,
  product_image TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  is_low_stock BOOLEAN,
  updated_by UUID,
  updated_by_name TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ps.id AS stock_id,
    p.id AS product_id,
    p.name AS product_name,
    p.price AS product_price,
    p.main_category,
    p.active AS product_active,
    p.image AS product_image,
    ps.quantity,
    ps.min_stock,
    CASE
      WHEN ps.min_stock IS NOT NULL AND ps.quantity IS NOT NULL
        AND ps.quantity <= ps.min_stock
      THEN true
      ELSE false
    END AS is_low_stock,
    ps.updated_by,
    pr.full_name AS updated_by_name,
    ps.notes,
    ps.updated_at
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id
  LEFT JOIN public.profiles pr ON pr.id = ps.updated_by
  WHERE p.store_id = p_store_id
  ORDER BY p.name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_all_products_with_stock IS 'Retorna los productos de una Store con su stock (LEFT JOIN). Filtra por products.store_id, no product_stock.store_id — evita ocultar stock cuyo store_id no se haya backfilleado todavía.';

-- ── get_low_stock_products(): + p_store_id (requerido) ─────────────────
-- Firma vieja verificada en producción: () — sin parámetros.
DROP FUNCTION IF EXISTS public.get_low_stock_products();

CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_store_id INTEGER)
RETURNS TABLE (
  product_id INTEGER,
  product_name TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  main_category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ps.product_id,
    p.name::TEXT AS product_name,
    ps.quantity,
    ps.min_stock,
    p.main_category::TEXT
  FROM public.product_stock ps
  JOIN public.products p ON p.id = ps.product_id
  WHERE p.store_id = p_store_id
    AND ps.min_stock IS NOT NULL
    AND ps.quantity <= ps.min_stock
    AND p.active = true
  ORDER BY (ps.quantity / NULLIF(ps.min_stock, 0)) ASC;
END;
$$;

COMMENT ON FUNCTION public.get_low_stock_products IS 'Retorna productos activos de una Store con stock por debajo del mínimo. Filtra por products.store_id.';

-- Forzar el refresh del cache de esquema de PostgREST — no esperar a que
-- se dispare solo (lección de #70: no fue confiable la última vez).
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('upsert_product_stock', 'increment_product_stock', 'get_all_products_with_stock', 'get_low_stock_products')
ORDER BY p.proname;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('product_stock', 'stock_movement_log')
ORDER BY tablename, cmd;

SELECT count(*) FILTER (WHERE store_id IS NULL) AS product_stock_sin_store_id
FROM public.product_stock;
