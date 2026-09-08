import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { categorySchema } from '@/features/products/schemas/categorySchemas';
import { listCategories, createCategory } from '@/features/products/services/categoryService';

/**
 * GET /api/categories
 * Returns all categories, optionally with their subcategories.
 * Public read (no admin required).
 * Query param: ?include=subcategories → returns CategoryWithSubcategories[]
 */
export const GET = createApiRoute()(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const includeSubcategories = searchParams.get('include') === 'subcategories';
    const data = await listCategories(ctx.supabase, ctx.storeId, { includeSubcategories });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, 'GET /api/categories');
  }
});

/**
 * POST /api/categories
 * Creates a new category. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const body = await ctx.request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const category = await createCategory(ctx.supabase, ctx.storeId, parsed.data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/categories');
  }
});
