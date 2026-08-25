-- ============================================================================
-- Función RPC: cancel_order
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Cancela una orden y devuelve el stock de cada ítem — a los componentes
-- si el producto es combo (ver combo_components, dominio Combos #86), o al
-- producto mismo si no lo es.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22: la
-- versión vigente es la combo-aware de supabase_combos.sql (PART 1g), NO
-- la versión simple original de supabase_orders_v2.sql (PART 3) — ambas
-- definían cancel_order con la misma firma (p_order_id bigint), así que
-- combos.sql reemplazó silenciosamente a orders_v2.sql sin overload
-- (mismo nombre y firma = reemplazo limpio, a diferencia de lo que pasó
-- con create_order en #70). Cruzado contra el AC de #84: coincide.
--
-- SECURITY DEFINER: bypassea RLS. Sin p_store_id — mismo patrón que
-- confirm_order, verificación de Store en la ruta de API.
--
-- #97 (ADR-0012): con is_stock_tracked(v_order.store_id) = false, no
-- devuelve stock a ningún ítem — mismo criterio que create_order.sql.
-- items_returned del jsonb de retorno sigue contando los ítems procesados
-- igual, se use o no stock (es información sobre la orden, no sobre stock).
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order         orders%ROWTYPE;
  v_item          order_items%ROWTYPE;
  v_items_count   INTEGER := 0;
  v_is_combo      BOOLEAN;
  v_component     RECORD;
  v_stock_tracked BOOLEAN;
BEGIN
  -- Lock la orden para evitar cancelaciones concurrentes
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order % is already cancelled', p_order_id;
  END IF;

  v_stock_tracked := is_stock_tracked(v_order.store_id);

  -- Tag de auditoría: 'return'
  PERFORM set_config('app.movement_type', 'return', true);

  -- Devuelve stock por cada ítem de la orden
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_stock_tracked AND v_item.product_id IS NOT NULL THEN
      SELECT is_combo INTO v_is_combo FROM products WHERE id = v_item.product_id;

      IF v_is_combo THEN
        -- Devuelve stock a cada componente
        FOR v_component IN
          SELECT * FROM combo_components WHERE combo_product_id = v_item.product_id
        LOOP
          UPDATE product_stock
          SET quantity = quantity + (v_item.quantity * v_component.quantity)
          WHERE product_id = v_component.component_product_id;
        END LOOP;
      ELSE
        UPDATE product_stock
        SET quantity = quantity + v_item.quantity
        WHERE product_id = v_item.product_id;
      END IF;
    END IF;

    v_items_count := v_items_count + 1;
  END LOOP;

  UPDATE orders
  SET status = 'cancelled'
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id',       p_order_id,
    'status',         'cancelled',
    'items_returned', v_items_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order TO authenticated;
