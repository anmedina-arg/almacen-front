-- ============================================================================
-- Función: is_store_admin
-- Dominio: Products/Categories (#85, spec #81, mapa #74)
-- ============================================================================
-- Usada por prácticamente todas las policies RLS de escritura/lectura-admin
-- de todos los dominios (Stock, Orders, Combos, Products, Clients, etc.) —
-- vive acá por la regla de #78 (un archivo por función, aunque se use desde
-- todos los dominios) y porque su primera definición fue en
-- supabase_store_scoping_products.sql (#15). Devuelve true si el caller es
-- store_admin de esa Store, o super_admin.
--
-- Puente permisivo (`OR check_store_id IS NULL`, ver ADR-0008) removido en
-- #22: las 13 tablas de negocio ya están en store_id NOT NULL (backfill de
-- las últimas filas huérfanas — #22, #46, #52 — más las tablas que ya
-- estaban limpias desde #11), así que check_store_id nunca debería ser NULL
-- viniendo de una columna real de la base. Si igual llega NULL (bug de
-- resolución de storeId upstream, no una fila legacy), ahora se deniega en
-- vez de dejarse pasar — antes era exactamente el escenario contrario:
-- cualquier fila con store_id NULL era gestionable por cualquier store
-- admin autenticado, no solo el dueño real.
--
-- Verificado con pg_get_functiondef contra producción el 2026-08-22 — sin
-- cambios desde supabase_store_scoping_products.sql (#15) hasta este #22.
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
    );
$$;
