-- ============================================================================
-- Fix de un hallazgo del code review de #17 (el otro se revirtió, ver abajo)
-- ============================================================================
-- INTENTO REVERTIDO: achicar la lectura de product_stock a is_store_admin().
-- La hipótesis inicial (basada en supabase_stock_control.sql, que documenta
-- "Authenticated users can view stock" USING auth.role()='authenticated')
-- era que un visitante anónimo del catálogo público ya estaba bloqueado por
-- esa policy, así que acotarla no iba a afectar el catálogo público. Al
-- correr esto en test se encontró que la policy REAL en producción/test no
-- es esa — es "Anyone can view stock" USING (true), sin ninguna condición
-- (verificado con pg_policies.qual, no asumido del archivo, que estaba
-- desactualizado — mismo problema de fondo que #49, con otra policy). Con
-- USING(true), un visitante anónimo SÍ puede leer product_stock hoy, y es
-- justamente lo que sostiene el stock visible en fetchPublicProducts.ts
-- para catálogo público sin login. Achicarla a is_store_admin() habría
-- roto el catálogo para cualquier visitante no logueado. Se revirtió en
-- test (DROP POLICY "Admins can view stock", que no llegó a reemplazar a
-- la vieja porque el nombre no coincidía — quedaron conviviendo, sin
-- efecto real hasta la reversión). Este archivo ya NO toca esa policy.
-- Queda pendiente decidir aparte si la lectura de min_stock/notes
-- (realmente interno, a diferencia de quantity) necesita algún tipo de
-- restricción — no es este ticket.
--
-- FIX QUE SÍ SE MANTIENE: upsert_product_stock/increment_product_stock declaraban
--    `p_store_id INTEGER DEFAULT NULL` a pesar de que el header de
--    supabase_store_scoping_stock.sql decía explícitamente "SIN default".
--    Contradicción real: is_store_admin(NULL) devuelve true (el puente
--    permisivo, pensado para tolerar filas legacy al LEER, no para
--    escribir), así que un caller que omitiera p_store_id pasaba el
--    check de autorización — quedaba protegido solo porque el chequeo de
--    ownership del producto fallaba después, una red de seguridad frágil
--    y no lo que el diseño decía. Se corrige moviendo p_store_id a
--    posición temprana (antes de los parámetros con default) para poder
--    declararlo sin uno — Postgres no permite un parámetro sin default
--    después de uno que sí lo tiene. El orden de parámetros no rompe
--    nada del lado de la app: las rutas llaman al RPC con argumentos
--    nombrados (objeto JS), no posicionales.
--
-- Encontrado en code review (mattpocock-skills:code-review), no en el AC
-- original de #17.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-scoping-stock.test.ts), y recién después en producción.
-- ============================================================================

-- ── upsert_product_stock(): p_store_id requerido (sin default) ─────────
-- Firma vigente verificada tras #17: (integer, numeric, numeric, text, text, integer)
DROP FUNCTION IF EXISTS public.upsert_product_stock(INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.upsert_product_stock(
  p_product_id INTEGER,
  p_quantity NUMERIC(12, 3),
  p_store_id INTEGER,
  p_min_stock NUMERIC(12, 3) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'manual_adjustment'
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

COMMENT ON FUNCTION public.upsert_product_stock IS 'Crea o actualiza el stock de un producto, scoped por Store (p_store_id requerido). Verifica membership de store_admins (o super_admin) y que el producto pertenezca a esa Store.';

-- ── increment_product_stock(): p_store_id requerido (sin default) ──────
-- Firma vigente verificada tras #17: (integer, numeric, text, integer)
DROP FUNCTION IF EXISTS public.increment_product_stock(INTEGER, NUMERIC, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id   INTEGER,
  p_increment    NUMERIC(12, 3),
  p_store_id     INTEGER,
  p_notes        TEXT DEFAULT NULL
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

REVOKE ALL ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(INTEGER, NUMERIC, INTEGER, TEXT) TO authenticated;

-- Forzar el refresh del cache de esquema de PostgREST.
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('upsert_product_stock', 'increment_product_stock')
ORDER BY p.proname;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'product_stock'
ORDER BY cmd;
