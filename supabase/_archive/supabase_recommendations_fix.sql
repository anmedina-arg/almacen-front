-- ============================================================================
-- Fix: get_recommendations — orden incorrecto por DISTINCT ON
-- ============================================================================
--
-- PROBLEMA
-- --------
-- La versión original usaba DISTINCT ON con ORDER BY product_id, lo que hacía
-- que LIMIT p_limit devolviera los 3 productos con IDs más bajos del conjunto
-- combinado (afinidad + fallback), ignorando el score.
--
-- Ejemplo: product_id=37 (score=0, fallback) aparecía antes que
-- product_id=178 (score=1.0, afinidad real) solo por tener un ID menor.
--
-- CAUSA
-- -----
-- PostgreSQL requiere que la primera columna del ORDER BY coincida con las
-- columnas del DISTINCT ON. Esto forzaba ORDER BY product_id primero, y el
-- LIMIT final cortaba por ID ascendente en vez de por score descendente.
--
-- FIX
-- ---
-- Envolver el DISTINCT ON en un subquery. El DISTINCT ON interno deduplica
-- correctamente (por product_id, priorizando menor priority y mayor score).
-- El ORDER BY externo reordena los deduplicados por priority ASC, score DESC
-- antes de aplicar el LIMIT.
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommendations(
  p_product_ids  INT[]  DEFAULT '{}',
  p_exclude_ids  INT[]  DEFAULT '{}',
  p_limit        INT    DEFAULT 3
)
RETURNS TABLE (product_id INT, score NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH cart_affinity AS (
    -- Sumar scores de afinidad para todos los productos del carrito
    SELECT
      pa.product_id_b             AS product_id,
      SUM(pa.score)               AS total_score
    FROM product_affinity pa
    WHERE pa.product_id_a = ANY(p_product_ids)
      AND pa.product_id_b <> ALL(COALESCE(p_exclude_ids, '{}'))
    GROUP BY pa.product_id_b
  ),
  with_stock AS (
    -- Filtrar por stock disponible
    SELECT ca.product_id, ca.total_score
    FROM cart_affinity ca
    JOIN products p ON p.id = ca.product_id
    WHERE p.active = TRUE
      AND (
        (p.is_combo = TRUE AND get_combo_effective_stock(p.id) > 0)
        OR
        (COALESCE(p.is_combo, FALSE) = FALSE AND (
          NOT EXISTS (SELECT 1 FROM product_stock ps WHERE ps.product_id = p.id)
          OR (SELECT ps.quantity FROM product_stock ps WHERE ps.product_id = p.id) > 0
        ))
      )
    ORDER BY ca.total_score DESC
    LIMIT p_limit
  ),
  -- Fallback: más vendidos globales (últimos 30 días) para completar si hay pocos resultados
  top_sold AS (
    SELECT
      oi.product_id,
      SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status IN ('pending', 'confirmed')
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND oi.product_id IS NOT NULL
      AND oi.product_id <> ALL(COALESCE(p_exclude_ids, '{}'))
      AND p.active = TRUE
      AND (
        (p.is_combo = TRUE AND get_combo_effective_stock(p.id) > 0)
        OR
        (COALESCE(p.is_combo, FALSE) = FALSE AND (
          NOT EXISTS (SELECT 1 FROM product_stock ps WHERE ps.product_id = p.id)
          OR (SELECT ps.quantity FROM product_stock ps WHERE ps.product_id = p.id) > 0
        ))
      )
    GROUP BY oi.product_id
    ORDER BY units DESC
    LIMIT p_limit
  ),
  combined AS (
    -- Primero los de afinidad (priority=1), luego los más vendidos para completar (priority=2)
    SELECT product_id, total_score AS score, 1 AS priority FROM with_stock
    UNION ALL
    SELECT ts.product_id, 0 AS score, 2 AS priority
    FROM top_sold ts
    WHERE ts.product_id NOT IN (SELECT product_id FROM with_stock)
  )
  -- FIX: DISTINCT ON en subquery para que el ORDER BY externo pueda ordenar
  -- por priority/score antes del LIMIT, en vez de ordenar por product_id.
  SELECT product_id, score
  FROM (
    SELECT DISTINCT ON (product_id) product_id, score, priority
    FROM combined
    ORDER BY product_id, priority ASC, score DESC
  ) deduped
  ORDER BY priority ASC, score DESC
  LIMIT p_limit;
$$;
