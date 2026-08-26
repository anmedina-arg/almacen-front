-- ============================================================================
-- Tabla: order_items
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción el 2026-08-22. Fuentes: supabase_orders.sql
-- (creación) + supabase_pricing.sql (unit_cost — Products #85 no se
-- descarta hasta que confirme su parte de ese archivo, la columna
-- products.cost) + supabase_recommendations.sql (from_suggestion —
-- Recomendaciones #90 no se descarta hasta que confirme su parte) +
-- supabase_multitenant_schema_expand.sql (store_id).
--
-- #103: trg_validate_order_item_store agregado — hasta entonces nada
-- impedía que product_id apuntara a un producto de otra Store distinta de
-- store_id en esta misma fila. Ver validate_order_item_store.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal      NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_by_weight  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  from_suggestion BOOLEAN NOT NULL DEFAULT FALSE,
  store_id        INTEGER NOT NULL REFERENCES public.stores(id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);

-- ── Triggers ─────────────────────────────────────────────────────────────
-- Las funciones viven en sus propios archivos (mismo dominio, Orders).
DROP TRIGGER IF EXISTS trg_validate_order_item_store ON public.order_items;
CREATE TRIGGER trg_validate_order_item_store
  BEFORE INSERT OR UPDATE OF product_id, store_id ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_item_store();

DROP TRIGGER IF EXISTS trg_recalculate_order_total ON public.order_items;
CREATE TRIGGER trg_recalculate_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total();

DROP TRIGGER IF EXISTS trg_adjust_stock_on_item_update ON public.order_items;
CREATE TRIGGER trg_adjust_stock_on_item_update
  BEFORE UPDATE OF quantity ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_item_update();

DROP TRIGGER IF EXISTS trg_return_stock_on_item_delete ON public.order_items;
CREATE TRIGGER trg_return_stock_on_item_delete
  BEFORE DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION return_stock_on_item_delete();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- El INSERT real pasa por create_order() (SECURITY DEFINER) — igual que en
-- orders, esta policy solo cubre el camino directo si alguna vez se usa.
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
  ON public.order_items FOR UPDATE
  USING (public.is_store_admin(order_items.store_id))
  WITH CHECK (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;
CREATE POLICY "Admins can delete order items"
  ON public.order_items FOR DELETE
  USING (public.is_store_admin(order_items.store_id));

DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;
CREATE POLICY "Admins can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (public.is_store_admin(order_items.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado).
