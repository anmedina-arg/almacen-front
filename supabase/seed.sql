-- ============================================================================
-- Seed de la base local (Docker). Lo aplica `supabase db reset` después de
-- las migraciones generadas (ver scripts/build-local-schema.mjs).
-- ============================================================================
-- Mínimo que los integration tests dan por sentado del entorno (antes lo
-- aportaba el dump de producción restaurado en el proyecto de test):
--   - la Store `market-del-cevil` (backfill-store-id, verify-store-admin-auth,
--     store-admins);
--   - el perfil del admin de la plataforma con role super_admin y membership
--     admin en esa Store (store-admins). Se inserta directo en profiles sin
--     usuario en auth.users — posible porque la FK profiles.id → auth.users
--     no está enforced en local (supabase/local-only/01_drop_auth_users_fks.sql).
--
-- Todo lo demás (productos, órdenes, stock, usuarios de auth) lo crea cada
-- test como fixture descartable con su propio cleanup.
--
-- feature_flags copiados de la fila real de producción al 2026-10-17.
-- ============================================================================

INSERT INTO public.stores (id, slug, name, feature_flags)
VALUES (
  1,
  'market-del-cevil',
  'Market del Cevil',
  '{"pos": true, "pagos": true, "stock": true, "combos": true, "ranking": true, "clientes": true, "informes": true, "dashboard": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- La secuencia arranca después del id fijo de arriba.
SELECT setval('public.stores_id_seq', GREATEST((SELECT MAX(id) FROM public.stores), 1));

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'andres.medina.arg@gmail.com',
  'Andrés Medina (seed local)',
  'super_admin'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_admins (profile_id, store_id, role)
VALUES ('00000000-0000-4000-8000-000000000001', 1, 'admin')
ON CONFLICT (profile_id, store_id) DO NOTHING;
