-- ============================================================================
-- Función RPC: get_stock_value_per_day
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Calcula el valor del stock al costo por categoría, día a día, en una
-- ventana de fechas. Misma lógica de snapshot que get_avg_stock_per_product
-- (día actual: product_stock.quantity; días anteriores: último
-- stock_movement_log.new_qty conocido). Fórmula de valorización según
-- sale_type: kg → (qty/1000)*cost, 100gr → (qty/100)*cost, unit → qty*cost.
-- Solo incluye productos con cost > 0 y snapshots con valor > 0.
--
-- Usada por /admin/dashboard (src/app/[store]/api/dashboard/stock-value-history).
--
-- NO ESTÁ SCOPED POR STORE — mismo gap que get_avg_stock_per_product (ruta
-- usa verifyAdminAuth, no verifyStoreAdminAuth). No introducido ni
-- corregido por #83.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Sin cambios desde
-- supabase_stock_value_per_day.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_stock_value_per_day(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (
  day_date       DATE,
  category_name  TEXT,
  total_value    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _sv_snapshots (
    product_id INTEGER,
    day_date   DATE,
    qty        NUMERIC
  ) ON COMMIT DROP;

  TRUNCATE _sv_snapshots;

  v_day := p_start_date;

  WHILE v_day <= p_end_date LOOP

    IF v_day = CURRENT_DATE THEN
      INSERT INTO _sv_snapshots (product_id, day_date, qty)
      SELECT ps.product_id, v_day, ps.quantity
      FROM product_stock ps
      JOIN products p ON p.id = ps.product_id
      WHERE p.active = true AND p.cost > 0;

    ELSE
      INSERT INTO _sv_snapshots (product_id, day_date, qty)
      SELECT DISTINCT ON (sml.product_id)
        sml.product_id, v_day, sml.new_qty
      FROM stock_movement_log sml
      JOIN products p ON p.id = sml.product_id
      WHERE p.active = true
        AND p.cost > 0
        AND sml.created_at < (v_day + INTERVAL '1 day')
      ORDER BY sml.product_id, sml.created_at DESC;
    END IF;

    v_day := v_day + INTERVAL '1 day';
  END LOOP;

  RETURN QUERY
  SELECT
    s.day_date,
    COALESCE(c.name, 'Sin categoría')::TEXT AS category_name,
    ROUND(SUM(
      CASE p.sale_type
        WHEN 'kg'    THEN (s.qty / 1000) * p.cost
        WHEN '100gr' THEN (s.qty / 100)  * p.cost
        ELSE              s.qty           * p.cost
      END
    ))::NUMERIC AS total_value
  FROM _sv_snapshots s
  JOIN products p ON p.id = s.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  GROUP BY s.day_date, COALESCE(c.name, 'Sin categoría')
  HAVING SUM(
    CASE p.sale_type
      WHEN 'kg'    THEN (s.qty / 1000) * p.cost
      WHEN '100gr' THEN (s.qty / 100)  * p.cost
      ELSE              s.qty           * p.cost
    END
  ) > 0
  ORDER BY s.day_date, category_name;

END;
$$;

COMMENT ON FUNCTION public.get_stock_value_per_day IS
  'Valor del stock al costo por categoría y por día. '
  'Usa product_stock para hoy y stock_movement_log para días anteriores. '
  'Misma lógica de snapshot que get_avg_stock_per_product.';
