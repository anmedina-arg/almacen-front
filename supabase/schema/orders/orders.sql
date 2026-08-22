-- ============================================================================
-- Tabla: orders (+ tipo order_status)
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción (columns/indexes/policies/constraints/enum)
-- el 2026-08-22. Fuentes: supabase_orders.sql (creación) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_clients.sql (client_id — Clients #88 no se descarta hasta que
-- confirme su parte) + supabase_store_scoping_orders.sql (#16, policies
-- scoped por Store).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        order_status NOT NULL DEFAULT 'pending',
  total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes         TEXT,
  whatsapp_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ,
  confirmed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id     INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
  store_id      INTEGER REFERENCES public.stores(id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_client_id_idx ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

-- ── Trigger: updated_at ──────────────────────────────────────────────────
-- update_orders_updated_at() es específica de esta tabla (no la genérica
-- update_updated_at_column() compartida por otras — ver Stock/Store). Su
-- función vive en update_orders_updated_at.sql.
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- El INSERT real de una orden pasa por create_order() (SECURITY DEFINER,
-- bypassea RLS), no por un INSERT directo del cliente — esta policy solo
-- cubre ese camino directo si alguna vez se usa.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_store_admin(orders.store_id));

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_store_admin(orders.store_id))
  WITH CHECK (public.is_store_admin(orders.store_id));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_store_admin(orders.store_id));

-- Puente permisivo (is_store_admin(NULL) = true) aplica a las policies de
-- escritura mientras existan filas legacy con store_id NULL — ver
-- ADR-0008. Se cierra en el ticket de contract (#22).

-- confirm_order/cancel_order son SECURITY DEFINER (bypassean RLS) — la
-- verificación de que la orden pertenece a la Store del caller se hace en
-- la ruta de API, antes de invocar el RPC, no acá. Ver confirm_order.sql /
-- cancel_order.sql.
