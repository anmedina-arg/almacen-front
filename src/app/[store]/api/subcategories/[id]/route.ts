import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSubcategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

/**
 * PUT /api/subcategories/[id]
 * Updates a subcategory's name. Admin only.
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
    const subcategoryId = parseInt(id, 10);
    if (isNaN(subcategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSubcategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('subcategories')
      .update({ name: parsed.data.name })
      .eq('id', subcategoryId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una subcategoría con ese nombre en esta categoría' },
          { status: 409 }
        );
      }
      console.error('Error updating subcategory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/subcategories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/subcategories/[id]
 * Deletes a subcategory. Admin only.
 */
export async function DELETE(
  _request: NextRequest,
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
    const subcategoryId = parseInt(id, 10);
    if (isNaN(subcategoryId)) {
      return NextResponse.json({ error: 'Invalid subcategory id' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId);

    if (error) {
      console.error('Error deleting subcategory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/subcategories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
