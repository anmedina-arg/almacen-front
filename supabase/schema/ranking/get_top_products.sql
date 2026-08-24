-- ============================================================================
-- Función: get_top_products
-- Dominio: Ranking (#89, spec #81, mapa #74). Scoping por Store: #20.
-- ============================================================================
-- Top productos por unidades vendidas o facturación, en una ventana de
-- fechas opcional, filtrable por categoría. Incluye margen/margen% al
-- costo actual del producto (no snapshot histórico).
--
-- Scoped por Store desde #20 — p_store_id requerido (sin default, no hay
-- caller legacy, mismo criterio que Stock #17). Autorización vía
-- is_store_admin(p_store_id) (puente permisivo, ver ADR-0008) + filtro de
-- datos por o.store_id — mismo patrón que get_all_products_with_stock
-- (Stock). Requirió pasar de LANGUAGE sql a plpgsql para poder hacer el
-- chequeo de autorización con IF/RAISE.
--
-- get_top_seller_ids (dominio Ranking, no tocada acá) queda fuera de
-- alcance de #20 a propósito — la usa el catálogo público
-- (fetchPublicProducts.ts), no /admin/ranking; scoping de esa función es
-- un ticket aparte.
--
-- Aplicada y confirmada en producción el 2026-08-25: DROP FUNCTION de los
-- 2 overloads viejos (4 y 5 params, ver Gaps/hallazgo en el README de este
-- dominio) + CREATE OR REPLACE de esta versión — verificado con
-- pg_get_function_identity_arguments que quedó una sola firma.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_products(
  p_store_id    INT,
  p_start_date  TIMESTAMPTZ DEFAULT NULL,
  p_end_date    TIMESTAMPTZ DEFAULT NULL,
  p_limit       INT         DEFAULT 10,
  p_category_id INT         DEFAULT NULL,
  p_metric      TEXT        DEFAULT 'units'  -- 'units' | 'revenue'
)
RETURNS TABLE (
  product_id    INT,
  product_name  TEXT,
  product_image TEXT,
  sale_type     TEXT,
  category_name TEXT,
  units_sold    NUMERIC,
  revenue       NUMERIC,
  current_price NUMERIC,
  current_cost  NUMERIC,
  margin        NUMERIC,
  margin_pct    NUMERIC
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
    p.id                                          AS product_id,
    p.name                                        AS product_name,
    p.image                                       AS product_image,
    p.sale_type,
    cat.name                                      AS category_name,
    SUM(oi.quantity)                              AS units_sold,
    SUM(oi.quantity * oi.unit_price)              AS revenue,
    p.price                                       AS current_price,
    COALESCE(p.cost, 0)                           AS current_cost,
    CASE
      WHEN COALESCE(p.cost, 0) = 0 THEN p.price
      ELSE p.price - p.cost
    END                                           AS margin,
    CASE
      WHEN COALESCE(p.cost, 0) = 0 THEN NULL
      ELSE ROUND(((p.price - p.cost) / p.cost * 100)::NUMERIC, 1)
    END                                           AS margin_pct
  FROM order_items oi
  JOIN orders    o   ON oi.order_id   = o.id
  JOIN products  p   ON oi.product_id = p.id
  LEFT JOIN categories cat ON p.category_id = cat.id
  WHERE o.status IN ('pending', 'confirmed')
    AND o.store_id = p_store_id
    AND (p_start_date  IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date    IS NULL OR o.created_at <= p_end_date)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
  GROUP BY p.id, p.name, p.image, p.sale_type, p.price, p.cost, cat.name
  ORDER BY
    CASE WHEN p_metric = 'revenue' THEN SUM(oi.quantity * oi.unit_price)
         ELSE SUM(oi.quantity)
    END DESC,
    p.name ASC
  LIMIT p_limit;
END;
$$;
