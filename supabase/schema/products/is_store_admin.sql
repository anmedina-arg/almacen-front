-- ============================================================================
-- Función: is_store_admin
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- Usada por prácticamente todas las policies RLS de escritura/lectura-admin
-- de todos los dominios (Stock, Orders, Combos, Products, Clients, etc.) —
-- vive acá por la regla de #78 (un archivo por función, aunque se use desde
-- todos los dominios) y porque su primera definición fue en
-- supabase_store_scoping_products.sql (#15). Devuelve true si el caller es
-- store_admin de esa Store, super_admin, o si check_store_id es NULL
-- (puente permisivo, ver ADR-0008 — se cierra en el ticket de contract #22).
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_store_scoping_products.sql (#15).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_store_admin(check_store_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.store_admins sa
      WHERE sa.profile_id = auth.uid() AND sa.store_id = check_store_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR check_store_id IS NULL;
$$;
