import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { categorySchema } from '@/features/admin/schemas/categorySchemas';

/**
 * GET /api/categories
 * Returns all categories, optionally with their subcategories.
 * Public read (no admin required).
 * Query param: ?include=subcategories → returns CategoryWithSubcategories[]
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const includeSubcategories = searchParams.get('include') === 'subcategories';

    let query = supabase.from('categories').select(
      includeSubcategories
        ? 'id, name, created_at, updated_at, subcategories(id, name, category_id, created_at, updated_at)'
        : 'id, name, created_at, updated_at'
    );

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Creates a new category. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: parsed.data.name })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
      }
      console.error('Error creating category:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
