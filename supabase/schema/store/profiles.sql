-- ============================================================================
-- Tabla: profiles
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- Extiende auth.users (Supabase Auth) con datos de aplicación: nombre, rol,
-- avatar. Sin store_id — no es una tabla de negocio por-Store, un profile
-- puede ser admin de varias Stores vía store_admins (ver store_admins.sql).
--
-- Verificado contra producción el 2026-08-22. Fuentes: supabase_setup.sql
-- (creación original) + supabase_store_admins.sql (#13, CHECK de role
-- ampliado para aceptar 'super_admin').
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT,
  avatar_url TEXT,
  role       TEXT NOT NULL DEFAULT 'user'
    CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ── Trigger ──────────────────────────────────────────────────────────────
-- handle_updated_at() es específica de este dominio — no confundir con
-- update_updated_at_column() (Products #85, usada por stores/products/etc).
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- "Public profiles are viewable" (USING true) y "Users can view own
-- profile" (USING auth.uid() = id) conviven como dos policies SELECT
-- separadas — la primera ya cubre a la segunda (RLS es permisiva por
-- policy, se OR-ean), verificado tal cual está en producción, no se
-- consolida acá.
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
