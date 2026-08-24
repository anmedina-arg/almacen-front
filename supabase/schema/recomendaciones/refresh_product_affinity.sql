-- ============================================================================
-- Función: refresh_product_affinity
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Scoping por
-- Store: #21.
-- ============================================================================
-- Recalcula product_affinity desde cero: co-ocurrencias de order_items en
-- los últimos 30 días, con boost de category_affinity_rules aplicado como
-- multiplicador (no como fuente directa de sugerencias — ver la nota en
-- get_recommendations.sql). Se llama manualmente desde /admin/informes.
--
-- Scoped por Store desde #21 — p_store_id requerido. Autorización vía
-- is_store_admin(p_store_id). Co-ocurrencias filtradas por o.store_id =
-- p_store_id. category_affinity_rules se lee con puente permisivo
-- (r.store_id = p_store_id OR r.store_id IS NULL — ADR-0008): hoy no hay
-- UI para crear reglas por Store, así que las reglas existentes (todas con
-- store_id NULL) siguen aplicando a todas las Stores hasta que se creen
-- reglas propias.
--
-- TRUNCATE TABLE (que vaciaba toda la tabla, de todas las Stores) pasa a
-- DELETE FROM ... WHERE store_id = p_store_id OR store_id IS NULL — borra
-- las filas propias de esta Store más cualquier fila legacy sin store_id
-- (dato mezclado de antes de #21, nunca fue correcto para ninguna Store).
-- Sigue teniendo WHERE, así que no pisa el bloqueo de Supabase a DELETE sin
-- WHERE (ver supabase_recommendations_fix2.sql, motivo original del
-- TRUNCATE).
--
-- GAP CONOCIDO, no corregido acá: get_recommendations() (dominio público,
-- fuera de alcance de #21 — ver README) todavía lee product_affinity sin
-- filtrar por store_id. Hasta que un ticket futuro la scope, las
-- recomendaciones del catálogo público pueden mezclar el afinity score de
-- distintas Stores. Este ticket solo scopea el recálculo (quién puede
-- dispararlo y con qué datos se calcula), no la lectura pública.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_product_affinity(p_store_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max NUMERIC;
BEGIN
  IF NOT public.is_store_admin(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: Store admin access required';
  END IF;

  -- Calcular co-ocurrencias de los últimos 30 días, solo de esta Store
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
    AND o.store_id = p_store_id
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
    ON ((r.from_category_id = pa.category_id AND r.to_category_id = pb.category_id)
        OR (r.from_category_id = pb.category_id AND r.to_category_id = pa.category_id))
    AND (r.store_id = p_store_id OR r.store_id IS NULL)
  GROUP BY c.product_id_a, c.product_id_b, c.co_count;

  DELETE FROM product_affinity WHERE store_id = p_store_id OR store_id IS NULL;

  INSERT INTO product_affinity (product_id_a, product_id_b, score, calculated_at, store_id)
  SELECT product_id_a, product_id_b, score, NOW(), p_store_id FROM _scored
  UNION ALL
  SELECT product_id_b, product_id_a, score, NOW(), p_store_id FROM _scored;

END;
$$;

GRANT EXECUTE ON FUNCTION refresh_product_affinity TO authenticated;
