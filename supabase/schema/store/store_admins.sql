-- ============================================================================
-- Tabla: store_admins
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- Membresía explícita de un profile como admin de una Store (ver ADR-0005 —
-- reemplaza el rol global profiles.role = 'admin'). super_admin (rol de
-- plataforma en profiles.role, ver profiles.sql) opera todas las Stores sin
-- necesitar una fila acá por cada una.
--
-- Verificado contra producción el 2026-08-22. Fuente: supabase_store_admins.sql
-- (#13, creación original — el resto de ese archivo, la migración
-- one-time del super_admin fundador y su membership inicial, es historia
-- de datos ya aplicada, no schema; se archiva junto con el resto).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_admins (
  id         SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id   INTEGER NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (profile_id, store_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_admins_profile_id ON public.store_admins(profile_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_store_id ON public.store_admins(store_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own memberships" ON public.store_admins;
CREATE POLICY "Users can read own memberships"
  ON public.store_admins FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can read all memberships" ON public.store_admins;
CREATE POLICY "Super admins can read all memberships"
  ON public.store_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Sin policies de INSERT/UPDATE/DELETE — default-deny total a propósito,
-- igual que stores (#10/#13). El alta de membership pasa por
-- provision_store() (#26), llamada con el service_role key (bypassea RLS
-- por rol de Postgres) — ver supabase/schema/store/provision_store.sql.
