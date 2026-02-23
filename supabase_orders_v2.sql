-- ============================================================================
-- Orders V2: Stock integration
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER supabase_sale_type.sql is applied.
--
-- Changes:
--   1. create_order()  → deducts stock atomically (SELECT FOR UPDATE)
--   2. confirm_order() → simplified: only updates status (stock already deducted)
--   3. cancel_order()  → NEW: returns stock + sets status to 'cancelled'
--   4. Trigger on order_items UPDATE → adjusts stock by difference (pending orders)
--   5. Trigger on order_items DELETE → returns stock (pending orders)
-- ============================================================================


-- ============================================================================
-- PART 1: MODIFY create_order() — Deduct stock atomically
-- ============================================================================
-- Stock is deducted when the ORDER IS CREATED, not when confirmed.
-- Uses SELECT FOR UPDATE to prevent concurrent over-selling.
-- On insufficient stock: rolls back everything and returns structured error.
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
BEGIN
  -- Create the order record
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  -- Tag stock changes as 'sale' in the audit log
  PERFORM set_config('app.movement_type', 'sale', true);

  -- Process each item: check and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::INTEGER;
    v_needed     := (v_item->>'quantity')::NUMERIC;

    -- Lock this product's stock row to prevent concurrent deductions
    SELECT quantity INTO v_current_stock
    FROM product_stock
    WHERE product_id = v_product_id
    FOR UPDATE;

    IF NOT FOUND OR v_current_stock < v_needed THEN
      -- Collect the failure and keep checking remaining items (full error report)
      v_has_insufficient := TRUE;
      v_failed_products  := v_failed_products || jsonb_build_object(
        'id',        v_product_id,
        'name',      v_item->>'product_name',
        'requested', v_needed,
        'available', COALESCE(v_current_stock, 0)
      );
      CONTINUE;
    END IF;

    -- Deduct stock
    UPDATE product_stock
    SET quantity = quantity - v_needed
    WHERE product_id = v_product_id;

    -- Insert order item
    v_total := v_total + (v_needed * (v_item->>'unit_price')::NUMERIC);

    INSERT INTO order_items (
      order_id, product_id, product_name, quantity, unit_price, is_by_weight
    ) VALUES (
      v_order_id,
      v_product_id,
      v_item->>'product_name',
      v_needed,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE)
    );
  END LOOP;

  -- If ANY product had insufficient stock: raise exception → full rollback
  IF v_has_insufficient THEN
    RAISE EXCEPTION '%', jsonb_build_object(
      'error',    'insufficient_stock',
      'products', v_failed_products
    )::TEXT;
  END IF;

  -- Commit the order total (trigger also recalculates, but set it explicitly)
  UPDATE orders SET total = v_total WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id',    v_order_id,
    'total',       v_total,
    'status',      'pending',
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;


-- ============================================================================
-- PART 2: SIMPLIFY confirm_order() — Stock already deducted at creation
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

  -- Stock was already deducted when the order was created — only update status
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


-- ============================================================================
-- PART 3: ADD cancel_order() — Return stock and set status to 'cancelled'
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order        orders%ROWTYPE;
  v_item         order_items%ROWTYPE;
  v_items_count  INTEGER := 0;
BEGIN
  -- Lock the order to prevent concurrent cancellations
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order % is already cancelled', p_order_id;
  END IF;

  -- Tag stock returns as 'return' in the audit log
  PERFORM set_config('app.movement_type', 'return', true);

  -- Return stock for every item in the order
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE product_stock
      SET quantity = quantity + v_item.quantity
      WHERE product_id = v_item.product_id;
    END IF;

    v_items_count := v_items_count + 1;
  END LOOP;

  -- Update order status
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

-- Grant execute to authenticated users (admin check is in the API route)
GRANT EXECUTE ON FUNCTION cancel_order TO authenticated;


-- ============================================================================
-- PART 4: TRIGGER on order_items UPDATE — Adjust stock by quantity difference
-- ============================================================================
-- Fires BEFORE an item's quantity is changed (admin edit, pending orders only).
-- Increase → deduct more stock (check availability).
-- Decrease → return the difference to stock.
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_stock_on_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status  order_status;
  v_diff          NUMERIC(12, 3);
  v_current_stock NUMERIC(12, 3);
BEGIN
  -- Only adjust stock for pending orders
  SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;

  IF v_order_status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Nothing to do if quantity didn't change
  IF NEW.quantity = OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_diff := NEW.quantity - OLD.quantity;

  IF v_diff > 0 THEN
    -- Quantity increased → deduct more stock
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
    -- Quantity decreased → return the difference
    PERFORM set_config('app.movement_type', 'return', true);

    UPDATE product_stock
    SET quantity = quantity + ABS(v_diff)
    WHERE product_id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_stock_on_item_update ON order_items;
CREATE TRIGGER trg_adjust_stock_on_item_update
  BEFORE UPDATE OF quantity ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_item_update();


-- ============================================================================
-- PART 5: TRIGGER on order_items DELETE — Return stock on item removal
-- ============================================================================
-- Fires BEFORE an item is deleted (admin removes item, pending orders only).
-- ============================================================================

CREATE OR REPLACE FUNCTION return_stock_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
BEGIN
  -- Only return stock for pending orders
  SELECT status INTO v_order_status FROM orders WHERE id = OLD.order_id;

  IF v_order_status != 'pending' THEN
    RETURN OLD;
  END IF;

  IF OLD.product_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM set_config('app.movement_type', 'return', true);

  UPDATE product_stock
  SET quantity = quantity + OLD.quantity
  WHERE product_id = OLD.product_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_return_stock_on_item_delete ON order_items;
CREATE TRIGGER trg_return_stock_on_item_delete
  BEFORE DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION return_stock_on_item_delete();


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all new functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('create_order', 'confirm_order', 'cancel_order',
                       'adjust_stock_on_item_update', 'return_stock_on_item_delete')
ORDER BY routine_name;

-- Check all new triggers exist on order_items
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'order_items'
ORDER BY trigger_name;
