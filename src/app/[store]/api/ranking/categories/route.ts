import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getTopCategories } from '@/features/ranking/services/rankingService';

export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;
    const limit = parseInt(searchParams.get('limit') || '10');

    const categories = await getTopCategories(ctx.supabase, ctx.storeId, { startDate, endDate, limit });
    return NextResponse.json(categories);
  } catch (error) {
    return handleServiceError(error, 'GET /api/ranking/categories');
  }
});
