-- ============================================================================
-- SOLO BASE LOCAL (Docker) — nunca aplicar en producción.
-- ============================================================================
-- El trigger `on_auth_user_created` (auth.users → handle_new_user → crea la
-- fila en profiles) existe en producción y lo crea el canónico
-- supabase/schema/store/handle_new_user.sql. En el entorno de test se decidió
-- explícitamente NO tenerlo (#87, ver "Gaps conocidos" en
-- supabase/schema/store/README.md): los integration tests crean el usuario
-- con auth.admin.createUser y después insertan ellos mismos la fila de
-- profiles con el role que necesitan. Con el trigger activo ese insert falla
-- con "duplicate key value violates unique constraint profiles_pkey"
-- (confirmado el 2026-10-17: 16 archivos de test rotos por esta sola causa).
--
-- Mientras los fixtures hagan `insert` y no `upsert`, la base local replica
-- la decisión de #87. Si algún día los fixtures pasan a upsert, borrar este
-- archivo y la base local queda idéntica a producción también en esto.
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
