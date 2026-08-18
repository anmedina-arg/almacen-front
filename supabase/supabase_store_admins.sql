-- ============================================================================
-- Tabla store_admins + rol super_admin
-- Ticket: #13 (https://github.com/anmedina-arg/almacen-front/issues/13)
-- ============================================================================
-- Reemplaza el rol global `profiles.role = 'admin'` (cualquier admin ve/opera
-- todas las Stores) por una membresía explícita por Store (ver ADR-0005).
-- `super_admin` es el rol de plataforma: opera todas las Stores sin necesitar
-- una fila en `store_admins` por cada una.
--
-- EJECUTAR PRIMERO EN EL PROYECTO DE TEST, correr la suite de integración
-- (store-admins.test.ts), y recién después en producción — mismo flujo que
-- #10/#11.
-- ============================================================================

-- ── 1. Tabla store_admins ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_admins (
  id         SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id   INTEGER NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_admins_profile_id ON public.store_admins(profile_id);
CREATE INDEX IF NOT EXISTS idx_store_admins_store_id ON public.store_admins(store_id);

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

-- Escritura (alta/edición de membership) queda sin policy — default-deny,
-- igual que `stores` en #10 — hasta que el ticket #26 (herramienta de alta
-- manual de Store) defina el flujo. El alta de membership hoy corre a mano
-- vía SQL Editor, como rol postgres (bypassea RLS).

-- ── 2. profiles.role acepta 'super_admin' ──────────────────────────────
-- El nombre de la constraint CHECK no está hardcodeado — se busca en
-- pg_constraint para no asumirlo y romper si en algún momento se renombró.
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'super_admin'));
END $$;

-- ── 3. Migrar el admin actual ───────────────────────────────────────────
-- Andrés (dueño de la plataforma) queda como super_admin, y además con
-- membership admin explícita en Store #1 (market-del-cevil) — cubre ambos
-- roles, confirmado con el usuario.
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'andres.medina.arg@gmail.com';

INSERT INTO public.store_admins (profile_id, store_id, role)
SELECT p.id, s.id, 'admin'
FROM public.profiles p
JOIN public.stores s ON s.slug = 'market-del-cevil'
WHERE p.email = 'andres.medina.arg@gmail.com'
ON CONFLICT (profile_id, store_id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT p.email, p.role, sa.store_id, s.slug AS store_slug, sa.role AS store_role
FROM public.profiles p
LEFT JOIN public.store_admins sa ON sa.profile_id = p.id
LEFT JOIN public.stores s ON s.id = sa.store_id
WHERE p.email = 'andres.medina.arg@gmail.com';
