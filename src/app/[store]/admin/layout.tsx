import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminTabBar } from '@/features/admin/components/AdminTabBar';
import { getStoreBySlug } from '@/lib/store/getStoreBySlug';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';

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
  const { isStoreAdmin, userId } = await verifyStoreAdminAuth(store);

  if (!userId) {
    redirect(`/${store}/login?redirectTo=/${store}/admin/products`);
  }

  if (!isStoreAdmin) {
    redirect(`/${store}?error=unauthorized`);
  }

  const storeData = await getStoreBySlug(supabaseServer, store);
  const storeName = storeData?.name ?? 'la tienda';

  return (
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
  );
}
