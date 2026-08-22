-- ============================================================================
-- Tabla: order_payments
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción el 2026-08-22. Fuentes:
-- supabase_order_payments.sql (creación) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_orders.sql (#16 — reemplazó la única policy FOR
-- ALL original por 4 policies separadas, para que INSERT también pase por
-- is_store_admin() con WITH CHECK explícito).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_payments (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method     TEXT NOT NULL CHECK (method IN ('efectivo', 'transferencia')),
  amount     NUMERIC(10, 2),  -- NULL cuando es el único método (implica el total de la orden)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id   INTEGER REFERENCES public.stores(id),

  -- El mismo método no puede aparecer dos veces en la misma orden
  CONSTRAINT order_payments_unique_method UNIQUE (order_id, method)
);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_store_id ON public.order_payments(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view order payments" ON public.order_payments;
CREATE POLICY "Admins can view order payments"
  ON public.order_payments FOR SELECT
  USING (public.is_store_admin(order_payments.store_id));

DROP POLICY IF EXISTS "Admins can insert order payments" ON public.order_payments;
CREATE POLICY "Admins can insert order payments"
  ON public.order_payments FOR INSERT
  WITH CHECK (public.is_store_admin(order_payments.store_id));

DROP POLICY IF EXISTS "Admins can update order payments" ON public.order_payments;
CREATE POLICY "Admins can update order payments"
  ON public.order_payments FOR UPDATE
  USING (public.is_store_admin(order_payments.store_id))
  WITH CHECK (public.is_store_admin(order_payments.store_id));

DROP POLICY IF EXISTS "Admins can delete order payments" ON public.order_payments;
CREATE POLICY "Admins can delete order payments"
  ON public.order_payments FOR DELETE
  USING (public.is_store_admin(order_payments.store_id));

-- Puente permisivo (is_store_admin(NULL) = true) aplica a las policies de
-- escritura mientras existan filas legacy con store_id NULL — ver
-- ADR-0008. Se cierra en el ticket de contract (#22).
