-- ============================================================================
-- Función: get_recommendations
-- Dominio: Recomendaciones/Informes (#90, spec #81, mapa #74). Prepara
-- terreno para #21.
-- ============================================================================
-- Sugerencias de productos para el carrito: afinidad histórica
-- (product_affinity) primero, completando con los más vendidos globales de
-- los últimos 30 días si hacen falta. Filtra por stock disponible (incluido
-- el virtual de combos).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-24 — la
-- versión vigente es la de supabase_recommendations_fix.sql (reordena el
-- DISTINCT ON en un subquery para que el LIMIT final corte por
-- priority/score en vez de por product_id — ver ese archivo para el
-- detalle del bug original).
--
-- IMPORTANTE: supabase_category_affinity.sql propone una versión posterior
-- (agrega un CTE category_based que usa category_affinity_rules
-- DIRECTAMENTE para sugerir sin depender de co-ocurrencia histórica) — se
-- verificó contra producción Y test que esa versión NUNCA se aplicó en
-- ningún entorno, a pesar de ser el archivo más nuevo por fecha. La
-- definición de abajo es la realmente vigente. category_affinity_rules
-- solo participa hoy como multiplicador dentro de
-- refresh_product_affinity() (ver ese archivo), no acá.
--
-- #103 (incidente en producción): sin p_store_id, esta función mezclaba
-- afinidad, stock y "más vendidos" de TODAS las Stores — sugería productos
-- de otras tiendas en el checkout, agregables al pedido sin rechazo (nada
-- validaba ownership del lado de escritura tampoco, ver
-- validate_order_item_store.sql). p_store_id con DEFAULT NULL a propósito
-- (no lo omite, falla cerrado): un caller que se olvide de pasarlo no
-- obtiene todas las Stores, obtiene 0 filas (todo NULL = NULL en SQL) —
-- elegido así, y no sin default como una RPC admin (ver
-- upsert_product_stock.sql), porque esta es una lectura pública best-effort
-- (sugerencias del catálogo): degradar a "sin sugerencias" es preferible a
-- que un parámetro faltante rompa el checkout entero con un error duro.
--
-- Agregar p_store_id al final NO alcanza con CREATE OR REPLACE: Postgres lo
-- trató como una firma nueva, dejó la de 3 parámetros viva como overload
-- (mismo patrón que #70/#49 con create_order) — PostgREST no podía elegir
-- cuál usar. Hizo falta un DROP FUNCTION operativo de la firma vieja
-- (get_recommendations(int[], int[], int)) antes de aplicar esto — no es un
-- statement de este archivo. Corrido en test; producción todavía pendiente
-- al momento de este commit (ver #103).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recommendations(
  p_product_ids  INT[]  DEFAULT '{}',
  p_exclude_ids  INT[]  DEFAULT '{}',
  p_limit        INT    DEFAULT 3,
  p_store_id     INT    DEFAULT NULL
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
      AND pa.store_id = p_store_id
    GROUP BY pa.product_id_b
  ),
  with_stock AS (
    -- Filtrar por stock disponible
    SELECT ca.product_id, ca.total_score
    FROM cart_affinity ca
    JOIN products p ON p.id = ca.product_id
    WHERE p.active = TRUE
      AND p.store_id = p_store_id
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
  -- Fallback: más vendidos de esta Store (últimos 30 días) para completar si hay pocos resultados
  top_sold AS (
    SELECT
      oi.product_id,
      SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status IN ('pending', 'confirmed')
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND o.store_id = p_store_id
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
  -- DISTINCT ON en subquery para que el ORDER BY externo pueda ordenar por
  -- priority/score antes del LIMIT, en vez de ordenar por product_id.
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
