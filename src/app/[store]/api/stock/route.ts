import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getAllProductsWithStock } from '@/features/stock/services/stockService';

/**
 * GET /api/stock
 * Retorna todos los productos con su nivel de stock. Admin only, requiere
 * la flag 'stock' (#122 — antes no se aplicaba server-side, solo ocultaba
 * UI en el nav admin).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const stock = await getAllProductsWithStock(ctx.supabase, ctx.storeId);
    return NextResponse.json(stock, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/stock');
  }
});
