import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';

// Usado por verifyStoreAdminAuth — necesita un client de Supabase atado a
// las cookies del request actual.
async function createCookieBasedSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can't modify cookies in some contexts
          }
        },
      },
    }
  );
}

// Predicado compartido (#43): único punto de verdad para "¿puede este
// usuario administrar esta Store?" — Store admin (membership en
// store_admins) o Platform admin (profiles.role = 'super_admin', ver
// ADR-0005). Antes de #43 esta misma decisión estaba reimplementada de
// forma independiente en 3 lugares (resolveStoreAdminStatus, HeaderClient,
// AdminPanelLink) con su propia query a profiles y su propio chequeo de rol
// hardcodeado — encontrado arreglando un lockout de producción del Platform
// admin (#13): se corrigió un lugar primero, y quedaron otros rotos hasta
// un segundo pase, porque nadie sabía que existían por separado.
//
// Puro y sync a propósito: server (resolveStoreAdminStatus) y cliente
// (HeaderClient) resuelven role/membership con clients de Supabase
// distintos (cookie-bound vs. browser), pero la decisión final —dado un rol
// y si hay membership— es la misma en los dos lados. Este es el seam que
// se testea en aislamiento, sin red.
export function isAdminRole(role: string | null | undefined, hasStoreMembership: boolean): boolean {
  if (role === 'super_admin') return true;
  return hasStoreMembership;
}

// Núcleo de verifyStoreAdminAuth, separado del wrapper de cookies()/getUser()
// de Next.js para poder testearlo directo con un client de service_role
// contra el proyecto de test (cookies() solo funciona dentro de un request
// real, no se puede invocar desde un test de Vitest).
export async function resolveStoreAdminStatus(
  supabase: SupabaseClient,
  userId: string,
  storeSlug: string
): Promise<{
  isStoreAdmin: boolean;
  storeId: number | null;
  error: string | null;
}> {
  const storeId = await getStoreIdBySlug(supabase, storeSlug);

  if (storeId == null) {
    return { isStoreAdmin: false, storeId: null, error: 'Store not found' };
  }

  // maybeSingle (no single): "sin profile" es un resultado válido a
  // distinguir de un error real de query, ya que esta función también se
  // llama con ids de test sembrados a mano.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { isStoreAdmin: false, storeId, error: 'Profile not found' };
  }

  // super_admin (#13) opera cualquier Store sin necesitar membership — evita
  // la query de abajo (isAdminRole ignora el 2do arg cuando el rol ya
  // decide por sí solo).
  if (profile.role === 'super_admin') {
    return { isStoreAdmin: isAdminRole(profile.role, false), storeId, error: null };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('store_admins')
    .select('id')
    .eq('profile_id', userId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (membershipError) {
    return { isStoreAdmin: false, storeId, error: membershipError.message };
  }

  return { isStoreAdmin: isAdminRole(profile.role, membership != null), storeId, error: null };
}

// Única función de autorización admin del repo desde #22 — reemplazó por
// completo al viejo verifyAdminAuth() (chequeo de rol global, sin Store).
// Resuelve membership scoped a la Store activa (o super_admin) vía slug en
// vez de depender del header x-store-slug que setea el middleware (evita
// otro lookup: [store]/layout.tsx y esta función ya reciben el slug como
// route param).
export async function verifyStoreAdminAuth(storeSlug: string): Promise<{
  isStoreAdmin: boolean;
  storeId: number | null;
  userId: string | null;
  error: string | null;
}> {
  const supabase = await createCookieBasedSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { isStoreAdmin: false, storeId: null, userId: null, error: 'No authenticated' };
  }

  const status = await resolveStoreAdminStatus(supabase, user.id, storeSlug);
  return { ...status, userId: user.id };
}
