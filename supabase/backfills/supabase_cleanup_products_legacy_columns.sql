-- ============================================================================
-- Limpieza #189 (spec #179): borrar de `products` las columnas viejas
-- ============================================================================
-- Paso operativo único en producción. Es IRREVERSIBLE (DROP COLUMN): corré cada bloque
-- numerado por separado y en orden, con el proyecto de producción confirmado, y verificá el
-- resultado antes de seguir. Los bloques 3 y 4 son runbook (aplican los canónicos indicados,
-- una función por Run); el resto es SQL ejecutable.
--
-- ORDEN CON EL DEPLOY (importa: `main` corre código viejo hasta que se despliegue este ticket):
--   - Bloque 0: ANTES del deploy. Es el único objeto seguro antes: el trigger de ítems de pedido
--     solo completa los ítems que llegan con costo 0, así que no pisa al código viejo. Hay que
--     aplicarlo ANTES porque el código nuevo ya no manda unit_cost: sin el trigger, los pedidos
--     entre el deploy y el resto del script quedarían con costo 0.
--   - Bloques 1 a 5: DESPUÉS del deploy, de corrido. Mientras corre el código viejo, un costo
--     editado en el admin se escribe en `products.cost` y NO llega a `product_costs` (el espejo
--     va en un solo sentido), así que migrar las funciones antes les haría leer costos viejos.
--     Y borrar una columna con el código viejo en pie rompe sus `select`.
--
-- Valores que tenían las columnas al borrarlas: ver el encabezado de supabase/schema/products/products.sql.
-- ============================================================================

-- 0) ANTES del deploy: aplicar supabase/schema/orders/set_order_item_unit_cost.sql (la función)
--    y luego:
--      DROP TRIGGER IF EXISTS trg_set_order_item_unit_cost ON public.order_items;
--      CREATE TRIGGER trg_set_order_item_unit_cost BEFORE INSERT ON public.order_items
--        FOR EACH ROW EXECUTE FUNCTION set_order_item_unit_cost();

-- 1) DESPUÉS del deploy: resincronizar product_costs con la columna vieja (todavía existe y es la
--    verdad de lo que el código viejo editó). Solo costos > 0 (un 0 es "sin costo registrado");
--    idempotente. Corre antes de tocar los triggers para que el espejo todavía exista.
INSERT INTO public.product_costs (product_id, store_id, cost)
SELECT id, store_id, cost FROM public.products WHERE cost > 0
ON CONFLICT (product_id, store_id) DO UPDATE SET cost = EXCLUDED.cost
  WHERE public.product_costs.cost IS DISTINCT FROM EXCLUDED.cost;

-- 2) Retirar los triggers viejos y el espejo ANTES de reemplazar las funciones: el trigger viejo
--    de products seguiría atado a sync_order_items_unit_cost(), que desde #189 lee la fila de
--    product_costs, y fallaría en cualquier edición de costo.
DROP TRIGGER IF EXISTS trg_sync_order_items_cost ON public.products;
DROP TRIGGER IF EXISTS trg_sync_product_cost_mirror ON public.product_costs;
DROP FUNCTION IF EXISTS public.sync_product_cost_mirror();

-- 3) Aplicar, en este orden y una función por Run, los canónicos:
--      orders/log_price_change.sql (log_price_change + log_cost_change)
--      orders/sync_order_items_unit_cost.sql
--      ranking/get_top_products.sql
--      recomendaciones/export_productos.sql
--      stock/get_stock_value_per_day.sql
--    y crear los triggers nuevos (sentencias exactas en products/product_costs.sql):
--      trg_log_cost_change y trg_sync_order_items_cost, ambos ON public.product_costs.

-- 4) Verificar que nada nombra las columnas — mismo criterio que el retiro de main_category:
--    ninguna función, vista, policy, trigger, índice ni constraint. Tiene que devolver 0 filas
--    en las tres consultas:
--      SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prokind IN ('f','p')
--        AND regexp_replace(pg_get_functiondef(oid), '--[^\n\r]*', '', 'g') ~ '\m(p|products)\.(cost|max_stock|categories)\M';
--      SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname NOT LIKE 'pg_%'
--        AND definition ~ '\m(cost|max_stock|categories)\M' AND definition ~ '\mproducts\M';
--      SELECT tablename || '.' || policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products'
--        AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '\m(cost|max_stock|categories)\M';
--    (índices y constraints de products: ver `\d products`; ninguno nombra estas columnas.)
--    El test product-cost-single-source.test.ts cubre lo mismo contra la base local.

-- 5) Borrar las columnas. El bloque aborta si alguna función de public todavía nombra una de ellas
--    ("si quedan consumidores, se anota y no se borra"):
DO $$
DECLARE
  v_offenders TEXT;
BEGIN
  SELECT string_agg(proname, ', ') INTO v_offenders
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND prokind IN ('f', 'p')
    AND regexp_replace(pg_get_functiondef(oid), '--[^\n\r]*', '', 'g') ~ '\m(p|products)\.(cost|max_stock|categories)\M';
  IF v_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Quedan funciones que nombran columnas de products: %. No se borra nada.', v_offenders;
  END IF;

  ALTER TABLE public.products DROP COLUMN IF EXISTS cost;
  ALTER TABLE public.products DROP COLUMN IF EXISTS max_stock;
  ALTER TABLE public.products DROP COLUMN IF EXISTS categories;
END $$;

NOTIFY pgrst, 'reload schema';
