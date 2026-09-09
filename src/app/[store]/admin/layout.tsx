import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminTabBar } from '@/features/admin/components/AdminTabBar';
import { getStoreBySlug } from '@/lib/store/getStoreBySlug';
import { getStoreFeatureFlags } from '@/lib/store/getStoreFeatureFlags';
import { resolveFeatureFlags } from '@/lib/store/featureFlags';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { FeatureFlagsProvider } from '@/features/admin/context/FeatureFlagsContext';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;

  // Membership en store_admins (o super_admin), no profiles.role global — ver
  // #13/ADR-0005 y #63. Un admin de Store nueva se registra con
  // profiles.role='user' por default y solo tiene su rol en
  // store_admins.role, así que el chequeo viejo (profiles.role global) lo
  // dejaba afuera de su propio panel.
  //
  // getStoreBySlug/getStoreFeatureFlags no dependen del resultado de la
  // auth (solo necesitan el slug) — se corren en paralelo con
  // verifyStoreAdminAuth en vez de esperarla (#144, spec #139). Siguen
  // recibiendo supabaseServer (no el cliente cookie-based de la auth) a
  // propósito: cache() de React memoiza por identidad del cliente, y
  // supabaseServer es el mismo objeto que ya usa [store]/layout.tsx para
  // el mismo slug — cambiarlo acá duplicaría esa query en vez de seguir
  // compartiéndola.
  // .catch() individuales acá a propósito (code review de #144): sin
  // esto, Promise.all falla atómico — un error transitorio en
  // getStoreBySlug/getStoreFeatureFlags tiraría abajo el resultado de
  // verifyStoreAdminAuth también, convirtiendo lo que debía ser un
  // redirect limpio (usuario no autenticado/no admin) en un 500. Ninguno
  // de los dos redirects de abajo usa storeData/flags, así que un
  // fallback seguro acá no cambia el comportamiento observable de la
  // decisión de auth. Se loguea antes de caer al fallback — que quede
  // silencioso sería peor (2da pasada de code review de #144).
  //
  // Cobertura parcial, documentada a propósito en vez de asumida:
  // getStoreBySlug comparte el mismo cache() (mismo client + slug) que
  // [store]/layout.tsx, el layout padre que envuelve a este — si esa
  // llamada de más arriba falla, revienta ahí antes de que este .catch()
  // llegue a correr. Y getStoreFeatureFlags también se llama sin guarda
  // en varias pages de /admin/* (ej. admin/page.tsx) que comparten esa
  // misma promesa cacheada — este fallback no las protege a ellas. Volver
  // resiliente todo ese árbol excede el alcance de "paralelizar el guard
  // de auth admin" (#144); queda como hallazgo para un ticket aparte.
  const [{ isStoreAdmin, userId }, storeData, flags] = await Promise.all([
    verifyStoreAdminAuth(store),
    getStoreBySlug(supabaseServer, store).catch((err) => {
      console.error('[AdminLayout] getStoreBySlug error:', err instanceof Error ? err.message : err);
      return null;
    }),
    getStoreFeatureFlags(supabaseServer, store).catch((err) => {
      console.error('[AdminLayout] getStoreFeatureFlags error:', err instanceof Error ? err.message : err);
      return resolveFeatureFlags(undefined);
    }),
  ]);

  if (!userId) {
    redirect(`/${store}/login?redirectTo=/${store}/admin/products`);
  }

  if (!isStoreAdmin) {
    redirect(`/${store}?error=unauthorized`);
  }

  const storeName = storeData?.name ?? 'la tienda';

  return (
    <FeatureFlagsProvider flags={flags}>
      <div className="min-h-screen bg-gray-50">
        {/* Header del admin */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Panel de Administración</h1>
              <p className="text-sm text-gray-600">Gestión de productos - {storeName}</p>
            </div>
            <Link
              href={`/${store}`}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Volver al sitio
            </Link>
          </div>
        </div>

        {/* Tab bar de navegación */}
        <AdminTabBar />

        {/* Contenido */}
        <div className="container mx-auto px-4 py-4">{children}</div>
      </div>
    </FeatureFlagsProvider>
  );
}
