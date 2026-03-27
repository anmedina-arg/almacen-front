-- ============================================================================
-- RPC Function: get_all_products_with_stock
-- ============================================================================
-- Esta función retorna TODOS los productos con su información de stock
-- usando LEFT JOIN para incluir productos sin stock.
-- Mucho más eficiente que hacer múltiples queries desde Node.js.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_products_with_stock()
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
  -- Verificar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
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
  ORDER BY p.name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_all_products_with_stock IS 'Retorna todos los productos con su stock usando LEFT JOIN. Autenticación requerida.';

-- Verificar que se creó correctamente
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_all_products_with_stock';
