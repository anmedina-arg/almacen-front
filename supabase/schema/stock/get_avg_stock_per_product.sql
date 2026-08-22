-- ============================================================================
-- Función RPC: get_avg_stock_per_product
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Calcula el stock promedio de cada producto activo en una ventana de
-- fechas, usando snapshots diarios reconstruidos desde stock_movement_log
-- (día actual: product_stock.quantity; días anteriores: último
-- stock_movement_log.new_qty conocido hasta el cierre de ese día). Días sin
-- movimiento conocido se excluyen del promedio, no se cuentan como 0.
--
-- Usada por /admin/dashboard (rotación de stock, src/app/[store]/api/dashboard/rotation).
--
-- NO ESTÁ SCOPED POR STORE: sin p_store_id, sin filtro por store_id en
-- ninguna tabla — confirmado tanto en el código (la ruta usa
-- verifyAdminAuth, no verifyStoreAdminAuth) como en la definición viva.
-- Gap real y conocido, no introducido ni corregido por #83 — el scoping del
-- dashboard/informes es un ticket aparte, no #17 ni #83.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 —
-- coincide byte a byte con test. Sin cambios desde
-- supabase_rotation_avg_stock.sql (creación original).
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

  CREATE TEMP TABLE IF NOT EXISTS _snapshots (
    product_id INTEGER,
    day_date   DATE,
    qty        NUMERIC
  ) ON COMMIT DROP;

  TRUNCATE _snapshots;

  v_day := p_start_date;

  WHILE v_day <= p_end_date LOOP

    IF v_day = CURRENT_DATE THEN
      INSERT INTO _snapshots (product_id, day_date, qty)
      SELECT
        ps.product_id,
        v_day,
        ps.quantity
      FROM product_stock ps
      JOIN products p ON p.id = ps.product_id
      WHERE p.active = true;

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
