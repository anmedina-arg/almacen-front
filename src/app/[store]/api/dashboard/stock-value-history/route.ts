import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { STOCK_VALUE_FLAGS } from '@/lib/store/featureFlags';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockValueHistory } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/stock-value-history
 * Admin only. Valor del stock al costo (widget compuesto, ADR-0018): requiere las flags
 * 'stock' y 'costos' (#126, #187).
 */
export const GET = createApiRoute(requireAdmin, ...STOCK_VALUE_FLAGS.map(requireFlag))(async (ctx) => {
  try {
    const result = await getStockValueHistory(ctx.supabase, ctx.storeId);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/stock-value-history');
  }
});
