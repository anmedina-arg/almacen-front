import type { RouteContext } from '@/lib/api/createApiRoute';
import { getCostsEnabled } from '@/lib/store/getCostsEnabled';
import { getStockEnabled } from '@/lib/store/getStockEnabled';
import type { ImportModules } from './validateImport';

/**
 * Los módulos de la Store de la ruta que suman columnas a la Importación masiva (#188).
 * Una sola lectura de flags por request: las dos funciones comparten el cache() de
 * getStoreFeatureFlags.
 */
export async function getImportModules(ctx: Pick<RouteContext, 'supabase' | 'storeSlug'>): Promise<ImportModules> {
  return { costos: await getCostsEnabled(ctx), stock: await getStockEnabled(ctx) };
}
