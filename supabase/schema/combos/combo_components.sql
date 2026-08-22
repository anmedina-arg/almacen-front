-- ============================================================================
-- Tabla: combo_components
-- Dominio: Combos (#86, spec #81, mapa #74)
-- ============================================================================
-- Cada fila es un componente de un combo: cuánto de component_product_id
-- entra en una unidad de combo_product_id. Verificado contra producción el
-- 2026-08-22. Fuentes: supabase_combos.sql (PART 1b, creación) +
-- supabase_multitenant_schema_expand.sql (store_id) +
-- supabase_store_scoping_combos.sql (#18, policy de escritura scoped por
-- Store).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.combo_components (
  id                    BIGSERIAL PRIMARY KEY,
  combo_product_id      INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity              NUMERIC(12, 3) NOT NULL DEFAULT 1,
  store_id              INTEGER REFERENCES public.stores(id),

  UNIQUE (combo_product_id, component_product_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_combo_components_combo ON public.combo_components(combo_product_id);
CREATE INDEX IF NOT EXISTS idx_combo_components_store_id ON public.combo_components(store_id);

-- ── Trigger ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_combo_cost ON public.combo_components;
CREATE TRIGGER trg_sync_combo_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.combo_components
  FOR EACH ROW EXECUTE FUNCTION sync_combo_cost();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.combo_components ENABLE ROW LEVEL SECURITY;

-- Lectura pública sin restricción — sostiene el catálogo público:
-- fetchPublicProducts.ts lee combo_components server-side con la anon key
-- (sin login) y ya filtra por store_id a nivel aplicación (vía comboIds
-- derivados de products.store_id). Achicar esta policy rompería esa
-- lectura para cualquier visitante anónimo — mismo criterio que "Anyone
-- can view stock" en Stock (#17/#83). Verificado en #18 antes de escribir
-- la policy de abajo, no repetido el error de #17.
DROP POLICY IF EXISTS "Public can view combo_components" ON public.combo_components;
CREATE POLICY "Public can view combo_components"
  ON public.combo_components FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage combo_components" ON public.combo_components;
CREATE POLICY "Admins can manage combo_components"
  ON public.combo_components FOR ALL
  USING (public.is_store_admin(combo_components.store_id))
  WITH CHECK (public.is_store_admin(combo_components.store_id));

-- Puente permisivo (is_store_admin(NULL) = true) aplica a la policy de
-- escritura mientras existan filas legacy con store_id NULL — ver
-- ADR-0008. Se cierra en el ticket de contract (#22). En la práctica
-- combo_components.store_id ya está 100% backfilleada (80/80 filas,
-- verificado en #18) — el puente queda sin filas que cubrir hoy.
