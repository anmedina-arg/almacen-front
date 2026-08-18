import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';

// Compartido por verifyAdminAuth y verifyStoreAdminAuth — ambos necesitan un
// client de Supabase atado a las cookies del request actual, fuera de eso no
// comparten lógica (cada uno resuelve un criterio de autorización distinto).
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

export async function verifyAdminAuth(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  const supabase = await createCookieBasedSupabaseClient();

  // Verificar usuario (más seguro que getSession en servidor)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { isAdmin: false, userId: null, error: 'No authenticated' };
  }

  // Obtener perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, userId: user.id, error: 'Profile not found' };
  }

  // super_admin (dueño de la plataforma, #13) es un superset de admin: debe
  // poder administrar cualquier Store, incluida market-del-cevil, sin
  // necesitar además una membership en store_admins para cada una.
  return {
    isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
    userId: user.id,
    error: null,
  };
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

  // maybeSingle (no single, a diferencia de verifyAdminAuth): "sin profile"
  // es un resultado válido a distinguir de un error real de query, ya que
  // esta función también se llama con ids de test sembrados a mano.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { isStoreAdmin: false, storeId, error: 'Profile not found' };
  }

  // super_admin (#13) opera cualquier Store sin necesitar membership.
  if (profile.role === 'super_admin') {
    return { isStoreAdmin: true, storeId, error: null };
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

  return { isStoreAdmin: membership != null, storeId, error: null };
}

// Aditivo (#14): ningún call site existente cambia todavía — verifyAdminAuth
// sigue intacto y en uso. Reemplaza el chequeo de rol global por membership
// scoped a la Store activa (o super_admin), resuelta acá vía slug en vez de
// depender del header x-store-slug que setea el middleware (evita otro
// lookup: [store]/layout.tsx y esta función ya reciben el slug como route
// param).
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

export function hasRole(user: unknown, role: 'admin' | 'user'): boolean {
  const userObj = user as { user_metadata?: { role?: string }; role?: string } | null;
  return userObj?.user_metadata?.role === role || userObj?.role === role;
}

export function isAdmin(user: unknown): boolean {
  return hasRole(user, 'admin');
}
