import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getLowStockProducts } from '@/features/stock/services/stockService';

/**
 * GET /api/stock/low-stock
 * Retorna productos con stock por debajo del mínimo configurado. Admin
 * only, requiere la flag 'stock' (#122).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const products = await getLowStockProducts(ctx.supabase, ctx.storeId);
    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/stock/low-stock');
  }
});
