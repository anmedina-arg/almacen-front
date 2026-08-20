-- ============================================================================
-- Fix: regresión de #17 — get_all_products_with_stock() perdió la lógica
-- de stock virtual de combos
-- ============================================================================
-- supabase_combos.sql (PART 1e) había actualizado get_all_products_with_stock
-- para que los productos combo muestren stock virtual
-- (get_combo_effective_stock: mínimo de stock disponible entre los
-- componentes, dividido por la cantidad que usa cada uno) en vez de su
-- propia fila de product_stock (que un combo normalmente no tiene, porque
-- su stock se deriva de los componentes, no se carga a mano).
--
-- Al reescribir esta función para #17 (agregar p_store_id) se la basó en
-- el archivo original sin soporte de combos (supabase_get_all_products_stock.sql)
-- en vez de en pg_get_functiondef contra la definición vigente real —
-- exactamente el error que #70/#49 ya habían enseñado a evitar, repetido
-- acá. Confirmado en producción: la versión vigente después de #17 no
-- tenía la lógica de combos. Encontrado investigando #18 (scoping de
-- combos), antes de tocar nada de ese ticket.
--
-- Este fix junta las dos cosas: el store scoping de #17 + la lógica de
-- combos de supabase_combos.sql, sin perder ninguna. Misma firma
-- (integer) que la vigente — no hace falta DROP FUNCTION, CREATE OR
-- REPLACE alcanza.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, verificar manualmente que un
-- combo real muestra stock virtual correcto en /admin/stock, y recién
-- después en producción.
-- ============================================================================

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
    CASE
      WHEN p.is_combo THEN
        CASE WHEN p.max_stock IS NOT NULL
          THEN LEAST(public.get_combo_effective_stock(p.id), p.max_stock)
          ELSE public.get_combo_effective_stock(p.id)
        END
      ELSE ps.quantity
    END AS quantity,
    ps.min_stock,
    CASE
      WHEN p.is_combo THEN false
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

COMMENT ON FUNCTION public.get_all_products_with_stock IS 'Retorna los productos de una Store con su stock (LEFT JOIN). Combos muestran stock virtual (get_combo_effective_stock). Filtra por products.store_id.';

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT pg_get_functiondef(oid) LIKE '%is_combo%' AS tiene_logica_combos
FROM pg_proc
WHERE proname = 'get_all_products_with_stock' AND pronamespace = 'public'::regnamespace;
