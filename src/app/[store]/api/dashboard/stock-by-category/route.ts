import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockByCategory } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/stock-by-category
 * Admin only, requiere la flag 'stock' (#126).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const result = await getStockByCategory(ctx.supabase, ctx.storeId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/stock-by-category');
  }
});
