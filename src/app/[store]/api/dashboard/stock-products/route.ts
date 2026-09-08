import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockProducts } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/stock-products
 * Admin only, requiere la flag 'stock' (#126).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
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
