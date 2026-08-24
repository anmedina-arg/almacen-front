-- ============================================================================
-- Función trigger: handle_new_user + trigger on_auth_user_created
-- Dominio: Store/Platform (#87, spec #81, mapa #74)
-- ============================================================================
-- OBJETO DE RIESGO PARTICULAR: el trigger vive sobre auth.users, un schema
-- que administra Supabase Auth, no `public`. A diferencia de todo trigger
-- del resto de este mapa, acá el CREATE TRIGGER se declara en el mismo
-- archivo que la función (no junto a la tabla, porque `auth.users` no tiene
-- ni va a tener un canónico propio en este repo — es infraestructura de
-- Supabase, no una tabla de negocio nuestra).
--
-- Crea automáticamente el profile de un usuario nuevo al registrarse, leyendo
-- el nombre/avatar desde raw_user_meta_data con fallbacks para cubrir
-- email/password, Google OAuth, y otros providers OAuth. SECURITY DEFINER +
-- EXCEPTION WHEN OTHERS: si falla la creación del profile, loguea un
-- warning pero NO impide que el signup en auth.users se complete — un
-- profile faltante se puede reparar después, un signup roto no.
--
-- Verificado con pg_get_functiondef/pg_get_triggerdef contra producción el
-- 2026-08-22 — la versión vigente es la de supabase_fix_oauth_trigger.sql
-- (maneja Google OAuth), NO la original simple de supabase_setup.sql.
--
-- GAP DE ENTORNO, no corregido acá: el trigger on_auth_user_created NO
-- existe en el proyecto de test (confirmado: 0 filas en pg_trigger para
-- auth.users) — solo en producción. No introducido por #87; documentado
-- acá porque es la primera vez que se verifica explícitamente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    CONCAT(
      NEW.raw_user_meta_data->>'given_name',
      ' ',
      NEW.raw_user_meta_data->>'family_name'
    ),
    SPLIT_PART(NEW.email, '@', 1)
  );

  user_avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_avatar,
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
