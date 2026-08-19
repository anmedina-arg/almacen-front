-- ============================================================================
-- Logo propio por Store (#50)
-- ============================================================================
-- Migración puramente aditiva: agrega logo_url (nullable) a stores. NULL
-- significa "sin logo propio configurado" -> el código usa el asset genérico
-- compartido actual como fallback (DEFAULT_LOGO_URL en
-- src/lib/store/defaultLogo.ts), así que ninguna Store existente cambia de
-- comportamiento hasta que se le cargue un logo propio.
--
-- Alta/edición del logo por Store es manual vía SQL Editor por ahora (mismo
-- patrón que el resto del alta de Stores, ADR-0006) — no hay UI de admin
-- para esto en este primer corte.
--
-- stores ya tiene RLS habilitada con policy "Anyone can read stores" (ver
-- supabase_stores_read_policy.sql) que cubre todas las columnas — no hace
-- falta tocar RLS para esta columna nueva.
-- ============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.stores.logo_url IS
  'URL absoluta del logo de la Store. NULL = usa el asset genérico compartido (ver DEFAULT_LOGO_URL en el código).';

-- ============================================================================
-- Ejemplo para cargar el logo de una Store (correr a mano cuando Andrés
-- tenga el asset final, reemplazando <URL> y <SLUG>):
-- ============================================================================
-- UPDATE public.stores SET logo_url = '<URL>' WHERE slug = '<SLUG>';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT slug, name, logo_url FROM public.stores ORDER BY id;
