import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockValueHistory } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/stock-value-history
 * Admin only, requiere la flag 'stock' (#126).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const result = await getStockValueHistory(ctx.supabase, ctx.storeId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/stock-value-history');
  }
});
