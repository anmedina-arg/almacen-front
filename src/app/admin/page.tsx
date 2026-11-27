import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import {
  getPlatformAdminSession,
  PLATFORM_ADMIN_LOGIN,
} from '@/features/auth/utils/platformAdmin';
import {
  getOrdersCountByStore,
  type StoreOrdersCount,
} from '@/features/store/services/getOrdersCountByStore';

export const metadata: Metadata = {
  title: 'Panel de plataforma',
  robots: { index: false, follow: false },
};

// Depende de la sesión (cookies): nunca se cachea ni se prerenderiza.
export const dynamic = 'force-dynamic';

/**
 * Panel del Platform admin (#151, ADR-0015). Primera pantalla: pedidos por
 * Store en una sola tabla. Sin sesión, el middleware manda a /admin/login
 * (#194); con sesión pero sin rol `super_admin`, 404, igual que si la ruta
 * no existiera.
 */
export default async function PlatformAdminPage() {
  const supabase = await createSupabaseServerClient();

  // Sin sesión el middleware ya manda a /admin/login (#194); esto cubre el
  // caso de que la sesión no se pueda leer acá aunque haya pasado por él.
  const { user, isSuperAdmin } = await getPlatformAdminSession(supabase);
  if (!user) redirect(PLATFORM_ADMIN_LOGIN);
  if (!isSuperAdmin) notFound();

  let stores: StoreOrdersCount[];
  try {
    stores = await getOrdersCountByStore(supabase);
  } catch (error) {
    // Si la RPC rechaza por rol, tratarlo igual que el chequeo de arriba (404):
    // /admin no debe distinguirse de una ruta inexistente.
    if (error instanceof Error && error.message.includes('Forbidden')) notFound();
    console.error('[admin] get_orders_count_by_store falló:', error);
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Pedidos por Store</h1>
        <p className="mt-4 text-sm text-red-700">
          No se pudieron cargar los pedidos. Recargá la página; si sigue fallando, revisá los
          logs del servidor.
        </p>
      </main>
    );
  }
  const grandTotal = stores.reduce((sum, s) => sum + s.totalOrders, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Pedidos por Store</h1>
      <p className="mt-1 text-sm text-gray-600">
        {stores.length} {stores.length === 1 ? 'Store' : 'Stores'} · {grandTotal}{' '}
        {grandTotal === 1 ? 'pedido' : 'pedidos'} en total (incluye cancelados)
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Store</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Pendientes</th>
              <th className="px-4 py-3 text-right font-semibold">Confirmados</th>
              <th className="px-4 py-3 text-right font-semibold">Cancelados</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.storeId} className="border-t border-gray-200">
                <td className="px-4 py-3">
                  <span className="font-medium">{s.storeName}</span>{' '}
                  <span className="text-gray-500">/{s.storeSlug}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {s.totalOrders}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.pendingOrders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.confirmedOrders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.cancelledOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
