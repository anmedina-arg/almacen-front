-- ============================================================================
-- Función: get_top_categories
-- Dominio: Ranking (#89, spec #81, mapa #74). Scoping por Store: #20.
-- ============================================================================
-- Top categorías por facturación, en una ventana de fechas opcional. Solo
-- facturación (no unidades — no son comparables entre tipos de producto,
-- ver CONTEXT.md/memoria de sesión sobre el toggle "Por categoría" del
-- ranking).
--
-- Scoped por Store desde #20 — mismo criterio que get_top_products.sql:
-- p_store_id requerido (sin default), autorización vía
-- is_store_admin(p_store_id), filtro de datos por o.store_id. Pasa de
-- LANGUAGE sql a plpgsql para poder hacer el chequeo de autorización.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_categories(
  p_store_id   INT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date   TIMESTAMPTZ DEFAULT NULL,
  p_limit      INT         DEFAULT 10
)
RETURNS TABLE (
  category_id   INT,
  category_name TEXT,
  revenue       NUMERIC
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
    cat.id                                AS category_id,
    COALESCE(cat.name, 'Sin categoría')   AS category_name,
    SUM(oi.quantity * oi.unit_price)      AS revenue
  FROM order_items oi
  JOIN orders   o   ON oi.order_id   = o.id
  JOIN products p   ON oi.product_id = p.id
  LEFT JOIN categories cat ON p.category_id = cat.id
  WHERE o.status IN ('pending', 'confirmed')
    AND o.store_id = p_store_id
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date   IS NULL OR o.created_at <= p_end_date)
  GROUP BY cat.id, cat.name
  ORDER BY SUM(oi.quantity * oi.unit_price) DESC
  LIMIT p_limit;
END;
$$;
