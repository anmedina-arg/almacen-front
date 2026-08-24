-- ============================================================================
-- Tabla: products
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- ADVERTENCIA: esta tabla NUNCA tuvo un CREATE TABLE en el repo — se creó a
-- mano en algún momento temprano del proyecto, antes de que empezara la
-- disciplina de migraciones en archivo. Este canónico es la primera vez que
-- su estructura completa queda documentada en código: reconstruido
-- íntegramente desde information_schema/pg_constraint/pg_indexes contra
-- producción el 2026-08-22, no desde un archivo .sql anterior. Las columnas
-- agregadas después SÍ tienen fuente: category_id/subcategory_id
-- (supabase_categories_phase2.sql), sale_type (supabase_sale_type.sql),
-- cost (supabase_pricing.sql — Orders #84, ya extraído por ese ticket),
-- is_combo/max_stock (supabase_combos.sql — Combos #86, no se descarta
-- hasta que confirme su parte), store_id
-- (supabase_multitenant_schema_expand.sql).
--
-- COLUMNA LEGACY SIN DOCUMENTAR: `categories` (texto libre, NOT NULL, sin
-- default) — distinta de la tabla `categories` y de `category_id`. Sigue en
-- uso activo (ProductFormModal, ProductList, /api/products) como campo de
-- texto libre complementario, no reemplazado todavía por el sistema
-- normalizado de category_id/subcategory_id. No se toca ni se elimina acá
-- — solo se documenta por primera vez.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  price           NUMERIC NOT NULL,
  image           TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  categories      TEXT NOT NULL,
  main_category   TEXT DEFAULT 'otros',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  sale_type       TEXT NOT NULL DEFAULT 'unit'
    CONSTRAINT products_sale_type_check CHECK (sale_type IN ('unit', '100gr', 'kg')),
  category_id     INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id  INTEGER REFERENCES public.subcategories(id) ON DELETE SET NULL,
  cost            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_combo        BOOLEAN NOT NULL DEFAULT FALSE,
  max_stock       NUMERIC(12, 3),
  store_id        INTEGER NOT NULL REFERENCES public.stores(id),

  CONSTRAINT main_category_check CHECK (main_category IN (
    'panaderia', 'congelados', 'combos', 'snaks', 'otros',
    'bebidas', 'lacteos', 'almacen', 'fiambres', 'pizzas'
  ))
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

-- ── Triggers ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Estas dos disparan sobre products pero sus funciones son del dominio
-- Orders (#84) — escriben en product_price_history/order_items, tablas que
-- Orders posee. La sentencia CREATE TRIGGER vive acá porque products es la
-- tabla a la que están atadas (mismo criterio que Stock/Orders: el trigger
-- se declara junto a la tabla que dispara, la función junto a quien la
-- posee semánticamente). Ver supabase/schema/orders/log_price_change.sql y
-- sync_order_items_unit_cost.sql.
DROP TRIGGER IF EXISTS trg_log_price_change ON public.products;
CREATE TRIGGER trg_log_price_change
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

DROP TRIGGER IF EXISTS trg_sync_order_items_cost ON public.products;
CREATE TRIGGER trg_sync_order_items_cost
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_items_unit_cost();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_store_admin(products.store_id))
  WITH CHECK (public.is_store_admin(products.store_id));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_store_admin(products.store_id));

-- El puente permisivo (is_store_admin(NULL) = true) que aplicaba acá se
-- cerró en #22 — is_store_admin() ya no tiene esa rama, y store_id es
-- NOT NULL en esta tabla. Ver ADR-0008 (marcado cerrado).
