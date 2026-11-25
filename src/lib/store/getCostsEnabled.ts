import type { RouteContext } from '@/lib/api/createApiRoute';
import { getStoreFeatureFlags } from './getStoreFeatureFlags';

/**
 * Si la Store de la ruta tiene el módulo `costos` (ADR-0018). Las rutas que
 * devuelven o aceptan Costo y margen la llaman una vez y le pasan el resultado
 * al servicio: sin el módulo el Costo ni se devuelve ni se guarda. Una sola
 * lectura por request, comparte el cache() de getStoreFeatureFlags.
 */
export async function getCostsEnabled(ctx: Pick<RouteContext, 'supabase' | 'storeSlug'>): Promise<boolean> {
  return (await getStoreFeatureFlags(ctx.supabase, ctx.storeSlug)).costos;
}
