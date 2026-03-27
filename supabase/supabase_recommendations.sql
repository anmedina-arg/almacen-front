-- ============================================================================
-- Sistema de Recomendaciones de Productos
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ── 1. Tabla product_affinity ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_affinity (
  product_id_a  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id_b  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score         NUMERIC(8, 4) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id_a, product_id_b)
);

CREATE INDEX IF NOT EXISTS idx_affinity_a ON product_affinity(product_id_a);
CREATE INDEX IF NOT EXISTS idx_affinity_b ON product_affinity(product_id_b);

ALTER TABLE product_affinity ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la API de recomendaciones es pública)
CREATE POLICY "Public can read product_affinity"
  ON product_affinity FOR SELECT USING (true);

-- ── 2. Tabla category_affinity_rules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_affinity_rules (
  id                 SERIAL PRIMARY KEY,
  from_category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  to_category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  boost              NUMERIC(5, 2) NOT NULL DEFAULT 1.5,
  CONSTRAINT category_affinity_rules_unique UNIQUE (from_category_id, to_category_id)
);

ALTER TABLE category_affinity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage category_affinity_rules"
  ON category_affinity_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ── 3. Columna from_suggestion en order_items ────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS from_suggestion BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. Función refresh_product_affinity ──────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_product_affinity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max NUMERIC;
BEGIN
  -- Calcular co-ocurrencias de los últimos 30 días
  -- (productos que aparecieron juntos en la misma orden)
  CREATE TEMP TABLE _cooccurrence ON COMMIT DROP AS
  SELECT
    LEAST(oi1.product_id, oi2.product_id)    AS product_id_a,
    GREATEST(oi1.product_id, oi2.product_id) AS product_id_b,
    COUNT(*)::NUMERIC                         AS co_count
  FROM order_items oi1
  JOIN order_items oi2
    ON  oi1.order_id   = oi2.order_id
    AND oi1.product_id < oi2.product_id   -- evita duplicados y auto-pares
  JOIN orders o ON o.id = oi1.order_id
  WHERE o.status IN ('pending', 'confirmed')
    AND o.created_at >= NOW() - INTERVAL '30 days'
    AND oi1.product_id IS NOT NULL
    AND oi2.product_id IS NOT NULL
  GROUP BY
    LEAST(oi1.product_id, oi2.product_id),
    GREATEST(oi1.product_id, oi2.product_id);

  -- Máximo para normalizar
  SELECT COALESCE(MAX(co_count), 1) INTO v_max FROM _cooccurrence;

  -- Aplicar boosts de category_affinity_rules y normalizar
  CREATE TEMP TABLE _scored ON COMMIT DROP AS
  SELECT
    c.product_id_a,
    c.product_id_b,
    ROUND(
      c.co_count
      * COALESCE(MAX(r.boost), 1.0)   -- boost si existe regla entre categorías
      / v_max
    , 4) AS score
  FROM _cooccurrence c
  JOIN products pa ON pa.id = c.product_id_a
  JOIN products pb ON pb.id = c.product_id_b
  LEFT JOIN category_affinity_rules r
    ON (r.from_category_id = pa.category_id AND r.to_category_id = pb.category_id)
    OR (r.from_category_id = pb.category_id AND r.to_category_id = pa.category_id)
  GROUP BY c.product_id_a, c.product_id_b, c.co_count;

  -- Reemplazar tabla de afinidad (ambas direcciones)
  DELETE FROM product_affinity;

  INSERT INTO product_affinity (product_id_a, product_id_b, score, calculated_at)
  SELECT product_id_a, product_id_b, score, NOW() FROM _scored
  UNION ALL
  SELECT product_id_b, product_id_a, score, NOW() FROM _scored;

END;
$$;

-- ── 5. Función get_recommendations ───────────────────────────────────────
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
        -- Combo: stock virtual > 0
        (p.is_combo = TRUE AND get_combo_effective_stock(p.id) > 0)
        OR
        -- Producto normal: stock > 0 o sin registro (sin control de stock)
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
    -- Primero los de afinidad, luego los más vendidos para completar
    SELECT product_id, total_score AS score, 1 AS priority FROM with_stock
    UNION ALL
    SELECT ts.product_id, 0 AS score, 2 AS priority
    FROM top_sold ts
    WHERE ts.product_id NOT IN (SELECT product_id FROM with_stock)
  )
  SELECT DISTINCT ON (product_id) product_id, score
  FROM combined
  ORDER BY product_id, priority ASC, score DESC
  LIMIT p_limit;
$$;

-- ── 6. Actualizar create_order para aceptar from_suggestion ──────────────
-- Solo se necesita que el INSERT en order_items incluya el campo.
-- El RPC ya existe; agregamos from_suggestion al INSERT.
-- NOTA: Ejecutar DESPUÉS de que la columna order_items.from_suggestion exista.

CREATE OR REPLACE FUNCTION create_order(
  p_user_id          UUID    DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL,
  p_whatsapp_message TEXT    DEFAULT NULL,
  p_items            JSONB   DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id         BIGINT;
  v_item             JSONB;
  v_total            NUMERIC(12, 2) := 0;
  v_current_stock    NUMERIC(12, 3);
  v_needed           NUMERIC(12, 3);
  v_product_id       INTEGER;
  v_is_combo         BOOLEAN;
  v_component        RECORD;
  v_component_needed NUMERIC(12, 3);
  v_failed_products  JSONB    := '[]'::JSONB;
  v_has_insufficient BOOLEAN  := FALSE;
BEGIN
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  PERFORM set_config('app.movement_type', 'sale', true);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_needed     := (v_item->>'quantity')::NUMERIC;

    SELECT is_combo INTO v_is_combo FROM products WHERE id = v_product_id;

    IF v_is_combo THEN
      -- Para combos: verificar y descontar stock de componentes
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = v_product_id
      LOOP
        v_component_needed := v_needed * v_component.quantity;
        SELECT quantity INTO v_current_stock
        FROM product_stock WHERE product_id = v_component.component_product_id FOR UPDATE;

        IF NOT FOUND OR v_current_stock < v_component_needed THEN
          v_has_insufficient := TRUE;
          v_failed_products  := v_failed_products || jsonb_build_object(
            'id',        v_product_id,
            'name',      v_item->>'product_name',
            'requested', v_needed,
            'available', COALESCE(FLOOR(v_current_stock / NULLIF(v_component.quantity, 0)), 0)
          );
          EXIT;
        END IF;

        UPDATE product_stock
        SET quantity = quantity - v_component_needed
        WHERE product_id = v_component.component_product_id;
      END LOOP;

      IF v_has_insufficient THEN CONTINUE; END IF;
    ELSE
      -- Producto normal
      SELECT quantity INTO v_current_stock
      FROM product_stock WHERE product_id = v_product_id FOR UPDATE;

      IF NOT FOUND OR v_current_stock < v_needed THEN
        v_has_insufficient := TRUE;
        v_failed_products  := v_failed_products || jsonb_build_object(
          'id',        v_product_id,
          'name',      v_item->>'product_name',
          'requested', v_needed,
          'available', COALESCE(v_current_stock, 0)
        );
        CONTINUE;
      END IF;

      UPDATE product_stock
      SET quantity = quantity - v_needed
      WHERE product_id = v_product_id;
    END IF;

    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      unit_price, unit_cost, is_by_weight, from_suggestion
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_item->>'product_name',
      v_needed,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'unit_cost')::NUMERIC, 0),
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE),
      COALESCE((v_item->>'from_suggestion')::BOOLEAN, FALSE)
    );

    v_total := v_total + v_needed * (v_item->>'unit_price')::NUMERIC;
  END LOOP;

  IF v_has_insufficient THEN
    RAISE EXCEPTION '%', jsonb_build_object(
      'error',    'insufficient_stock',
      'products', v_failed_products
    )::TEXT;
  END IF;

  UPDATE orders SET total = v_total WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id',    v_order_id,
    'total',       v_total,
    'status',      'pending',
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_product_affinity TO authenticated;
GRANT EXECUTE ON FUNCTION get_recommendations TO anon;
GRANT EXECUTE ON FUNCTION get_recommendations TO authenticated;
