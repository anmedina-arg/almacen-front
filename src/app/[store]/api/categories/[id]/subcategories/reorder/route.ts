import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()),
});

/**
 * PUT /api/categories/[id]/subcategories/reorder
 * Updates sort_order for all subcategories of a category.
 * Position in the array = sort_order (1-based). Admin only.
 *
 * Body: { orderedIds: number[] }
 */
export const PUT = withStoreAdmin<{ id: string }>(async (request, { storeId }, { params }) => {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    await Promise.all(
      parsed.data.orderedIds.map((subId, index) =>
        supabase
          .from('subcategories')
          .update({ sort_order: index + 1 })
          .eq('id', subId)
          .eq('category_id', categoryId) // safety: only update subcategories that belong to this category
          .eq('store_id', storeId)
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in PUT /api/categories/[id]/subcategories/reorder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
