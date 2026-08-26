import { NextRequest, NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { categorySchema } from '@/features/admin/schemas/categorySchemas';

/**
 * GET /api/categories
 * Returns all categories, optionally with their subcategories.
 * Public read (no admin required).
 * Query param: ?include=subcategories → returns CategoryWithSubcategories[]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  try {
    const { store } = await params;
    const supabase = await createSupabaseServerClient();
    const storeId = await getStoreIdBySlug(supabase, store);
    if (storeId == null) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeSubcategories = searchParams.get('include') === 'subcategories';

    let query = supabase.from('categories').select(
      includeSubcategories
        ? 'id, name, image_url, sort_order, created_at, updated_at, subcategories(id, name, category_id, sort_order, created_at, updated_at)'
        : 'id, name, image_url, sort_order, created_at, updated_at'
    );

    query = query.eq('store_id', storeId).order('sort_order', { ascending: true });

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
export const POST = withStoreAdmin(async (request, { storeId }) => {
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Assign sort_order = MAX(sort_order) + 1 dentro de esta Store so new
    // categories appear at the end de su propia lista.
    const { data: maxRow } = await supabase
      .from('categories')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: parsed.data.name, image_url: parsed.data.image_url ?? null, sort_order: nextSortOrder, store_id: storeId })
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
});
