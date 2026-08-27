import { NextRequest, NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { familiaSchema } from '@/features/admin/schemas/familiaSchemas';

/**
 * GET /api/familias
 * Returns all familias, optionally with their variedades.
 * Public read (no admin required) — el catálogo público necesita listar
 * Variedades disponibles para un Producto Surtido sin login.
 * Query param: ?include=variedades → returns FamiliaWithVariedades[]
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
    const includeVariedades = searchParams.get('include') === 'variedades';

    let query = supabase.from('familias').select(
      includeVariedades
        ? 'id, name, created_at, updated_at, variedades(id, name, familia_id, active, created_at, updated_at)'
        : 'id, name, created_at, updated_at'
    );

    query = query.eq('store_id', storeId).order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching familias:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/familias:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/familias
 * Creates a new familia. Admin only.
 */
export const POST = withStoreAdmin(async (request, { storeId }) => {
  try {
    const body = await request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('familias')
      .insert({ name: parsed.data.name, store_id: storeId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una familia con ese nombre' }, { status: 409 });
      }
      console.error('Error creating familia:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/familias:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
