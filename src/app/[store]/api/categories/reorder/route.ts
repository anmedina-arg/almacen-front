import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { reorderSchema } from '@/features/products/schemas/categorySchemas';
import { reorderCategories } from '@/features/products/services/categoryService';

/**
 * PUT /api/categories/reorder
 * Updates sort_order for all categories based on the provided ordered array.
 * Position in the array = sort_order (1-based). Admin only.
 *
 * Body: { orderedIds: number[] }
 */
export const PUT = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await reorderCategories(ctx.supabase, ctx.storeId, parsed.data.orderedIds);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'PUT /api/categories/reorder');
  }
});
