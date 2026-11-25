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
-- is_combo (supabase_combos.sql — Combos #86), store_id
-- (supabase_multitenant_schema_expand.sql), is_producto_surtido/familia_id/
-- min_variedades/max_variedades (#92, dominio nuevo Producto Surtido).
--
-- COLUMNAS RETIRADAS en #189 (spec #179): `categories`, `cost` y `max_stock`.
--   - `categories` (texto libre, distinta de la tabla `categories` y de `category_id`):
--     salió del flujo en #181 y nada la leía ni escribía.
--   - `cost`: el Costo vive en `product_costs` (#183). Sus lectores (ranking, informes,
--     valor del stock, historial de precios, costo en ítems de pedido) pasaron a esa tabla.
--   - `max_stock`: vive en `product_stock.max_stock` (#184).
-- Antes de borrarlas en producción se verifica (paso 3 de
-- supabase/backfills/supabase_cleanup_products_legacy_columns.sql) que ninguna función,
-- vista, policy, trigger, índice ni constraint las nombra; el DROP aborta si queda alguna.
-- Valores que tenían registrados, relevados contra producción el 2026-11-25 (748 productos):
--   - `categories`: 360 vacíos y el resto texto libre con el nombre de una categoría (Almacén 52,
--     combos 29, Gaseosas 26, Cervezas 23, Galletas y variedades 21, galletas 19, jugos y aguas
--     saborizadas 15, Fideos y arroz 14, Enlatados 12, ...). Ya no se leía desde #181.
--   - `cost`: 649 productos con costo mayor a 0 y 99 en cero (cero = "sin costo registrado").
--     Los 649 ya estaban en `product_costs` con el mismo valor (relevado antes del deploy).
--   - `max_stock`: ningún producto lo tenía cargado.
-- La tabla legacy products_backup conserva una copia vieja de la estructura anterior.
--
-- COLUMNA LEGACY `main_category` (+ CHECK `main_category_check`): RETIRADA el
-- 2026-11-10. Era la categoría fija pre-sistema de categorías. Desde #133 la
-- app no la leía ni la escribía (los INSERT dejaban el DEFAULT 'otros') y las
-- RPCs de Stock exponen `category_name` vía categories. Se hizo el DROP de la
-- columna y su CHECK en producción como cambio separado, después de verificar
-- que ninguna función, vista, policy, trigger ni índice la nombraba. Valores
-- que tenía al borrarla: otros 356, almacen 168, bebidas 77, panaderia 58,
-- combos 33, lacteos 23, congelados 11, fiambres 10, snaks 7, pizzas 5. La
-- tabla legacy products_backup conserva una copia vieja de la columna.
--
-- is_producto_surtido/familia_id/min_variedades/max_variedades (#92, spec
-- #91): marcan un producto como Producto Surtido (se arma eligiendo
-- Variedades de su Familia en vez de venderse tal cual, ver
-- supabase/schema/producto-surtido/). Mínimo y máximo configurables por
-- producto, no fijos por Familia (corrección de alcance documentada en
-- #91, sección Further Notes) — el 1kg de una Familia puede exigir un
-- mínimo más alto que el 1/4kg de la misma Familia.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  price           NUMERIC NOT NULL,
  image           TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  sale_type       TEXT NOT NULL DEFAULT 'unit'
    CONSTRAINT products_sale_type_check CHECK (sale_type IN ('unit', '100gr', 'kg')),
  category_id     INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id  INTEGER REFERENCES public.subcategories(id) ON DELETE SET NULL,
  is_combo        BOOLEAN NOT NULL DEFAULT FALSE,
  store_id        INTEGER NOT NULL REFERENCES public.stores(id),
  is_producto_surtido BOOLEAN NOT NULL DEFAULT FALSE,
  familia_id      INTEGER,
  min_variedades  INTEGER,
  max_variedades  INTEGER,

  -- Un Producto Surtido tiene que traer Familia + mínimo + máximo siempre
  -- juntos — no tiene sentido is_producto_surtido=true sin ellos (quedaría
  -- sin poder armarse), ni tenerlos seteados si is_producto_surtido=false
  -- (datos huérfanos de un flag que se apagó).
  CONSTRAINT products_surtido_fields_check CHECK (
    (is_producto_surtido = FALSE AND familia_id IS NULL AND min_variedades IS NULL AND max_variedades IS NULL)
    OR
    (is_producto_surtido = TRUE AND familia_id IS NOT NULL AND min_variedades IS NOT NULL AND max_variedades IS NOT NULL)
  ),
  CONSTRAINT products_variedades_range_check CHECK (
    min_variedades IS NULL OR (min_variedades >= 1 AND max_variedades >= min_variedades)
  ),

  -- UNIQUE (id, store_id), no solo la PK: sostiene la FK compuesta de
  -- product_costs (#183), que garantiza a nivel de schema que el costo de un
  -- producto es de su misma Store. En producción se agregó con un ALTER TABLE
  -- (CREATE TABLE IF NOT EXISTS no toca una tabla existente):
  --   ALTER TABLE public.products ADD CONSTRAINT products_id_store_id_key UNIQUE (id, store_id);
  CONSTRAINT products_id_store_id_key UNIQUE (id, store_id),

  -- FK compuesta, no una FK simple a familia_id: garantiza que un Producto
  -- Surtido no pueda referenciar una Familia de otra Store a nivel de
  -- schema (ver la nota en producto-surtido/familias.sql).
  CONSTRAINT products_familia_store_fk
    FOREIGN KEY (familia_id, store_id) REFERENCES public.familias(id, store_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_familia_id ON public.products(familia_id);

-- ── Triggers ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Este trigger dispara sobre products pero su función es del dominio Orders (#84):
-- escribe en product_price_history, tabla que Orders posee. La sentencia CREATE TRIGGER
-- vive acá porque products es la tabla a la que está atada. Ver
-- supabase/schema/orders/log_price_change.sql. Desde #189 el costo ya no es de products:
-- sus triggers (historial de costo y costo en ítems de pedido) cuelgan de product_costs.
DROP TRIGGER IF EXISTS trg_log_price_change ON public.products;
CREATE TRIGGER trg_log_price_change
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

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
