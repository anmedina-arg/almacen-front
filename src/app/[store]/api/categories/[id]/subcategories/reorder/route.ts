import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { reorderSchema } from '@/features/products/schemas/categorySchemas';
import { reorderSubcategories } from '@/features/products/services/categoryService';

/**
 * PUT /api/categories/[id]/subcategories/reorder
 * Updates sort_order for all subcategories of a category.
 * Position in the array = sort_order (1-based). Admin only.
 *
 * Body: { orderedIds: number[] }
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await reorderSubcategories(ctx.supabase, ctx.storeId, categoryId, parsed.data.orderedIds);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'PUT /api/categories/[id]/subcategories/reorder');
  }
});
