import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { categorySchema } from '@/features/admin/schemas/categorySchemas';

/**
 * PUT /api/categories/[id]
 * Updates a category's name. Admin only.
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
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categories')
      .update({ name: parsed.data.name })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
      }
      console.error('Error updating category:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/categories/[id]
 * Deletes a category. Subcategories are deleted via ON DELETE CASCADE. Admin only.
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
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
