-- ============================================================================
-- Función trigger: adjust_stock_on_item_update
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Dispara BEFORE UPDATE OF quantity ON order_items (ver order_items.sql).
-- Solo ajusta stock para órdenes 'pending' (admin edita cantidad de un
-- ítem). Si el producto es combo, ajusta cada componente proporcionalmente;
-- si no, ajusta el producto directo.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22: la
-- versión vigente es la combo-aware de supabase_combos.sql (PART 1h), NO
-- la versión simple de supabase_orders_v2.sql (PART 4) — mismo reemplazo
-- limpio que cancel_order (misma firma, sin parámetros, ninguna función
-- trigger los tiene).
--
-- #97 (ADR-0012): con is_stock_tracked(NEW.store_id) = false, no ajusta
-- product_stock — mismo criterio que create_order.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_stock_on_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status   order_status;
  v_diff           NUMERIC(12, 3);
  v_current_stock  NUMERIC(12, 3);
  v_is_combo       BOOLEAN;
  v_component      RECORD;
  v_component_diff NUMERIC(12, 3);
BEGIN
  SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;

  IF v_order_status != 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.quantity = OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_stock_tracked(NEW.store_id) THEN
    RETURN NEW;
  END IF;

  v_diff := NEW.quantity - OLD.quantity;

  SELECT is_combo INTO v_is_combo FROM products WHERE id = NEW.product_id;

  IF v_is_combo THEN
    IF v_diff > 0 THEN
      PERFORM set_config('app.movement_type', 'sale', true);

      -- Verifica que todos los componentes tengan stock suficiente primero
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = NEW.product_id
      LOOP
        v_component_diff := v_diff * v_component.quantity;

        SELECT quantity INTO v_current_stock
        FROM product_stock
        WHERE product_id = v_component.component_product_id
        FOR UPDATE;

        IF NOT FOUND OR v_current_stock < v_component_diff THEN
          RAISE EXCEPTION 'Stock insuficiente para componente %. Disponible: %, Requerido: %',
            v_component.component_product_id, COALESCE(v_current_stock, 0), v_component_diff;
        END IF;
      END LOOP;

      -- Descuenta de todos los componentes
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = NEW.product_id
      LOOP
        UPDATE product_stock
        SET quantity = quantity - (v_diff * v_component.quantity)
        WHERE product_id = v_component.component_product_id;
      END LOOP;

    ELSE
      -- Cantidad disminuyó → devuelve a los componentes
      PERFORM set_config('app.movement_type', 'return', true);

      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = NEW.product_id
      LOOP
        UPDATE product_stock
        SET quantity = quantity + (ABS(v_diff) * v_component.quantity)
        WHERE product_id = v_component.component_product_id;
      END LOOP;
    END IF;

  ELSE
    -- Producto normal: lógica original
    IF v_diff > 0 THEN
      PERFORM set_config('app.movement_type', 'sale', true);

      SELECT quantity INTO v_current_stock
      FROM product_stock
      WHERE product_id = NEW.product_id
      FOR UPDATE;

      IF NOT FOUND OR v_current_stock < v_diff THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Requerido: %',
          COALESCE(v_current_stock, 0), v_diff;
      END IF;

      UPDATE product_stock
      SET quantity = quantity - v_diff
      WHERE product_id = NEW.product_id;

    ELSE
      PERFORM set_config('app.movement_type', 'return', true);

      UPDATE product_stock
      SET quantity = quantity + ABS(v_diff)
      WHERE product_id = NEW.product_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
