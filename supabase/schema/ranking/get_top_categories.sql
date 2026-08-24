-- ============================================================================
-- Función: get_top_categories
-- Dominio: Ranking (#89, spec #81, mapa #74). Prepara terreno para #20
-- (Scoping por Store: Ranking).
-- ============================================================================
-- Top categorías por facturación, en una ventana de fechas opcional. Solo
-- facturación (no unidades — no son comparables entre tipos de producto,
-- ver CONTEXT.md/memoria de sesión sobre el toggle "Por categoría" del
-- ranking).
--
-- NO ESTÁ SCOPED POR STORE — mismo gap que get_top_products, resuelto en
-- #20, no en #89.
--
-- Comparte el mismo JOIN order_items/orders/products/categories y la misma
-- forma de WHERE que get_top_products.sql — duplicación preexistente, no
-- introducida acá, no resuelta en esta migración (relocación verbatim).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-23 — sin
-- cambios desde supabase_ranking.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_categories(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date   TIMESTAMPTZ DEFAULT NULL,
  p_limit      INT         DEFAULT 10
)
RETURNS TABLE (
  category_id   INT,
  category_name TEXT,
  revenue       NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cat.id                                AS category_id,
    COALESCE(cat.name, 'Sin categoría')   AS category_name,
    SUM(oi.quantity * oi.unit_price)      AS revenue
  FROM order_items oi
  JOIN orders   o   ON oi.order_id   = o.id
  JOIN products p   ON oi.product_id = p.id
  LEFT JOIN categories cat ON p.category_id = cat.id
  WHERE o.status IN ('pending', 'confirmed')
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date   IS NULL OR o.created_at <= p_end_date)
  GROUP BY cat.id, cat.name
  ORDER BY SUM(oi.quantity * oi.unit_price) DESC
  LIMIT p_limit;
$$;
