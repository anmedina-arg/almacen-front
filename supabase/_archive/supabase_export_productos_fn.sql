-- ============================================================================
-- Función export_productos: devuelve el catálogo completo de productos
-- con costo, precio, categoría, subcategoría y stock actual.
-- Para combos el stock es virtual (get_combo_effective_stock).
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION export_productos()
RETURNS TABLE (
  producto_id         INTEGER,
  nombre              TEXT,
  activo              TEXT,
  es_combo            TEXT,
  tipo_venta          TEXT,
  categoria           TEXT,
  subcategoria        TEXT,
  precio_venta        NUMERIC,
  costo               NUMERIC,
  margen              NUMERIC,
  margen_pct          NUMERIC,
  stock_actual        NUMERIC,
  stock_minimo        NUMERIC,
  stock_bajo          TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    CASE WHEN p.active THEN 'sí' ELSE 'no' END,
    CASE WHEN COALESCE(p.is_combo, FALSE) THEN 'sí' ELSE 'no' END,
    COALESCE(p.sale_type, ''),
    COALESCE(cat.name,  ''),
    COALESCE(sub.name,  ''),

    COALESCE(p.price, 0),
    COALESCE(p.cost,  0),

    -- Margen absoluto
    COALESCE(p.price, 0) - COALESCE(p.cost, 0),

    -- Margen porcentual sobre costo (NULL si costo = 0)
    CASE
      WHEN COALESCE(p.cost, 0) > 0
      THEN ROUND(((p.price - p.cost) / p.cost * 100)::NUMERIC, 1)
      ELSE NULL
    END,

    -- Stock: virtual para combos, real para el resto
    CASE
      WHEN COALESCE(p.is_combo, FALSE) THEN
        CASE
          WHEN p.max_stock IS NOT NULL
          THEN LEAST(get_combo_effective_stock(p.id), p.max_stock)
          ELSE get_combo_effective_stock(p.id)
        END
      ELSE COALESCE(ps.quantity, 0)
    END,

    ps.min_stock,

    -- Alerta de stock bajo (solo productos normales con min_stock definido)
    CASE
      WHEN NOT COALESCE(p.is_combo, FALSE)
           AND ps.min_stock IS NOT NULL
           AND COALESCE(ps.quantity, 0) <= ps.min_stock
      THEN 'sí'
      ELSE 'no'
    END

  FROM products p
  LEFT JOIN categories    cat ON cat.id = p.category_id
  LEFT JOIN subcategories sub ON sub.id = p.subcategory_id
  LEFT JOIN product_stock ps  ON ps.product_id = p.id

  ORDER BY cat.name ASC NULLS LAST, sub.name ASC NULLS LAST, p.name ASC;
$$;
