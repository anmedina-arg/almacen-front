import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

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
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in PUT /api/categories/[id]/subcategories/reorder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
