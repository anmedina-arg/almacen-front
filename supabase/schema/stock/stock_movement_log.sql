-- ============================================================================
-- Tabla: stock_movement_log
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Consolidado y verificado contra producción el 2026-08-22.
-- Fuentes originales: supabase_stock_control.sql (creación) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_stock.sql (#17, policies scoped por Store).
--
-- log_initial_stock() y log_stock_change() (ver sus archivos) setean
-- store_id desde NEW.store_id de product_stock (#52) — hasta ese fix, toda
-- fila nueva quedaba con store_id NULL, y por el puente permisivo de
-- is_store_admin() (ADR-0008) cualquier Store admin autenticado podía leer
-- e insertar en el log de movimientos de cualquier Store, no solo la
-- propia. 676 filas huérfanas backfilleadas en producción, ver
-- supabase/backfills/supabase_backfill_stock_movement_log_store_id.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movement_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL DEFAULT 'manual_adjustment',
  previous_qty    NUMERIC(12, 3) NOT NULL,
  new_qty         NUMERIC(12, 3) NOT NULL,
  change_qty      NUMERIC(12, 3) GENERATED ALWAYS AS (new_qty - previous_qty) STORED,
  performed_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id        INTEGER REFERENCES public.stores(id),

  CONSTRAINT chk_movement_type CHECK (
    movement_type IN (
      'manual_adjustment', 'initial_count', 'correction',
      'loss', 'sale', 'purchase', 'return'
    )
  )
);

COMMENT ON TABLE public.stock_movement_log IS 'Historial inmutable de movimientos de stock. Solo INSERT, nunca UPDATE/DELETE.';
COMMENT ON COLUMN public.stock_movement_log.movement_type IS 'Tipo de movimiento. Iniciales: manual_adjustment, initial_count.';
COMMENT ON COLUMN public.stock_movement_log.change_qty IS 'Columna calculada: new_qty - previous_qty. Positivo=entrada, Negativo=salida.';

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_product_id ON public.stock_movement_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_created_at ON public.stock_movement_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_product_date ON public.stock_movement_log(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_type ON public.stock_movement_log(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_performed_by ON public.stock_movement_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_movement_log_store_id ON public.stock_movement_log(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.stock_movement_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view stock log" ON public.stock_movement_log;
CREATE POLICY "Admins can view stock log"
  ON public.stock_movement_log FOR SELECT
  USING (public.is_store_admin(stock_movement_log.store_id));

-- El trigger (SECURITY DEFINER) inserta automáticamente; esta policy también
-- permite inserción manual de un admin si hiciera falta.
DROP POLICY IF EXISTS "System can insert stock log" ON public.stock_movement_log;
CREATE POLICY "System can insert stock log"
  ON public.stock_movement_log FOR INSERT
  WITH CHECK (public.is_store_admin(stock_movement_log.store_id));

-- NO hay policies de UPDATE ni DELETE — el historial es inmutable por diseño.
