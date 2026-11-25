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
-- ── Espejo transitorio hacia products.cost ──────────────────────────────────
-- Hasta que los tickets de costos (#186 pedidos, ranking, informes y dashboard;
-- #187 combos y widgets) migren a sus consumidores a esta tabla, esos
-- consumidores siguen leyendo `products.cost`. El trigger de abajo
-- (sync_product_cost_mirror) mantiene esa columna igual al costo de la tabla
-- (0 si no hay fila), así que los triggers y funciones que ya dependen de ella
-- (historial de precios, costo en los ítems de pedido, margen de ranking y
-- exports) siguen funcionando sin tocarlos. La columna y el espejo se borran
-- juntos en el ticket de limpieza (#189). Escribir directo en `products.cost` ya
-- no es la vía: la fuente de verdad es esta tabla.
--
-- ── Paso operativo único en producción (copiar los costos actuales) ─────────
-- Se corre UNA vez al aplicar este archivo, después de crear la tabla. Solo
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

-- Espejo hacia products.cost (ver arriba). El filtro `IS DISTINCT FROM` evita
-- tocar el producto cuando el costo ya coincide: no dispara los triggers de
-- products (updated_at, historial de precios, costo en ítems) sin un cambio real.
-- SECURITY INVOKER: corre con la sesión de quien cambia el costo, que ya es admin
-- de la Store (RLS de products lo exige igual).
CREATE OR REPLACE FUNCTION public.sync_product_cost_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.products SET cost = 0 WHERE id = OLD.product_id AND cost IS DISTINCT FROM 0;
    RETURN OLD;
  END IF;

  UPDATE public.products SET cost = NEW.cost WHERE id = NEW.product_id AND cost IS DISTINCT FROM NEW.cost;
  RETURN NEW;
END;
$$;

-- Función trigger: no necesita EXECUTE para nadie (el privilegio se chequea al
-- crear el trigger, no al dispararse).
REVOKE EXECUTE ON FUNCTION public.sync_product_cost_mirror() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_sync_product_cost_mirror ON public.product_costs;
CREATE TRIGGER trg_sync_product_cost_mirror
  AFTER INSERT OR UPDATE OR DELETE ON public.product_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_cost_mirror();

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
