-- ============================================================
-- Clients table — identify customers by lot code
-- ============================================================

CREATE TABLE clients (
  id          SERIAL PRIMARY KEY,
  barrio      TEXT NOT NULL CHECK (barrio IN ('AC1', 'AC2', 'otros')),
  manzana_lote TEXT,
  display_code TEXT GENERATED ALWAYS AS (
    CASE WHEN barrio = 'otros' THEN 'otros' ELSE barrio || '-' || manzana_lote END
  ) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- manzana_lote is required and must match letter + 2-digit (01-30) when barrio != 'otros'
  CONSTRAINT manzana_lote_required CHECK (
    barrio = 'otros'
    OR (manzana_lote IS NOT NULL AND manzana_lote ~ '^[A-Z](0[1-9]|[12][0-9]|30)$')
  ),
  -- manzana_lote must be NULL when barrio = 'otros'
  CONSTRAINT manzana_lote_null_for_otros CHECK (
    barrio != 'otros' OR manzana_lote IS NULL
  )
);

-- One record per lot (AC1/AC2)
CREATE UNIQUE INDEX clients_unique_lot
  ON clients (barrio, manzana_lote)
  WHERE barrio != 'otros';

-- Only one 'otros' client
CREATE UNIQUE INDEX clients_unique_otros
  ON clients (barrio)
  WHERE barrio = 'otros';

-- Insert the 'otros' client upfront
INSERT INTO clients (barrio) VALUES ('otros');

-- ============================================================
-- Add client_id FK to orders
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_id INTEGER
  REFERENCES clients (id) ON DELETE SET NULL;

-- Index for fast lookup of orders by client
CREATE INDEX IF NOT EXISTS orders_client_id_idx ON orders (client_id);

-- ============================================================
-- RLS: admins can read/write clients; anyone can read display_code
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clients"
  ON clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
