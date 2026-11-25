import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { STOCK_VALUE_FLAGS } from '@/lib/store/featureFlags';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockProducts } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/stock-products
 * Admin only. Valor del stock al costo (widget compuesto, ADR-0018): requiere las flags
 * 'stock' y 'costos' (#126, #187).
 */
export const GET = createApiRoute(requireAdmin, ...STOCK_VALUE_FLAGS.map(requireFlag))(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const category = searchParams.get('category');
    if (!category) {
      return NextResponse.json({ error: 'Missing category param' }, { status: 400 });
    }

    const result = await getStockProducts(ctx.supabase, ctx.storeId, category);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/stock-products');
  }
});
