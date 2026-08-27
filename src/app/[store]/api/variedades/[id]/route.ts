import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateVariedadSchema } from '@/features/admin/schemas/familiaSchemas';

/**
 * PUT /api/variedades/[id]
 * Updates a variedad's name and/or active state (rename y toggle
 * activar/desactivar comparten este mismo endpoint — no hay DELETE acá a
 * propósito, ver AC de #93: "alta/edición/deshabilitación", no "baja").
 * Admin only.
 */
export const PUT = withStoreAdmin<{ id: string }>(async (request, { storeId }, { params }) => {
  try {
    const { id } = await params;
    const variedadId = parseInt(id, 10);
    if (isNaN(variedadId)) {
      return NextResponse.json({ error: 'Invalid variedad id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateVariedadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('variedades')
      .update(updates)
      .eq('id', variedadId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una variedad con ese nombre en esta familia' },
          { status: 409 }
        );
      }
      console.error('Error updating variedad:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/variedades/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
