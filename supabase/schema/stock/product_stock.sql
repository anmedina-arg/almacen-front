-- ============================================================================
-- Tabla: product_stock
-- Dominio: Stock (#83, spec #81, mapa #74)
-- ============================================================================
-- Consolidado y verificado contra producción (pg_get_functiondef/pg_policies/
-- information_schema, ver docs/agents/schema-changes.md) el 2026-08-22.
-- Fuentes originales: supabase_stock_control.sql (creación) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_stock.sql (#17, policies scoped por Store) +
-- supabase_fix_stock_scoping_gaps.sql (#17 code review — sin cambios sobre
-- esta tabla en particular, solo sobre las RPCs).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_stock (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      NUMERIC(12, 3) NOT NULL DEFAULT 0,
  min_stock     NUMERIC(12, 3) DEFAULT NULL,
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes         TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store_id      INTEGER REFERENCES public.stores(id),

  CONSTRAINT uq_product_stock_product_id UNIQUE (product_id),
  CONSTRAINT chk_product_stock_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_product_stock_min_stock CHECK (min_stock IS NULL OR min_stock >= 0)
);

COMMENT ON TABLE public.product_stock IS 'Stock actual de cada producto. Control manual de inventario.';
COMMENT ON COLUMN public.product_stock.quantity IS 'Cantidad actual en stock. NUMERIC(12,3) para soportar unidades y pesos.';
COMMENT ON COLUMN public.product_stock.min_stock IS 'Umbral minimo para alertas de stock bajo. NULL = sin alerta.';
COMMENT ON COLUMN public.product_stock.updated_by IS 'UUID del admin que realizo la ultima actualizacion.';
COMMENT ON COLUMN public.product_stock.notes IS 'Nota opcional sobre la ultima actualizacion (ej: motivo del ajuste).';

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_stock_low_stock
  ON public.product_stock(quantity, min_stock)
  WHERE min_stock IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_stock_store_id ON public.product_stock(store_id);

-- ── Trigger: updated_at ──────────────────────────────────────────────────
-- update_updated_at_column() es una función compartida entre varias tablas
-- (products, stores, categories, ...) — su definición no pertenece a este
-- dominio, se relocaliza en el ticket de Store/Platform (#87). Acá solo se
-- declara el trigger que la usa.
DROP TRIGGER IF EXISTS update_product_stock_updated_at ON public.product_stock;
CREATE TRIGGER update_product_stock_updated_at
  BEFORE UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── Triggers de auditoría: ver log_initial_stock.sql y log_stock_change.sql ──
DROP TRIGGER IF EXISTS on_stock_created ON public.product_stock;
CREATE TRIGGER on_stock_created
  AFTER INSERT ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.log_initial_stock();

DROP TRIGGER IF EXISTS on_stock_change ON public.product_stock;
CREATE TRIGGER on_stock_change
  AFTER UPDATE ON public.product_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_change();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Lectura pública sin restricción — sostiene fetchPublicProducts.ts (catálogo
-- público, visitantes anónimos). NO acotar a is_store_admin() ni a
-- autenticados: se investigó y revirtió en #17 (ver supabase_fix_stock_scoping_gaps.sql),
-- hacerlo rompe el catálogo público. El aislamiento por Store de esta lectura
-- se resuelve a nivel aplicación, no en RLS (mismo patrón que products).
DROP POLICY IF EXISTS "Anyone can view stock" ON public.product_stock;
CREATE POLICY "Anyone can view stock"
  ON public.product_stock FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert stock" ON public.product_stock;
CREATE POLICY "Admins can insert stock"
  ON public.product_stock FOR INSERT
  WITH CHECK (public.is_store_admin(product_stock.store_id));

DROP POLICY IF EXISTS "Admins can update stock" ON public.product_stock;
CREATE POLICY "Admins can update stock"
  ON public.product_stock FOR UPDATE
  USING (public.is_store_admin(product_stock.store_id))
  WITH CHECK (public.is_store_admin(product_stock.store_id));

DROP POLICY IF EXISTS "Admins can delete stock" ON public.product_stock;
CREATE POLICY "Admins can delete stock"
  ON public.product_stock FOR DELETE
  USING (public.is_store_admin(product_stock.store_id));

-- Puente permisivo (is_store_admin(NULL) = true) aplica a las policies de
-- escritura mientras existan filas legacy con store_id NULL — ver ADR-0008.
-- Se cierra en el ticket de contract (#22).
