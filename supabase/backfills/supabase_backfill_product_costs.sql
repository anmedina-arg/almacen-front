-- ============================================================================
-- Backfill #183 (spec #179): el Costo pasa a su propia tabla, `product_costs`
-- ============================================================================
-- Paso operativo único en producción, DESPUÉS de crear la tabla y las funciones
-- (supabase/schema/products/product_costs.sql y combos/sync_combo_cost.sql).
-- Es idempotente: se puede volver a correr sin cambiar nada.
--
-- 1. Clave única compuesta en products: sostiene la FK compuesta de product_costs
--    (el costo es de la misma Store que el producto). Va ANTES de crear la tabla.
-- 2. Copia los costos actuales desde products.cost. Solo los mayores a cero: un 0
--    en la columna vieja es "sin costo registrado", no un costo. No toca products
--    (el espejo ya coincide, así que no dispara triggers ni pisa updated_at).
-- 3. Estado inicial de la flag `costos` por Store: encendida en Market del Cevil y
--    en la Demo Store, apagada en Yo Heladerías. Una Store nueva arranca sin la
--    key (apagada). `||` conserva el resto de las flags.
--
-- Verificación esperada en producción (relevado el 2026-11-25):
--   market-del-cevil  626 productos con costo > 0  (79 en cero, no se copian)
--   demo-store         23 productos con costo > 0
--   yo-heladerias       0 (20 en cero, no se copian)
--   total copiado     649 filas
-- ============================================================================

-- 1) Solo si todavía no existe (en una base nueva ya viene de products.sql).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_id_store_id_key' AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_id_store_id_key UNIQUE (id, store_id);
  END IF;
END $$;

-- 2) Copia de costos.
INSERT INTO public.product_costs (product_id, store_id, cost)
SELECT id, store_id, cost FROM public.products WHERE cost > 0
ON CONFLICT DO NOTHING;

-- 3) Flag `costos` por Store.
UPDATE public.stores SET feature_flags = feature_flags || '{"costos": true}'::jsonb  WHERE slug IN ('market-del-cevil', 'demo-store');
UPDATE public.stores SET feature_flags = feature_flags || '{"costos": false}'::jsonb WHERE slug = 'yo-heladerias';
