-- ============================================================================
-- Función RPC: confirm_order
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Marca una orden 'pending' como 'confirmed'. El stock ya se descontó al
-- crear la orden (create_order), así que acá solo cambia el status.
--
-- Agregada al alcance de #84 (no estaba en el AC original) al notar que
-- vivía en el mismo supabase_orders_v2.sql que sí se estaba archivando —
-- dejarla afuera la hubiera dejado sin fuente única de verdad.
--
-- SECURITY DEFINER: bypassea RLS. NO tiene p_store_id — la verificación de
-- que la orden pertenece a la Store del caller se hace en la ruta de API
-- antes de invocar el RPC (mismo patrón que cancel_order, ver
-- supabase_store_scoping_orders.sql header).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — misma
-- firma y lógica que supabase_orders_v2.sql (PART 2), sin cambios
-- posteriores.
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_order(
  p_order_id      BIGINT,
  p_confirmed_by  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order % is not pending (current status: %)', p_order_id, v_order.status;
  END IF;

  -- El stock ya se descontó al crear la orden — solo actualiza el status
  UPDATE orders
  SET status       = 'confirmed',
      confirmed_at = NOW(),
      confirmed_by = p_confirmed_by
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id',      p_order_id,
    'status',        'confirmed',
    'confirmed_at',  NOW(),
    'confirmed_by',  p_confirmed_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_order TO authenticated;
