import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getStockHistory } from '@/features/stock/services/stockService';

/**
 * GET /api/stock/[productId]/history
 * Retorna el historial de movimientos de stock de un producto. Admin
 * only, requiere la flag 'stock' (#122).
 */
export const GET = createApiRoute<{ productId: string }>(requireAdmin, requireFlag('stock'))(async (ctx, { productId: productIdParam }) => {
  try {
    const productId = parseInt(productIdParam, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'ID de producto invalido' }, { status: 400 });
    }

    const history = await getStockHistory(ctx.supabase, ctx.storeId, productId);
    return NextResponse.json(history, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/stock/[productId]/history');
  }
});
