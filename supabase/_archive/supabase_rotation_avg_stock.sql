-- ============================================================================
-- RPC Function: get_avg_stock_per_product
-- Proyecto: Market Cevil (almacen-front)
-- ============================================================================
-- Calcula el stock promedio de cada producto activo en una ventana de fechas,
-- usando snapshots diarios reconstruidos desde stock_movement_log.
--
-- Para cada día D en [p_start_date, p_end_date]:
--   - Si D = hoy → usa product_stock.quantity como fuente de verdad
--   - Si D < hoy → usa el new_qty del último movimiento en stock_movement_log
--                  con created_at <= D para ese producto
--
-- Días sin ningún movimiento conocido para un producto → se excluyen del promedio
-- (no se cuentan como 0).
--
-- EJECUTAR EN: Supabase SQL Editor
-- PREREQUISITOS: product_stock, stock_movement_log, products, categories
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_avg_stock_per_product(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (
  product_id  INTEGER,
  avg_stock   NUMERIC
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

  -- Tabla temporal para acumular snapshots diarios por producto.
  -- ON COMMIT DROP garantiza limpieza al finalizar la transacción.
  -- TRUNCATE al inicio protege contra reuso en sesiones de larga duración.
  CREATE TEMP TABLE IF NOT EXISTS _snapshots (
    product_id INTEGER,
    day_date   DATE,
    qty        NUMERIC
  ) ON COMMIT DROP;

  TRUNCATE _snapshots;

  v_day := p_start_date;

  WHILE v_day <= p_end_date LOOP

    -- Hoy: product_stock es la fuente de verdad del stock vigente
    IF v_day = CURRENT_DATE THEN
      INSERT INTO _snapshots (product_id, day_date, qty)
      SELECT
        ps.product_id,
        v_day,
        ps.quantity
      FROM product_stock ps
      JOIN products p ON p.id = ps.product_id
      WHERE p.active = true;

    -- Días anteriores: último movimiento conocido hasta el cierre de ese día
    ELSE
      INSERT INTO _snapshots (product_id, day_date, qty)
      SELECT DISTINCT ON (sml.product_id)
        sml.product_id,
        v_day,
        sml.new_qty
      FROM stock_movement_log sml
      JOIN products p ON p.id = sml.product_id
      WHERE p.active = true
        AND sml.created_at < (v_day + INTERVAL '1 day')
      ORDER BY sml.product_id, sml.created_at DESC;
    END IF;

    v_day := v_day + INTERVAL '1 day';
  END LOOP;

  -- Promedio aritmético de los días con valor conocido (excluye días sin datos)
  RETURN QUERY
  SELECT
    s.product_id,
    AVG(s.qty)::NUMERIC AS avg_stock
  FROM _snapshots s
  GROUP BY s.product_id;

END;
$$;

COMMENT ON FUNCTION public.get_avg_stock_per_product IS
  'Promedio de stock diario por producto en una ventana de fechas. '
  'Usa product_stock para el día actual y stock_movement_log para días anteriores.';

-- Verificar que se creó correctamente
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_avg_stock_per_product';
