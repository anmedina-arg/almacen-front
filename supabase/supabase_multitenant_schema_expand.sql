-- ============================================================================
-- Multi-tenant: tabla stores + store_id nullable en tablas de negocio
-- Ticket: #10 (https://github.com/anmedina-arg/almacen-front/issues/10)
-- ============================================================================
-- CHECKLIST DE MIGRACIÓN A supabase/schema/ (#82, spec #81, mapa #74)
-- Este archivo toca 14 dominios/tablas. NO SE DESCARTA hasta que las 14
-- estén tachadas por el ticket de dominio correspondiente. Tachar acá al
-- extraer, no antes.
--
-- [x] stores                    -> Store (#87) — supabase/schema/store/stores.sql
-- [x] products                  -> Products/Categories (#85) — supabase/schema/products/products.sql
-- [x] categories                -> Products/Categories (#85) — supabase/schema/products/categories.sql
-- [x] subcategories             -> Products/Categories (#85) — supabase/schema/products/subcategories.sql
-- [x] clients                   -> Clients (#88) — supabase/schema/clients/clients.sql
-- [x] orders                    -> Orders (#84) — supabase/schema/orders/orders.sql
-- [x] order_items               -> Orders (#84) — supabase/schema/orders/order_items.sql
-- [x] order_payments            -> Orders (#84) — supabase/schema/orders/order_payments.sql
-- [x] product_stock             -> Stock (#83) — supabase/schema/stock/product_stock.sql
-- [x] stock_movement_log        -> Stock (#83) — supabase/schema/stock/stock_movement_log.sql
-- [ ] product_affinity          -> Recomendaciones/Informes (#90)
-- [ ] category_affinity_rules   -> Recomendaciones/Informes (#90)
-- [x] product_price_history     -> Orders (#84) — supabase/schema/orders/product_price_history.sql
-- [x] combo_components          -> Combos (#86) — supabase/schema/combos/combo_components.sql
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

-- RLS habilitada sin ninguna policy: default-deny total para anon/authenticated
-- (los grants por defecto de Supabase les dan ALL a nivel de schema, así que
-- sin RLS la tabla quedaría abierta a cualquiera con la anon key). Quién puede
-- leer/escribir stores es una decisión de scoping que corresponde a los
-- tickets #12 (resolución por slug) y #13 (store_admins/super_admin) — hasta
-- entonces, el alta de Stores es manual vía SQL Editor (ADR-0006), que corre
-- como el rol postgres y por lo tanto bypassea RLS igual.
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;


-- ── 2. store_id nullable en las 13 tablas de negocio identificadas ─────
-- Lista autoritativa (ver ticket #10): products, categories, subcategories,
-- clients, orders, order_items, order_payments, product_stock,
-- stock_movement_log, product_affinity, category_affinity_rules,
-- product_price_history, combo_components. Si se agrega una tabla de
-- negocio nueva más adelante, sumarla acá Y a TABLES_WITH_STORE_ID en
-- src/test/integration/multitenant-schema.test.ts.
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
