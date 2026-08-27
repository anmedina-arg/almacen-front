import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { variedadSchema } from '@/features/admin/schemas/familiaSchemas';

/**
 * POST /api/familias/[id]/variedades
 * Creates a new variedad under the given familia. Admin only.
 */
export const POST = withStoreAdmin<{ id: string }>(async (request, { storeId }, { params }) => {
  try {
    const { id } = await params;
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = variedadSchema.safeParse({ ...body, familia_id: familiaId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // La Familia padre debe pertenecer a esta Store — si no, un admin de
    // otra Store podría colgar una Variedad de una Familia ajena. La FK
    // compuesta ya lo garantiza a nivel de schema (ver variedades.sql,
    // #103) — esto es solo para devolver un 404 claro en vez de que el
    // INSERT reviente con un error de FK genérico.
    const { data: parentFamilia } = await supabase
      .from('familias')
      .select('id')
      .eq('id', familiaId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!parentFamilia) {
      return NextResponse.json({ error: 'Familia not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('variedades')
      .insert({ name: parsed.data.name, familia_id: familiaId, store_id: storeId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una variedad con ese nombre en esta familia' },
          { status: 409 }
        );
      }
      console.error('Error creating variedad:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/familias/[id]/variedades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
