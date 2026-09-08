import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { refreshAffinitySchema } from '@/features/recomendaciones/schemas/recommendationSchemas';
import { refreshProductAffinity } from '@/features/recomendaciones/services/recommendationService';

/**
 * POST /api/admin/recommendations/refresh
 * Recalculates product affinity matrix from order co-occurrences (last 30 days).
 * Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const parsed = refreshAffinitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await refreshProductAffinity(ctx.supabase, ctx.storeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleServiceError(error, 'POST /api/admin/recommendations/refresh');
  }
});
