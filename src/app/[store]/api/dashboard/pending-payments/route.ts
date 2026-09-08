import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getPendingPayments } from '@/features/dashboard/services/dashboardService';

/**
 * GET /api/dashboard/pending-payments
 * Admin only, requiere la flag 'pagos' (#126 — antes solo se ocultaba el
 * widget en la UI cliente, la ruta funcionaba igual sin la flag).
 */
export const GET = createApiRoute(requireAdmin, requireFlag('pagos'))(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));

    const result = await getPendingPayments(ctx.supabase, ctx.storeId, page);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/dashboard/pending-payments');
  }
});
