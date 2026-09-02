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
-- supabase_store_whatsapp.sql (#24, whatsapp_number) +
-- #23 (feature_flags — reabre ADR-0002, ver ADR-0007: columna DB en vez de
-- archivo estático versionado, porque el deployment es compartido por
-- todas las Stores, ver ADR-0001).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stores (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logo_url   TEXT,
  whatsapp_number TEXT,
  feature_flags JSONB NOT NULL DEFAULT '{}'
);

COMMENT ON COLUMN public.stores.logo_url IS
  'URL absoluta del logo de la Store. NULL = usa el asset genérico compartido (ver DEFAULT_LOGO_URL en el código).';
COMMENT ON COLUMN public.stores.whatsapp_number IS
  'Número de WhatsApp (con código de país, sin +) para recibir pedidos de esta Store. NULL = usa NEXT_PUBLIC_WHATSAPP_NUMBER como fallback.';
COMMENT ON COLUMN public.stores.feature_flags IS
  'Catálogo de 7 keys booleanas por Store (#23): stock, clientes, pagos, ranking, pos, dashboard, informes. Todas requeridas al escribir — omitir una es un estado inválido — pero src/lib/store/featureFlags.ts resuelve cualquier key faltante a false (apagado) para no romper si una fila queda parcialmente seteada. Catálogo/productos/pedidos-WhatsApp/ventas siempre están encendidos, no son flags — combos tampoco lo es desde #117 (ADR-0013), pasó a ser siempre-encendida junto con Producto Surtido. Escritura manual vía SQL Editor (ADR-0006) — sin UI de super-admin todavía.';

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
-- (#10/#12/#13). El alta de Stores pasa por provision_store() (#26, ADR-0006),
-- llamada con el service_role key (bypassea RLS por rol de Postgres) — ver
-- supabase/schema/store/provision_store.sql. La edición sigue siendo manual
-- vía SQL Editor, como rol postgres.
