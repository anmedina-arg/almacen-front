-- ============================================================================
-- FIX: Trigger para crear perfiles con Google OAuth
-- ============================================================================
-- Este script mejora el trigger para manejar correctamente la metadata de Google
-- Ejecutar en: Supabase SQL Editor
-- ============================================================================

-- Eliminar el trigger anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear función mejorada que maneja metadata de Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  -- Intentar obtener el nombre de diferentes formas:
  -- 1. full_name (para email/password)
  -- 2. name (para Google OAuth)
  -- 3. Concatenar given_name + family_name (para algunos providers OAuth)
  -- 4. email como fallback
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

  -- Obtener avatar si existe (Google OAuth lo provee)
  user_avatar := NEW.raw_user_meta_data->>'avatar_url';

  -- Insertar perfil (ON CONFLICT para evitar duplicados)
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
    -- Log el error pero no fallar la creación del usuario
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SCRIPT DE REPARACIÓN PARA USUARIOS EXISTENTES
-- ============================================================================
-- Si ya tienes usuarios de Google OAuth sin perfil, ejecuta esto:

-- Ver usuarios sin perfil
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as google_name,
  u.raw_user_meta_data->>'avatar_url' as google_avatar,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Crear perfiles para usuarios existentes sin perfil
INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    CONCAT(
      u.raw_user_meta_data->>'given_name',
      ' ',
      u.raw_user_meta_data->>'family_name'
    ),
    SPLIT_PART(u.email, '@', 1)
  ) as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  'user' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que todos los usuarios tengan perfil:
SELECT
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT p.id) as users_with_profile,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT p.id) as missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Ver perfiles creados
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.role,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. El trigger ahora maneja correctamente:
--    - Email/Password signup (usa raw_user_meta_data->>'full_name')
--    - Google OAuth (usa raw_user_meta_data->>'name')
--    - Otros providers OAuth (concatena given_name + family_name)
--    - Fallback al email si no hay nombre disponible
--
-- 2. El trigger usa ON CONFLICT para evitar errores de duplicados
--
-- 3. Si el trigger falla, logea un warning pero no impide la creación del usuario
--
-- 4. El script de reparación crea perfiles para usuarios existentes sin perfil
-- ============================================================================
