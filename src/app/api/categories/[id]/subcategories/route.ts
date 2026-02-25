import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createSubcategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

/**
 * GET /api/categories/[id]/subcategories
 * Returns all subcategories for a given category. Public read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, category_id, created_at, updated_at')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching subcategories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/categories/[id]/subcategories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/categories/[id]/subcategories
 * Creates a new subcategory under the given category. Admin only.
 */
export async function POST(
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
    const parsed = createSubcategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('subcategories')
      .insert({ name: parsed.data.name, category_id: categoryId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una subcategoría con ese nombre en esta categoría' },
          { status: 409 }
        );
      }
      console.error('Error creating subcategory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/categories/[id]/subcategories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
