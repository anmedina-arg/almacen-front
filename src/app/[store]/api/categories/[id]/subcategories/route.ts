import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { subcategoryNameSchema } from '@/features/products/schemas/categorySchemas';
import { listSubcategories, createSubcategory } from '@/features/products/services/categoryService';

/**
 * GET /api/categories/[id]/subcategories
 * Returns all subcategories for a given category. Public read.
 */
export const GET = createApiRoute<{ id: string }>()(async (ctx, { id }) => {
  try {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const data = await listSubcategories(ctx.supabase, ctx.storeId, categoryId);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, 'GET /api/categories/[id]/subcategories');
  }
});

/**
 * POST /api/categories/[id]/subcategories
 * Creates a new subcategory under the given category. Admin only.
 */
export const POST = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = subcategoryNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const subcategory = await createSubcategory(ctx.supabase, ctx.storeId, categoryId, parsed.data.name);
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/categories/[id]/subcategories');
  }
});
