-- ============================================================
-- Precio de Compra (Costo) e Historial de Precios
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna cost a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 2. Crear tabla de historial de precios (append-only)
CREATE TABLE IF NOT EXISTS product_price_history (
  id          BIGSERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price  NUMERIC(12, 2) NOT NULL,
  cost        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id
  ON product_price_history(product_id, changed_at DESC);

-- 3. RLS para product_price_history (solo admins)
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price history"
  ON product_price_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Trigger function: registra en historial en INSERT y en UPDATE cuando price o cost cambian
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_price_history (product_id, sale_price, cost, changed_at)
    VALUES (NEW.id, NEW.price, NEW.cost, NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.price IS DISTINCT FROM NEW.price) OR (OLD.cost IS DISTINCT FROM NEW.cost) THEN
      INSERT INTO product_price_history (product_id, sale_price, cost, changed_at)
      VALUES (NEW.id, NEW.price, NEW.cost, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_price_change ON products;
CREATE TRIGGER trg_log_price_change
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- 5. Agregar unit_cost a order_items (snapshot del costo al momento de la venta)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 6. Actualizar create_order() RPC para aceptar y guardar unit_cost por ítem
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
  INSERT INTO orders (user_id, status, total, notes, whatsapp_message)
  VALUES (p_user_id, 'pending', 0, p_notes, p_whatsapp_message)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_subtotal := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_total := v_total + v_item_subtotal;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, is_by_weight)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::INTEGER,
      v_item->>'product_name',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'unit_cost')::NUMERIC, 0),
      COALESCE((v_item->>'is_by_weight')::BOOLEAN, FALSE)
    );
  END LOOP;

  UPDATE orders SET total = v_total WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'status', 'pending',
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;

-- 7. Trigger: cuando se actualiza products.cost, sincroniza order_items con unit_cost = 0
-- Preserva snapshots históricos correctos (solo toca items sin costo capturado)
CREATE OR REPLACE FUNCTION sync_order_items_unit_cost()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.cost IS DISTINCT FROM NEW.cost) AND NEW.cost > 0 THEN
    UPDATE order_items
    SET unit_cost = NEW.cost
    WHERE product_id = NEW.id
      AND unit_cost = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_items_cost ON products;
CREATE TRIGGER trg_sync_order_items_cost
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_items_unit_cost();
