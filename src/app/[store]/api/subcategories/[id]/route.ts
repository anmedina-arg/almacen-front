import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { subcategoryNameSchema } from '@/features/products/schemas/categorySchemas';
import { updateSubcategory, deleteSubcategory } from '@/features/products/services/categoryService';

/**
 * PUT /api/subcategories/[id]
 * Updates a subcategory's name. Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const subcategoryId = parseInt(id, 10);
    if (isNaN(subcategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = subcategoryNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const subcategory = await updateSubcategory(ctx.supabase, ctx.storeId, subcategoryId, parsed.data.name);
    return NextResponse.json(subcategory);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/subcategories/[id]');
  }
});

/**
 * DELETE /api/subcategories/[id]
 * Deletes a subcategory. Admin only.
 */
export const DELETE = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const subcategoryId = parseInt(id, 10);
    if (isNaN(subcategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory id' }, { status: 400 });
    }

    await deleteSubcategory(ctx.supabase, ctx.storeId, subcategoryId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/subcategories/[id]');
  }
});
