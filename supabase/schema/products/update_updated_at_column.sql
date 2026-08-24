-- ============================================================================
-- Función trigger: update_updated_at_column
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- Genérica: setea NEW.updated_at = NOW(). Usada por products, categories,
-- subcategories (este dominio), y también por stores (#87) y product_stock
-- (Stock #83). No confundir con handle_updated_at() (dominio Store/Platform,
-- #87), una función distinta y más antigua, específica de profiles.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_rls_products.sql (creación original).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
