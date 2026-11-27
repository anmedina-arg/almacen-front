import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isSuperAdminRole } from './isAdminRole';

// Rutas del panel del Platform admin, compartidas por el middleware, las
// páginas y el callback de OAuth (#194).
export const PLATFORM_ADMIN_HOME = '/admin';
export const PLATFORM_ADMIN_LOGIN = '/admin/login';
export const PLATFORM_ADMIN_AUTH_PREFIX = '/admin/auth/';
export const PLATFORM_ADMIN_CALLBACK = `${PLATFORM_ADMIN_AUTH_PREFIX}callback`;

/** ¿El path pertenece al panel /admin? (no confundir con `/<slug>/admin`). */
export function isPlatformAdminPath(pathname: string): boolean {
  return pathname === PLATFORM_ADMIN_HOME || pathname.startsWith(`${PLATFORM_ADMIN_HOME}/`);
}

/** Paths de /admin que se sirven sin sesión: el login y el callback de OAuth. */
export function isPublicPlatformAdminPath(pathname: string): boolean {
  return pathname === PLATFORM_ADMIN_LOGIN || pathname.startsWith(PLATFORM_ADMIN_AUTH_PREFIX);
}

export interface PlatformAdminSession {
  user: User | null;
  isSuperAdmin: boolean;
}

/**
 * Sesión del Platform admin (ADR-0015, #194): el usuario actual y si tiene
 * `profiles.role = 'super_admin'`. Un error al leer el perfil cuenta como
 * "no es super_admin": nunca abre el panel por las dudas.
 */
export async function getPlatformAdminSession(
  supabase: SupabaseClient
): Promise<PlatformAdminSession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isSuperAdmin: false };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) console.error('[admin] no se pudo leer el perfil:', error.message);

  return { user, isSuperAdmin: isSuperAdminRole(profile?.role) };
}

/**
 * Destino después del login de plataforma. Solo acepta paths dentro de
 * /admin (y no el login mismo): `redirectTo` viene de la query string, y
 * cualquier otra cosa lo convertiría en un open redirect.
 */
export function safePlatformAdminRedirect(value: string | null | undefined): string {
  const path = value?.split(/[?#]/)[0];
  // `..` (literal o %2e) saldría de /admin al resolverse, aunque pase el prefijo.
  if (!path || path.startsWith('//') || path.includes('\\') || /\.\.|%2e/i.test(path)) {
    return PLATFORM_ADMIN_HOME;
  }
  if (!isPlatformAdminPath(path) || isPublicPlatformAdminPath(path)) return PLATFORM_ADMIN_HOME;
  return value;
}
