-- ============================================================================
-- Combos Feature
-- ============================================================================
-- Run this in Supabase SQL Editor.
--
-- Changes:
--   1a. Add is_combo / max_stock columns to products
--   1b. Create combo_components table with RLS
--   1c. Trigger: sync_combo_cost → auto-update products.cost on component change
--   1d. Function: get_combo_effective_stock(product_id)
--   1e. Update get_all_products_with_stock() → virtual stock for combos
--   1f. Update create_order() → handle combo stock deduction per component
--   1g. Update cancel_order() → return stock to components
--   1h. Update adjust_stock_on_item_update trigger → handle combos
--   1i. Update return_stock_on_item_delete trigger → handle combos
-- ============================================================================


-- ============================================================================
-- PART 1a: Add is_combo / max_stock to products
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_combo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC(12, 3);  -- NULL = no limit


-- ============================================================================
-- PART 1b: Create combo_components table
-- ============================================================================

CREATE TABLE IF NOT EXISTS combo_components (
  id                    BIGSERIAL PRIMARY KEY,
  combo_product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity              NUMERIC(12, 3) NOT NULL DEFAULT 1,
  UNIQUE(combo_product_id, component_product_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_components_combo ON combo_components(combo_product_id);

ALTER TABLE combo_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage combo_components" ON combo_components;
CREATE POLICY "Admins can manage combo_components"
  ON combo_components FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public can view combo_components" ON combo_components;
CREATE POLICY "Public can view combo_components"
  ON combo_components FOR SELECT USING (true);


-- ============================================================================
-- PART 1c: Trigger — auto-update products.cost when components change
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_combo_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_combo_id INTEGER;
BEGIN
  v_combo_id := COALESCE(NEW.combo_product_id, OLD.combo_product_id);

  UPDATE products
  SET cost = (
    SELECT COALESCE(SUM(cc.quantity * p.cost), 0)
    FROM combo_components cc
    JOIN products p ON p.id = cc.component_product_id
    WHERE cc.combo_product_id = v_combo_id
  )
  WHERE id = v_combo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_combo_cost ON combo_components;
CREATE TRIGGER trg_sync_combo_cost
  AFTER INSERT OR UPDATE OR DELETE ON combo_components
  FOR EACH ROW EXECUTE FUNCTION sync_combo_cost();


-- ============================================================================
-- PART 1d: Helper function get_combo_effective_stock(product_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_combo_effective_stock(p_product_id INTEGER)
RETURNS NUMERIC(12, 3) AS $$
  SELECT FLOOR(MIN(COALESCE(ps.quantity, 0) / cc.quantity))
  FROM combo_components cc
  LEFT JOIN product_stock ps ON ps.product_id = cc.component_product_id
  WHERE cc.combo_product_id = p_product_id;
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- PART 1e: Update get_all_products_with_stock() — virtual stock for combos
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_products_with_stock()
RETURNS TABLE (
  stock_id BIGINT,
  product_id INTEGER,
  product_name TEXT,
  product_price NUMERIC,
  main_category TEXT,
  product_active BOOLEAN,
  product_image TEXT,
  quantity NUMERIC(12, 3),
  min_stock NUMERIC(12, 3),
  is_low_stock BOOLEAN,
  updated_by UUID,
  updated_by_name TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    ps.id AS stock_id,
    p.id AS product_id,
    p.name AS product_name,
    p.price AS product_price,
    p.main_category,
    p.active AS product_active,
    p.image AS product_image,
    CASE
      WHEN p.is_combo THEN
        CASE WHEN p.max_stock IS NOT NULL
          THEN LEAST(get_combo_effective_stock(p.id), p.max_stock)
          ELSE get_combo_effective_stock(p.id)
        END
      ELSE ps.quantity
    END AS quantity,
    ps.min_stock,
    CASE
      WHEN p.is_combo THEN false
      WHEN ps.min_stock IS NOT NULL AND ps.quantity IS NOT NULL
        AND ps.quantity <= ps.min_stock
      THEN true
      ELSE false
    END AS is_low_stock,
    ps.updated_by,
    pr.full_name AS updated_by_name,
    ps.notes,
    ps.updated_at
  FROM public.products p
  LEFT JOIN public.product_stock ps ON ps.product_id = p.id
  LEFT JOIN public.profiles pr ON pr.id = ps.updated_by
  ORDER BY p.name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_all_products_with_stock IS 'Returns all products with stock. Combo stock is virtual (min of components). Auth required.';


-- ============================================================================
-- PART 1f: Update create_order() — handle combo stock deduction per component
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
  -- Create the order record
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  -- Tag stock changes as 'sale' in the audit log
  PERFORM set_config('app.movement_type', 'sale', true);

  -- Process each item: check and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'product_id')::INTEGER;
    v_needed      := (v_item->>'quantity')::NUMERIC;
    v_item_failed := FALSE;

    -- Check if this product is a combo
    SELECT is_combo INTO v_is_combo FROM products WHERE id = v_product_id;

    IF v_is_combo THEN
      -- For combos: check and deduct each component's stock
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
          EXIT; -- stop checking components for this combo; no partial deductions
        END IF;

        UPDATE product_stock
        SET quantity = quantity - v_component_needed
        WHERE product_id = v_component.component_product_id;
      END LOOP;

      -- Skip inserting order_item if any component had insufficient stock
      IF v_item_failed THEN
        CONTINUE;
      END IF;

    ELSE
      -- Regular product: existing logic
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

    -- Insert order item and add to total (same for combo and regular)
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
-- PART 1g: Update cancel_order() — return stock to components for combos
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
  v_is_combo     BOOLEAN;
  v_component    RECORD;
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
      SELECT is_combo INTO v_is_combo FROM products WHERE id = v_item.product_id;

      IF v_is_combo THEN
        -- Return stock to each component
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

GRANT EXECUTE ON FUNCTION cancel_order TO authenticated;


-- ============================================================================
-- PART 1h: Update adjust_stock_on_item_update trigger — handle combos
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

  SELECT is_combo INTO v_is_combo FROM products WHERE id = NEW.product_id;

  IF v_is_combo THEN
    IF v_diff > 0 THEN
      PERFORM set_config('app.movement_type', 'sale', true);

      -- Check all components have enough stock first
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

      -- Deduct from all components
      FOR v_component IN
        SELECT * FROM combo_components WHERE combo_product_id = NEW.product_id
      LOOP
        UPDATE product_stock
        SET quantity = quantity - (v_diff * v_component.quantity)
        WHERE product_id = v_component.component_product_id;
      END LOOP;

    ELSE
      -- Quantity decreased → return to components
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
    -- Regular product: existing logic
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

DROP TRIGGER IF EXISTS trg_adjust_stock_on_item_update ON order_items;
CREATE TRIGGER trg_adjust_stock_on_item_update
  BEFORE UPDATE OF quantity ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_item_update();


-- ============================================================================
-- PART 1i: Update return_stock_on_item_delete trigger — handle combos
-- ============================================================================

CREATE OR REPLACE FUNCTION return_stock_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
  v_is_combo     BOOLEAN;
  v_component    RECORD;
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

  SELECT is_combo INTO v_is_combo FROM products WHERE id = OLD.product_id;

  IF v_is_combo THEN
    FOR v_component IN
      SELECT * FROM combo_components WHERE combo_product_id = OLD.product_id
    LOOP
      UPDATE product_stock
      SET quantity = quantity + (OLD.quantity * v_component.quantity)
      WHERE product_id = v_component.component_product_id;
    END LOOP;
  ELSE
    UPDATE product_stock
    SET quantity = quantity + OLD.quantity
    WHERE product_id = OLD.product_id;
  END IF;

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

-- Check new columns on products
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('is_combo', 'max_stock');

-- Check combo_components table
SELECT table_name FROM information_schema.tables
WHERE table_name = 'combo_components';

-- Check new/updated functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sync_combo_cost', 'get_combo_effective_stock', 'get_all_products_with_stock',
    'create_order', 'cancel_order',
    'adjust_stock_on_item_update', 'return_stock_on_item_delete'
  )
ORDER BY routine_name;
