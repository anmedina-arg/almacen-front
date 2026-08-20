import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Confirma que el combo pertenece a la Store del caller. `combo_product_id`
 * es FK a products.id, ya scoped por Store desde #15 — una vez que esto
 * pasa, cualquier query posterior filtrada por ese id (en vez de por
 * combo_components.store_id de nuevo) ya está transitivamente scoped, sin
 * necesidad de un filtro redundante.
 */
async function comboBelongsToStore(
  supabase: SupabaseClient,
  comboId: number,
  storeId: number
): Promise<boolean> {
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('id', comboId)
    .eq('store_id', storeId)
    .maybeSingle();
  return data != null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string; id: string }> }
) {
  try {
    const { store, id: idParam } = await params;
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid combo ID' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Evita que un admin de otra Store lea componentes de un combo ajeno
    // adivinando el id.
    if (!(await comboBelongsToStore(supabase, id, storeId))) {
      return NextResponse.json({ error: 'Combo not found in this store' }, { status: 404 });
    }

    // Filtra por combo_product_id, no por combo_components.store_id — ver
    // comboBelongsToStore(): ese id ya quedó confirmado como propio de esta
    // Store arriba, un filtro extra acá sería redundante.
    const { data, error } = await supabase
      .from('combo_components')
      .select(
        `
        id,
        combo_product_id,
        component_product_id,
        quantity,
        products!combo_components_component_product_id_fkey(name, price, cost)
      `
      )
      .eq('combo_product_id', id)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching combo components:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const components = (data ?? []).map((row) => {
      const product = (row.products as unknown) as { name: string; price: number; cost: number } | null;
      return {
        id: row.id,
        combo_product_id: row.combo_product_id,
        component_product_id: row.component_product_id,
        quantity: row.quantity,
        component_product_name: product?.name ?? null,
        component_product_price: product?.price ?? null,
        component_product_cost: product?.cost ?? null,
      };
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error('Error in GET /api/combos/[id]/components:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ store: string; id: string }> }
) {
  try {
    const { store, id: idParam } = await params;
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid combo ID' }, { status: 400 });
    }

    const body = await request.json();
    const { components } = body;

    if (!Array.isArray(components)) {
      return NextResponse.json({ error: 'components must be an array' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    if (!(await comboBelongsToStore(supabase, id, storeId))) {
      return NextResponse.json({ error: 'Combo not found in this store' }, { status: 404 });
    }

    // Cada componente también tiene que pertenecer a la misma Store — evita
    // que un combo termine referenciando el producto de otra Store como
    // componente.
    if (components.length > 0) {
      const componentIds = (components as { component_product_id: number }[]).map(
        (c) => c.component_product_id
      );
      const { data: ownComponents } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .in('id', componentIds);

      const ownIds = new Set((ownComponents ?? []).map((p) => p.id));
      const foreignId = componentIds.find((cid) => !ownIds.has(cid));
      if (foreignId != null) {
        return NextResponse.json(
          { error: `Component product not found in this store: ${foreignId}` },
          { status: 400 }
        );
      }
    }

    // Replace all existing components. Filtra por combo_product_id, no por
    // combo_components.store_id — mismo motivo que en el GET, ya validado
    // arriba vía comboBelongsToStore().
    const { error: deleteError } = await supabase
      .from('combo_components')
      .delete()
      .eq('combo_product_id', id);

    if (deleteError) {
      console.error('Error deleting combo components:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (components.length > 0) {
      const rows = components.map((c: { component_product_id: number; quantity: number }) => ({
        combo_product_id: id,
        component_product_id: c.component_product_id,
        quantity: c.quantity,
        store_id: storeId,
      }));

      const { error: insertError } = await supabase
        .from('combo_components')
        .insert(rows);

      if (insertError) {
        console.error('Error inserting combo components:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Components updated successfully' });
  } catch (error) {
    console.error('Error in PUT /api/combos/[id]/components:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
