-- ============================================================================
-- Función: export_productos
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Scoping por
-- Store: #21.
-- ============================================================================
-- Catálogo completo de productos con costo, precio, margen, categoría,
-- subcategoría y stock actual (virtual para combos, vía
-- get_combo_effective_stock — dominio Combos #86). Consumida por
-- /admin/informes para el CSV de catálogo.
--
-- Scoped por Store desde #21 — p_store_id requerido (sin default). Pasa de
-- LANGUAGE sql a plpgsql para el chequeo de autorización (mismo criterio
-- que Ranking #20). Autorización vía is_store_admin(p_store_id) — puente
-- permisivo, ver ADR-0008.
--
-- Sin cambios de lógica de negocio desde supabase_export_productos_fn.sql
-- (creación original) más allá del scoping — solo se agrega p_store_id +
-- el WHERE y el chequeo de autorización.
--
-- Firma anterior a #21 (histórico, NO ejecutar — solo referencia si hiciera
-- falta el DROP FUNCTION exacto de nuevo): export_productos().
-- ============================================================================

CREATE OR REPLACE FUNCTION export_productos(p_store_id INTEGER)
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  RETURN QUERY
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

  WHERE p.store_id = p_store_id

  ORDER BY cat.name ASC NULLS LAST, sub.name ASC NULLS LAST, p.name ASC;
END;
$$;
