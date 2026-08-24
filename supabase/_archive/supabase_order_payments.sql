-- ============================================================
-- order_payments table — track payment method(s) per order
-- ============================================================

CREATE TABLE order_payments (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method     TEXT NOT NULL CHECK (method IN ('efectivo', 'transferencia')),
  amount     NUMERIC(10, 2),  -- NULL when it's the only method (implies full order total)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Same method can only appear once per order
  CONSTRAINT order_payments_unique_method UNIQUE (order_id, method)
);

-- Fast lookup of payments by order
CREATE INDEX order_payments_order_id_idx ON order_payments (order_id);

-- ============================================================
-- RLS: admins can manage payments
-- ============================================================
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order payments"
  ON order_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
