-- ============================================================================
-- Tabla: stores
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- Verificado contra producción el 2026-08-22. Fuentes:
-- supabase_multitenant_schema_expand.sql (#10, creación original — es la
-- fuente de esta tabla en sí, no se descarta hasta que las otras 13 tablas
-- de ese archivo confirmen su parte, ver su checklist) +
-- supabase_stores_read_policy.sql (#12, lectura pública) +
-- supabase_store_logo.sql (#50, logo_url) +
-- supabase_store_whatsapp.sql (#24, whatsapp_number).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stores (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logo_url   TEXT,
  whatsapp_number TEXT
);

COMMENT ON COLUMN public.stores.logo_url IS
  'URL absoluta del logo de la Store. NULL = usa el asset genérico compartido (ver DEFAULT_LOGO_URL en el código).';
COMMENT ON COLUMN public.stores.whatsapp_number IS
  'Número de WhatsApp (con código de país, sin +) para recibir pedidos de esta Store. NULL = usa NEXT_PUBLIC_WHATSAPP_NUMBER como fallback.';

-- ── Trigger: updated_at ──────────────────────────────────────────────────
-- update_updated_at_column() es la función genérica del dominio Products
-- (#85) — vive en supabase/schema/products/update_updated_at_column.sql.
-- Acá solo se declara el trigger que la usa.
DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- El middleware y src/app/[store]/ necesitan resolver el slug de la URL sin
-- sesión admin — cualquier visitante público navegando el catálogo.
DROP POLICY IF EXISTS "Anyone can read stores" ON public.stores;
CREATE POLICY "Anyone can read stores"
  ON public.stores FOR SELECT USING (true);

-- Sin policies de INSERT/UPDATE/DELETE — default-deny total a propósito
-- (#10/#12/#13). El alta/edición de Stores es manual vía SQL Editor, como
-- rol postgres (bypassea RLS) — ver ADR-0006. #13 dejó pendiente el ticket
-- #26 (herramienta de alta manual de Store) para definir ese flujo.
