import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resuelve el id numérico de una Store a partir de su slug. Compartido por
 * todo lo que necesita filtrar/asociar por store_id server-side (rutas de
 * /[store]/api/*, la página pública del catálogo, resolveStoreAdminStatus)
 * — antes de #15 este mismo query se repetía inline en cada lugar.
 *
 * Envuelta en cache() (mismo patrón que fetchCategoriesWithSubs): dentro de
 * un mismo request, [store]/layout.tsx y [store]/page.tsx llaman esto con
 * el mismo client (supabaseServer, singleton) y el mismo slug, así que
 * comparten una sola query en vez de resolver el mismo lookup dos veces —
 * cache() memoiza por identidad del argumento, por eso el client tiene que
 * ser el mismo objeto, no una instancia nueva por caller.
 *
 * Sin 'server-only' a propósito (a diferencia de fetchPublicProducts.ts):
 * solo recibe un client ya creado, no crea uno ni toca secretos propios —
 * y roleHelpers.ts lo importa transitivamente desde un test de Vitest,
 * donde 'server-only' rompe el import fuera del bundling real de Next.js.
 */
export const getStoreIdBySlug = cache(async (
  supabase: SupabaseClient,
  slug: string
): Promise<number | null> => {
  const { data } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
});
