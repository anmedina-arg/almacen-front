-- ============================================================================
-- Función trigger: handle_updated_at
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- Específica de profiles.updated_at (ver profiles.sql). No confundir con
-- update_updated_at_column() (Products #85), la función genérica que usan
-- stores/products/categories/subcategories/product_stock — mismo cuerpo,
-- función distinta, deuda técnica preexistente no introducida acá.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_setup.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
