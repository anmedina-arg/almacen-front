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
-- SECURITY DEFINER: bypassea RLS. NO tiene p_store_id — la función exige
-- admin de la Store de la orden (ver el fix de seguridad 2026-10-20 abajo)
-- y la ruta de API además verifica que la orden sea de la Store de la URL
-- antes de invocar el RPC (mismo patrón que cancel_order).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — misma
-- firma y lógica que supabase_orders_v2.sql (PART 2), sin cambios
-- posteriores.
--
-- Fix de seguridad 2026-10-20: valida al caller ADENTRO de la función —
-- antes solo lo validaba la ruta de API, y como la función es SECURITY
-- DEFINER y tenía EXECUTE para anon (default de Supabase sobre public),
-- cualquiera con la anon key podía llamarla por /rest/v1/rpc salteando la
-- ruta. Ahora exige is_store_admin(<store de la orden>) — mismo chequeo
-- que las RPCs de Stock/Reporting — salvo service_role (solo server-side,
-- ya bypassea RLS por rol: no gana nada que no pudiera hacer directo; lo
-- usan los integration tests). Además se revoca EXECUTE a anon/PUBLIC y se
-- fija search_path (hardening de SECURITY DEFINER, mismo criterio que
-- log_price_change.sql).
--
-- #155: confirmed_by es el campo de auditoría de "quién confirmó", y antes se
-- guardaba el UUID que mandaba quien llamaba: un admin de la Store podía
-- dejar el pedido registrado como confirmado por otra persona llamando
-- /rest/v1/rpc directo. Ahora, para quien no es service_role, es siempre
-- auth.uid(): p_confirmed_by NULL o igual a su usuario se resuelve a su
-- usuario, y cualquier otro UUID es Forbidden (el pedido no se confirma).
-- service_role sigue pudiendo mandarlo explícito (integration tests y
-- scripts server-side). La ruta PUT /api/orders/[id]/confirm ya manda el
-- usuario de la sesión, así que el admin no cambia. Decisión de Andrés,
-- 2026-11-06: rechazar y no ignorar en silencio.
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_order(
  p_order_id      BIGINT,
  p_confirmed_by  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order        orders%ROWTYPE;
  v_confirmed_by UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NOT public.is_store_admin(v_order.store_id) THEN
      RAISE EXCEPTION 'Forbidden: Store admin access required';
    END IF;

    IF p_confirmed_by IS NOT NULL AND p_confirmed_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden: confirmed_by must be the calling user';
    END IF;

    v_confirmed_by := auth.uid();
  ELSE
    v_confirmed_by := p_confirmed_by;
  END IF;

  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order % is not pending (current status: %)', p_order_id, v_order.status;
  END IF;

  -- El stock ya se descontó al crear la orden — solo actualiza el status
  UPDATE orders
  SET status       = 'confirmed',
      confirmed_at = NOW(),
      confirmed_by = v_confirmed_by
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id',      p_order_id,
    'status',        'confirmed',
    'confirmed_at',  NOW(),
    'confirmed_by',  v_confirmed_by
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION confirm_order TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
