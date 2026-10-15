import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
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
 * Store en una sola tabla. Cualquiera que no sea `super_admin` ve un 404,
 * igual que si la ruta no existiera — sin login propio de plataforma por
 * ahora: la sesión es la del login de cualquier Store.
 */
export default async function PlatformAdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) console.error('[admin] no se pudo leer el perfil:', profileError.message);
  if (profile?.role !== 'super_admin') notFound();

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
