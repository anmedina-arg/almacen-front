import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getTopProducts } from '@/features/ranking/services/rankingService';

export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const categoryId = searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : null;
    const metric = searchParams.get('metric') === 'revenue' ? 'revenue' : 'units';

    const products = await getTopProducts(ctx.supabase, ctx.storeId, { startDate, endDate, limit, categoryId, metric });
    return NextResponse.json(products);
  } catch (error) {
    return handleServiceError(error, 'GET /api/ranking');
  }
});
