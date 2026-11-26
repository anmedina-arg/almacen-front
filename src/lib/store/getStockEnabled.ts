import type { RouteContext } from '@/lib/api/createApiRoute';
import { getStoreFeatureFlags } from './getStoreFeatureFlags';

/**
 * Si la Store de la ruta tiene el módulo `stock` (ADR-0012). Las rutas que
 * aceptan o devuelven el máximo de stock (#184) la llaman una vez y le pasan el
 * resultado al servicio. Comparte el cache() de getStoreFeatureFlags, así que no
 * suma lecturas por request.
 */
export async function getStockEnabled(ctx: Pick<RouteContext, 'supabase' | 'storeSlug'>): Promise<boolean> {
  return (await getStoreFeatureFlags(ctx.supabase, ctx.storeSlug)).stock;
}
