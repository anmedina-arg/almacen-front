import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getRotationSnapshots } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/rotation/snapshots
 * Admin only, requiere la flag 'stock' (#126).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const productId = Number(searchParams.get('product_id'));
    if (!productId) {
      return NextResponse.json({ error: 'product_id requerido' }, { status: 400 });
    }

    const snapshots = await getRotationSnapshots(ctx.supabase, ctx.storeId, productId);
    return NextResponse.json(snapshots);
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/rotation/snapshots');
  }
});
