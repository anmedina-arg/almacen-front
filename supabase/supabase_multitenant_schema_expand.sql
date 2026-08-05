-- ============================================================================
-- Multi-tenant: tabla stores + store_id nullable en tablas de negocio
-- Ticket: #10 (https://github.com/anmedina-arg/almacen-front/issues/10)
-- ============================================================================
-- Migración puramente ADITIVA: crea `stores` y agrega `store_id` (nullable,
-- FK a stores, sin default) a cada tabla de negocio existente. No modifica
-- RLS ni backfillea datos — eso lo cubren los tickets #11 (backfill) y
-- #15-#22 (scoping/RLS por Store). Ninguna columna ni policy existente se
-- toca, así que ninguna query actual debería verse afectada.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST (ver docs/ops/), verificar que la
-- app sigue funcionando igual, y recién después en producción.
-- ============================================================================

-- ── 1. Tabla stores ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el middleware de resolución de Store (ADR-0003) necesita
-- poder buscar una Store por slug sin sesión admin.
DROP POLICY IF EXISTS "Anyone can read stores" ON public.stores;
CREATE POLICY "Anyone can read stores"
  ON public.stores FOR SELECT USING (true);

-- Escritura: admins únicamente. Usa el rol global existente en profiles —
-- store_admins (membresía por Store) todavía no existe, lo crea el
-- ticket #13. Se revisará esta policy cuando ese modelo esté disponible.
DROP POLICY IF EXISTS "Admins can manage stores" ON public.stores;
CREATE POLICY "Admins can manage stores"
  ON public.stores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── 2. store_id nullable en las 13 tablas de negocio ───────────────────
-- Sin default: en Postgres, agregar una columna nullable sin default es
-- una operación de solo-metadata (no reescribe la tabla), por eso no hay
-- riesgo de bloqueo prolongado en producción aun con tablas grandes.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_subcategories_store_id ON public.subcategories(store_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_clients_store_id ON public.clients(store_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items(store_id);

ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_order_payments_store_id ON public.order_payments(store_id);

ALTER TABLE public.product_stock
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_product_stock_store_id ON public.product_stock(store_id);

ALTER TABLE public.stock_movement_log
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_store_id ON public.stock_movement_log(store_id);

ALTER TABLE public.product_affinity
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_product_affinity_store_id ON public.product_affinity(store_id);

ALTER TABLE public.category_affinity_rules
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_category_affinity_rules_store_id ON public.category_affinity_rules(store_id);

ALTER TABLE public.product_price_history
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_store_id ON public.product_price_history(store_id);

ALTER TABLE public.combo_components
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_combo_components_store_id ON public.combo_components(store_id);


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Confirmar que stores existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'stores';

-- Confirmar store_id en las 13 tablas
SELECT table_name, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'store_id'
ORDER BY table_name;
