import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getRotation } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/rotation
 * Admin only, requiere la flag 'stock' (#126 — antes no se chequeaba en
 * ningún lado, ni UI ni server).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('stock'))(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const days = Math.min(Number(searchParams.get('days') ?? 7), 365);

    const result = await getRotation(ctx.supabase, ctx.storeId, days);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/rotation');
  }
});
