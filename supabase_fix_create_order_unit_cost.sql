-- ============================================================================
-- FIX: create_order() RPC — agregar unit_cost al INSERT de order_items
-- ============================================================================
--
-- PROBLEMA
-- --------
-- El RPC create_order() fue actualizado para incorporar lógica de combos
-- (control de stock por componentes) pero ese update NO incluyó el campo
-- unit_cost en el INSERT de order_items. Como resultado, todos los pedidos
-- creados desde la app (vía WhatsApp) guardaban unit_cost = 0.00 aunque el
-- servidor Next.js calculara y enviara el valor correcto en p_items.
--
-- El servidor calcula:
--   unit_cost = item.unit_price × (product.cost / product.price)
-- y lo pasa al RPC dentro del JSON p_items, pero el RPC lo ignoraba.
--
-- IMPACTO
-- -------
-- - order_items.unit_cost = 0 para todos los pedidos vía WhatsApp
-- - total_cost = 0 en la vista de Pedidos y Ventas
-- - Margen = 100% (falso) en todos los pedidos
--
-- CAMBIO
-- ------
-- Una sola línea modificada en el INSERT de order_items:
--   ANTES: INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, is_by_weight)
--   AHORA: INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, is_by_weight)
--          ...COALESCE((v_item->>'unit_cost')::NUMERIC, 0)...
--
-- Todo el resto del cuerpo (lógica de combos, stock, rollback) es idéntico
-- a la versión en producción.
--
-- CUÁNDO EJECUTAR
-- ---------------
-- Una única vez en el SQL Editor de Supabase.
-- Es seguro relanzar: CREATE OR REPLACE no destruye permisos existentes.
--
-- DESPUÉS DE EJECUTAR
-- -------------------
-- Correr supabase_backfill_unit_cost.sql para corregir pedidos históricos.
-- ============================================================================

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
  v_failed_products  JSONB    := '[]'::JSONB;
  v_has_insufficient BOOLEAN  := FALSE;
  v_is_combo         BOOLEAN;
  v_component        RECORD;
  v_component_needed NUMERIC(12, 3);
  v_item_failed      BOOLEAN;
BEGIN
  -- Crear el registro de la orden en estado 'pending'
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  -- Etiquetar los movimientos de stock como 'sale' en el audit log
  PERFORM set_config('app.movement_type', 'sale', true);

  -- Procesar cada ítem: verificar stock y descontar
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'product_id')::INTEGER;
    v_needed      := (v_item->>'quantity')::NUMERIC;
    v_item_failed := FALSE;

    SELECT is_combo INTO v_is_combo FROM products WHERE id = v_product_id;

    IF v_is_combo THEN
      -- Combo: verificar y descontar stock de cada componente
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = v_product_id
      LOOP
        v_component_needed := v_needed * v_component.quantity;

        SELECT quantity INTO v_current_stock
        FROM product_stock
        WHERE product_id = v_component.component_product_id
        FOR UPDATE;

        IF NOT FOUND OR v_current_stock < v_component_needed THEN
          v_has_insufficient := TRUE;
          v_item_failed      := TRUE;
          v_failed_products  := v_failed_products || jsonb_build_object(
            'id',        v_product_id,
            'name',      v_item->>'product_name',
            'requested', v_needed,
            'available', COALESCE(FLOOR(v_current_stock / NULLIF(v_component.quantity, 0)), 0)
          );
          EXIT; -- no deducción parcial de componentes
        END IF;

        UPDATE product_stock
        SET quantity = quantity - v_component_needed
        WHERE product_id = v_component.component_product_id;
      END LOOP;

      IF v_item_failed THEN
        CONTINUE;
      END IF;

    ELSE
      -- Producto regular: verificar y descontar stock directo
      SELECT quantity INTO v_current_stock
      FROM product_stock
      WHERE product_id = v_product_id
      FOR UPDATE;

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

    v_total := v_total + (v_needed * (v_item->>'unit_price')::NUMERIC);

    -- FIX: se agrega unit_cost al INSERT (columna y valor)
    -- Antes solo tenía: order_id, product_id, product_name, quantity, unit_price, is_by_weight
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity, unit_price, unit_cost, is_by_weight
    ) VALUES (
      v_order_id,
      v_product_id,
      v_item->>'product_name',
      v_needed,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'unit_cost')::NUMERIC, 0),   -- ← única línea agregada
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE)
    );
  END LOOP;

  -- Si algún producto no tenía stock suficiente: rollback total
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
