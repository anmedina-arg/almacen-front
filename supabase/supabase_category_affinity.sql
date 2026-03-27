-- ============================================================================
-- Reglas de afinidad por categoría + fix get_recommendations
-- ============================================================================
--
-- PROBLEMA QUE RESUELVE
-- ---------------------
-- category_affinity_rules originalmente solo actuaba como multiplicador de
-- co-ocurrencias en refresh_product_affinity(). Si dos categorías nunca se
-- compraron juntas en los últimos 30 días, la regla no tenía efecto.
--
-- SOLUCIÓN
-- --------
-- Se agrega un CTE `category_based` en get_recommendations() que consulta
-- category_affinity_rules DIRECTAMENTE, sin depender del historial.
-- Esto permite reglas del tipo "cerveza → siempre sugerir snacks" aunque
-- nunca se hayan comprado juntos.
--
-- PRIORIDADES en get_recommendations():
--   1. Afinidad real (co-ocurrencia histórica, score > 0)
--   2. Reglas de categoría configuradas manualmente (category_affinity_rules)
--   3. Fallback: top vendidos globales (últimos 30 días)
--
-- CÓMO AGREGAR REGLAS
-- -------------------
-- Primero identificar los IDs de categoría:
--
--   SELECT id, name FROM categories ORDER BY name;
--
-- Luego insertar la regla. Ejemplo: bebidas → snacks con boost 2.0:
--
--   INSERT INTO category_affinity_rules (from_category_id, to_category_id, boost)
--   VALUES (<ID_BEBIDAS>, <ID_SNAKS>, 2.0)
--   ON CONFLICT (from_category_id, to_category_id) DO UPDATE SET boost = EXCLUDED.boost;
--
-- El campo `boost` determina el orden entre reglas cuando hay varias.
-- No hace falta re-ejecutar refresh_product_affinity() para que surja efecto.
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
    -- Sumar scores de afinidad histórica para todos los productos del carrito
    SELECT
      pa.product_id_b             AS product_id,
      SUM(pa.score)               AS total_score
    FROM product_affinity pa
    WHERE pa.product_id_a = ANY(p_product_ids)
      AND pa.product_id_b <> ALL(COALESCE(p_exclude_ids, '{}'))
    GROUP BY pa.product_id_b
  ),
  with_stock AS (
    -- Afinidad histórica filtrada por stock
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
  category_based AS (
    -- Sugerencias por reglas de categoría (funcionan sin historial de co-ocurrencias).
    -- Toma los productos más vendidos de las categorías relacionadas.
    SELECT
      p.id                                   AS product_id,
      MAX(car.boost)                         AS cat_score
    FROM products cp
    JOIN category_affinity_rules car
      ON car.from_category_id = cp.category_id
    JOIN products p
      ON p.category_id = car.to_category_id
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity) AS total_units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status IN ('pending', 'confirmed')
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    WHERE cp.id = ANY(p_product_ids)
      AND p.active = TRUE
      AND p.id <> ALL(COALESCE(p_exclude_ids, '{}'))
      AND p.id NOT IN (SELECT product_id FROM with_stock)
      AND (
        (p.is_combo = TRUE AND get_combo_effective_stock(p.id) > 0)
        OR
        (COALESCE(p.is_combo, FALSE) = FALSE AND (
          NOT EXISTS (SELECT 1 FROM product_stock ps WHERE ps.product_id = p.id)
          OR (SELECT ps.quantity FROM product_stock ps WHERE ps.product_id = p.id) > 0
        ))
      )
    GROUP BY p.id, sales.total_units
    ORDER BY cat_score DESC, COALESCE(sales.total_units, 0) DESC
    LIMIT p_limit
  ),
  top_sold AS (
    -- Fallback: más vendidos globales (últimos 30 días)
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
    SELECT product_id, total_score AS score, 1 AS priority FROM with_stock
    UNION ALL
    SELECT product_id, cat_score   AS score, 2 AS priority FROM category_based
    WHERE product_id NOT IN (SELECT product_id FROM with_stock)
    UNION ALL
    SELECT ts.product_id, 0 AS score, 3 AS priority
    FROM top_sold ts
    WHERE ts.product_id NOT IN (SELECT product_id FROM with_stock)
      AND ts.product_id NOT IN (SELECT product_id FROM category_based)
  )
  -- DISTINCT ON en subquery para ordenar por priority/score antes del LIMIT
  SELECT product_id, score
  FROM (
    SELECT DISTINCT ON (product_id) product_id, score, priority
    FROM combined
    ORDER BY product_id, priority ASC, score DESC
  ) deduped
  ORDER BY priority ASC, score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recommendations TO anon;
GRANT EXECUTE ON FUNCTION get_recommendations TO authenticated;
