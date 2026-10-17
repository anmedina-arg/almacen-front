-- ============================================================================
-- SOLO BASE LOCAL (Docker) — nunca aplicar en producción.
-- ============================================================================
-- Replica la diferencia deliberada que ya tenía el proyecto Supabase de test
-- (ver docs/ops/poblar-test-db.md): las 3 FKs a auth.users no se enforcean
-- en el entorno de test. Los integration tests dependen de eso — siembran
-- `profiles` con un UUID random sin pasar por auth (verify-store-admin-auth,
-- provision-store, store-scoping-product-price-history), y el seed local
-- hace lo mismo para el super_admin.
--
-- Las columnas existen igual; solo no tienen la constraint.
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.orders   DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders   DROP CONSTRAINT IF EXISTS orders_confirmed_by_fkey;
