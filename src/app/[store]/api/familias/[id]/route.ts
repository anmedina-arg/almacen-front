import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { familiaSchema } from '@/features/admin/schemas/familiaSchemas';

/**
 * PUT /api/familias/[id]
 * Updates a familia's name. Admin only.
 */
export const PUT = withStoreAdmin<{ id: string }>(async (request, { storeId }, { params }) => {
  try {
    const { id } = await params;
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('familias')
      .update({ name: parsed.data.name })
      .eq('id', familiaId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una familia con ese nombre' }, { status: 409 });
      }
      console.error('Error updating familia:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/familias/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/familias/[id]
 * Deletes a familia. Variedades are deleted via ON DELETE CASCADE (#93).
 * Bloquea si algún producto sigue marcado como Producto Surtido de esta
 * Familia (products.familia_id no tiene cascade a propósito — ver
 * variedades.sql). Admin only.
 */
export const DELETE = withStoreAdmin<{ id: string }>(async (_request, { storeId }, { params }) => {
  try {
    const { id } = await params;
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('familias')
      .delete()
      .eq('id', familiaId)
      .eq('store_id', storeId);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'No se puede eliminar: todavía hay productos marcados como Producto Surtido de esta Familia' },
          { status: 409 }
        );
      }
      console.error('Error deleting familia:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/familias/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
