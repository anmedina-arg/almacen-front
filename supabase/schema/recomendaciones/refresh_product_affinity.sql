-- ============================================================================
-- Función: refresh_product_affinity
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Prepara
-- terreno para #21.
-- ============================================================================
-- Recalcula product_affinity desde cero: co-ocurrencias de order_items en
-- los últimos 30 días, con boost de category_affinity_rules aplicado como
-- multiplicador (no como fuente directa de sugerencias — ver la nota en
-- get_recommendations.sql). Se llama manualmente desde /admin/informes.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-24 — la
-- versión vigente es la de supabase_recommendations_fix2.sql: usa TRUNCATE
-- TABLE en vez de DELETE FROM sin WHERE, porque Supabase bloquea DELETE sin
-- WHERE incluso dentro de RPCs SECURITY DEFINER.
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

  TRUNCATE TABLE product_affinity;

  INSERT INTO product_affinity (product_id_a, product_id_b, score, calculated_at)
  SELECT product_id_a, product_id_b, score, NOW() FROM _scored
  UNION ALL
  SELECT product_id_b, product_id_a, score, NOW() FROM _scored;

END;
$$;

GRANT EXECUTE ON FUNCTION refresh_product_affinity TO authenticated;
