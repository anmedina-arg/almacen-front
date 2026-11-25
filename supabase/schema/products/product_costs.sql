-- ============================================================================
-- Tabla: product_costs — el Costo de un Producto (#179, ticket #183)
-- Dominio: Products
-- ============================================================================
-- El Costo deja de ser una columna del Producto y pasa a ser un módulo propio
-- (flag `costos`, ADR-0018). Una fila por producto y Store: **sin fila significa
-- "sin costo registrado"**, nunca cero. Un costo en cero registrado a propósito
-- es una fila con cost = 0 y es distinto de no tener fila.
--
-- Apagar la flag `costos` nunca borra filas de esta tabla (ADR-0018).
--
-- El Costo es dato del Store admin, no del catálogo público: RLS solo deja
-- verlo y cambiarlo a quien administra la Store dueña, y anon no tiene acceso.
--
-- ── Costo del producto: única fuente (#189) ─────────────────────────────────
-- Esta tabla es la única fuente del Costo. Hasta #189 un trigger espejaba el costo a
-- `products.cost` para los consumidores que todavía leían esa columna (historial de
-- precios, costo en los ítems de pedido, margen de ranking y exports); en #189 esos
-- consumidores pasaron a leer esta tabla y la columna y el espejo se borraron. Los
-- triggers de abajo (log_cost_change, sync_order_items_unit_cost) ocupan su lugar.
--
-- ── Paso operativo único en producción (copiar los costos actuales) — YA APLICADO (#183) ─
-- Histórico: copiaba desde la columna products.cost, que #189 borró. Se corrió UNA vez al
-- crear la tabla, y no se puede repetir. Solo
-- copia costos mayores a cero: un 0 en la columna vieja es "sin costo
-- registrado", no un costo. No toca products (el espejo ya coincide, así que no
-- dispara triggers ni pisa updated_at). Es idempotente.
--
--   ALTER TABLE public.products
--     ADD CONSTRAINT products_id_store_id_key UNIQUE (id, store_id);   -- una vez, antes de la tabla
--   INSERT INTO public.product_costs (product_id, store_id, cost)
--   SELECT id, store_id, cost FROM public.products WHERE cost > 0
--   ON CONFLICT DO NOTHING;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id  INTEGER NOT NULL,
  store_id    INTEGER NOT NULL REFERENCES public.stores(id),
  cost        NUMERIC(12, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- PK compuesta que coincide con la FK: una sola fila por producto, y el
  -- embed de PostgREST (products → product_costs) resulta uno-a-uno.
  CONSTRAINT product_costs_pkey PRIMARY KEY (product_id, store_id),
  CONSTRAINT product_costs_cost_check CHECK (cost >= 0),

  -- FK compuesta, no una FK simple a product_id: garantiza a nivel de schema
  -- que el costo es de la misma Store que el producto (ver la nota de
  -- UNIQUE (id, store_id) en products.sql). ON DELETE CASCADE: sin producto no
  -- hay costo.
  CONSTRAINT product_costs_product_store_fk
    FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id) ON DELETE CASCADE
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_costs_store_id ON public.product_costs(store_id);

-- ── Triggers ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_product_costs_updated_at ON public.product_costs;
CREATE TRIGGER trg_product_costs_updated_at
  BEFORE UPDATE ON public.product_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Historial de precios y costo en los ítems de pedido: antes colgaban de products.cost
-- (#189). Funciones en orders/log_price_change.sql y orders/sync_order_items_unit_cost.sql.
DROP TRIGGER IF EXISTS trg_log_cost_change ON public.product_costs;
CREATE TRIGGER trg_log_cost_change
  AFTER INSERT OR UPDATE OR DELETE ON public.product_costs
  FOR EACH ROW
  EXECUTE FUNCTION log_cost_change();

DROP TRIGGER IF EXISTS trg_sync_order_items_cost ON public.product_costs;
CREATE TRIGGER trg_sync_order_items_cost
  AFTER INSERT OR UPDATE ON public.product_costs
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_items_unit_cost();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

-- Sin lectura pública: el Costo no es del catálogo.
REVOKE ALL ON public.product_costs FROM anon;

DROP POLICY IF EXISTS "Admins can manage product_costs" ON public.product_costs;
CREATE POLICY "Admins can manage product_costs"
  ON public.product_costs FOR ALL
  USING (public.is_store_admin(product_costs.store_id))
  WITH CHECK (public.is_store_admin(product_costs.store_id));

NOTIFY pgrst, 'reload schema';
