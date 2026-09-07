import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getRecommendations } from '@/features/recomendaciones/services/recommendationService';

/**
 * GET /api/recommendations
 * Público — recomendaciones del catálogo, sin login (excepción documentada
 * en docs/agents/admin-routes.md).
 *
 * #125: antes resolvía storeId a mano (getStoreIdBySlug) y devolvía `[]`
 * si la Store no existía, en vez de 404 — createApiRoute() unifica esto
 * con el resto de rutas públicas (products, orders), que sí devuelven 404
 * "Store not found". Cambio de comportamiento menor y de bajo riesgo real:
 * este endpoint solo lo llama el catálogo ya renderizado con una Store
 * válida.
 */
export const GET = createApiRoute()(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const productIds = searchParams.getAll('product_ids').map(Number).filter(Boolean);
    const excludeIds = searchParams.getAll('exclude_ids').map(Number).filter(Boolean);
    const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 10);

    if (productIds.length === 0) {
      return NextResponse.json([]);
    }

    const recommendations = await getRecommendations(ctx.supabase, ctx.storeId, { productIds, excludeIds, limit });
    return NextResponse.json(recommendations, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleServiceError(error, 'GET /api/recommendations');
  }
});
