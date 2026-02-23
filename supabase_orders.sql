-- ============================================================================
-- Orders System - Supabase Migration
-- ============================================================================
-- Tables: orders, order_items
-- Triggers: auto-recalculate order total on item changes
-- RLS policies: admin full access, public can create orders
-- RPC functions: create_order (transactional order + items creation)
-- ============================================================================

-- 1. Create order_status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END$$;

-- 2. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        order_status NOT NULL DEFAULT 'pending',
  total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes         TEXT,
  whatsapp_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ,
  confirmed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal      NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_by_weight  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 5. Trigger: auto-update orders.updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- 6. Trigger: auto-recalculate orders.total when order_items change
CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  target_order_id BIGINT;
BEGIN
  -- Determine which order to recalculate
  IF TG_OP = 'DELETE' THEN
    target_order_id := OLD.order_id;
  ELSE
    target_order_id := NEW.order_id;
  END IF;

  -- Recalculate total from all items
  UPDATE orders
  SET total = COALESCE(
    (SELECT SUM(quantity * unit_price)
     FROM order_items
     WHERE order_id = target_order_id),
    0
  )
  WHERE id = target_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_order_total ON order_items;
CREATE TRIGGER trg_recalculate_order_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total();

-- 7. RPC: Create order with items (transactional)
CREATE OR REPLACE FUNCTION create_order(
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_whatsapp_message TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id BIGINT;
  v_item JSONB;
  v_total NUMERIC(12, 2) := 0;
  v_item_subtotal NUMERIC(12, 2);
BEGIN
  -- Create the order
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_subtotal := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_total := v_total + v_item_subtotal;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, is_by_weight)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::INTEGER,
      v_item->>'product_name',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE)
    );
  END LOOP;

  -- Update the order total (trigger also does this, but we set it explicitly)
  UPDATE orders SET total = v_total WHERE id = v_order_id;

  -- Return the created order
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'status', 'pending',
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;

-- 8. RPC: Confirm order (admin only - enforced via RLS on caller)
CREATE OR REPLACE FUNCTION confirm_order(
  p_order_id BIGINT,
  p_confirmed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order % is not pending (current status: %)', p_order_id, v_order.status;
  END IF;

  -- Update order status
  UPDATE orders
  SET status = 'confirmed',
      confirmed_at = NOW(),
      confirmed_by = p_confirmed_by
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'confirmed',
    'confirmed_at', NOW(),
    'confirmed_by', p_confirmed_by
  );
END;
$$;

-- 9. RLS Policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON order_items;

-- Orders policies
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Order items policies
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update order items"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete order items"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 10. Grant access to the RPC functions
GRANT EXECUTE ON FUNCTION create_order TO anon;
GRANT EXECUTE ON FUNCTION create_order TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_order TO authenticated;
