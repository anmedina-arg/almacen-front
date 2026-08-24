-- ============================================================================
-- Tabla: product_price_history
-- Dominio: Orders (#84, spec #81, mapa #74)
-- ============================================================================
-- Historial append-only de precio/costo de cada producto — alimentado por
-- el trigger log_price_change() (ver log_price_change.sql), que dispara
-- sobre products (tabla del dominio Products, #85) en cada INSERT/UPDATE.
--
-- Verificado contra producción el 2026-08-22. Fuentes: supabase_pricing.sql
-- (creación) + supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_fix_super_admin_remaining_policies.sql (policy actualizada para
-- reconocer super_admin además de admin — fix de 2026-08-19, previo a este
-- mapa, encontrado recién ahora al verificar contra producción; ese archivo
-- también toca clients (#88) y category_affinity_rules (#90), no se
-- descarta hasta que ambos confirmen su parte — sus partes de
-- product_stock/stock_movement_log/combo_components ya están muertas,
-- superseded por #83 y #18 respectivamente).
--
-- GAP CONOCIDO, no corregido acá: la policy de lectura NO está scoped por
-- Store (chequea role IN admin/super_admin globalmente, no
-- is_store_admin(store_id)), a pesar de tener store_id con FK e índice
-- propios. Mismo tipo de gap que get_avg_stock_per_product/
-- get_stock_value_per_day en el dominio Stock — fuera de alcance de #84.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_price_history (
  id          BIGSERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sale_price  NUMERIC(12, 2) NOT NULL,
  cost        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id    INTEGER NOT NULL REFERENCES public.stores(id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON public.product_price_history(product_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_price_history_store_id ON public.product_price_history(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- Sin scoping por Store — ver gap conocido arriba.
DROP POLICY IF EXISTS "Admins can view price history" ON public.product_price_history;
CREATE POLICY "Admins can view price history"
  ON public.product_price_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- Sin policies de INSERT/UPDATE/DELETE — solo escribe el trigger
-- log_price_change() (SECURITY DEFINER, bypassea RLS). Tabla append-only
-- por diseño, igual que stock_movement_log.
