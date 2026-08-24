-- ============================================================================
-- Fix: refresh_product_affinity — DELETE sin WHERE bloqueado por Supabase
-- ============================================================================
--
-- PROBLEMA
-- --------
-- Supabase bloquea DELETE sin WHERE clause incluso dentro de funciones RPC
-- con SECURITY DEFINER, devolviendo: "DELETE requires a WHERE clause".
--
-- FIX
-- ---
-- Reemplazar DELETE FROM product_affinity por TRUNCATE TABLE product_affinity.
-- TRUNCATE no requiere WHERE clause, es más rápido (no escanea filas) y
-- no está sujeto a la restricción de Supabase.
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_product_affinity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max NUMERIC;
BEGIN
  -- Calcular co-ocurrencias de los últimos 30 días
  CREATE TEMP TABLE _cooccurrence ON COMMIT DROP AS
  SELECT
    LEAST(oi1.product_id, oi2.product_id)    AS product_id_a,
    GREATEST(oi1.product_id, oi2.product_id) AS product_id_b,
    COUNT(*)::NUMERIC                         AS co_count
  FROM order_items oi1
  JOIN order_items oi2
    ON  oi1.order_id   = oi2.order_id
    AND oi1.product_id < oi2.product_id
  JOIN orders o ON o.id = oi1.order_id
  WHERE o.status IN ('pending', 'confirmed')
    AND o.created_at >= NOW() - INTERVAL '30 days'
    AND oi1.product_id IS NOT NULL
    AND oi2.product_id IS NOT NULL
  GROUP BY
    LEAST(oi1.product_id, oi2.product_id),
    GREATEST(oi1.product_id, oi2.product_id);

  SELECT COALESCE(MAX(co_count), 1) INTO v_max FROM _cooccurrence;

  -- Aplicar boosts de category_affinity_rules y normalizar
  CREATE TEMP TABLE _scored ON COMMIT DROP AS
  SELECT
    c.product_id_a,
    c.product_id_b,
    ROUND(
      c.co_count
      * COALESCE(MAX(r.boost), 1.0)
      / v_max
    , 4) AS score
  FROM _cooccurrence c
  JOIN products pa ON pa.id = c.product_id_a
  JOIN products pb ON pb.id = c.product_id_b
  LEFT JOIN category_affinity_rules r
    ON (r.from_category_id = pa.category_id AND r.to_category_id = pb.category_id)
    OR (r.from_category_id = pb.category_id AND r.to_category_id = pa.category_id)
  GROUP BY c.product_id_a, c.product_id_b, c.co_count;

  -- FIX: TRUNCATE en lugar de DELETE sin WHERE
  TRUNCATE TABLE product_affinity;

  INSERT INTO product_affinity (product_id_a, product_id_b, score, calculated_at)
  SELECT product_id_a, product_id_b, score, NOW() FROM _scored
  UNION ALL
  SELECT product_id_b, product_id_a, score, NOW() FROM _scored;

END;
$$;

GRANT EXECUTE ON FUNCTION refresh_product_affinity TO authenticated;
