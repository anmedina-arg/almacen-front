import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { isAdminRole } from './isAdminRole';
import { logPerf } from '@/lib/observability/logPerf';

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
  // getStoreIdBySlug y la query de profiles no dependen entre sí (el
  // primero solo necesita storeSlug, el segundo solo userId) — se corren
  // en paralelo (#144, spec #139). Costo aceptado: si storeId termina
  // siendo null, la query de profiles ya se disparó igual (antes cortaba
  // acá sin tocarla) — caso raro (slug inválido), a cambio de no pagar la
  // secuencia completa en el camino feliz, que es el que corre siempre.
  const [storeId, profileResult] = await Promise.all([
    getStoreIdBySlug(supabase, storeSlug),
    // maybeSingle (no single): "sin profile" es un resultado válido a
    // distinguir de un error real de query, ya que esta función también se
    // llama con ids de test sembrados a mano.
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);
  const { data: profile, error: profileError } = profileResult;

  if (storeId == null) {
    return { isStoreAdmin: false, storeId: null, error: 'Store not found' };
  }

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
  const startedAt = Date.now();
  // Cliente cookie-based canónico (src/lib/supabase/server.ts) — antes esta
  // función tenía su propia copia casi idéntica de esta misma función
  // (createCookieBasedSupabaseClient), duplicación real que #144 elimina.
  const supabase = await createSupabaseServerClient();
  let resolvedStoreId: number | null = null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { isStoreAdmin: false, storeId: null, userId: null, error: 'No authenticated' };
    }

    const status = await resolveStoreAdminStatus(supabase, user.id, storeSlug);
    resolvedStoreId = status.storeId;
    return { ...status, userId: user.id };
  } finally {
    // Instrumentación temporal (#141, spec #139) — mide el guard que
    // gatea la entrada a /admin, ver docs/diagnostics/2026-09-perf.md.
    logPerf(supabase, 'admin_layout_guard', Date.now() - startedAt, resolvedStoreId);
  }
}
