import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()),
});

/**
 * PUT /api/categories/reorder
 * Updates sort_order for all categories based on the provided ordered array.
 * Position in the array = sort_order (1-based). Admin only.
 *
 * Body: { orderedIds: number[] }
 */
export const PUT = withStoreAdmin(async (request, { storeId }) => {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Update each category's sort_order based on its position in the array.
    // .eq('store_id', storeId) además de la RLS: evita reordenar categorías
    // de otra Store aunque el cliente mande sus ids.
    await Promise.all(
      parsed.data.orderedIds.map((id, index) =>
        supabase
          .from('categories')
          .update({ sort_order: index + 1 })
          .eq('id', id)
          .eq('store_id', storeId)
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in PUT /api/categories/reorder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
