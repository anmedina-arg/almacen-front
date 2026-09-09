import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { categorySchema } from '@/features/products/schemas/categorySchemas';
import { updateCategory, deleteCategory } from '@/features/products/services/categoryService';
import { productMetadataTag } from '@/lib/cache/tags';

/**
 * PUT /api/categories/[id]
 * Updates a category's name. Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const category = await updateCategory(ctx.supabase, ctx.storeId, categoryId, parsed.data);
    // category_name viaja embebido en la metadata cacheada de cada
    // producto de esta categoría (#145, code review) — sin esto, un
    // rename quedaría desactualizado en el catálogo público hasta que
    // algo no relacionado (un producto editado) invalide el cache.
    revalidateTag(productMetadataTag(ctx.storeId));
    return NextResponse.json(category);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/categories/[id]');
  }
});

/**
 * DELETE /api/categories/[id]
 * Deletes a category. Subcategories are deleted via ON DELETE CASCADE. Admin only.
 */
export const DELETE = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    await deleteCategory(ctx.supabase, ctx.storeId, categoryId);
    revalidateTag(productMetadataTag(ctx.storeId));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/categories/[id]');
  }
});
