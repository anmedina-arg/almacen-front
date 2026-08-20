import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    // El combo tiene que pertenecer a la Store del caller — evita que un
    // admin de otra Store lea componentes de un combo ajeno adivinando el id.
    const { data: combo } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!combo) {
      return NextResponse.json({ error: 'Combo not found in this store' }, { status: 404 });
    }

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

    // El combo tiene que pertenecer a la Store del caller.
    const { data: combo } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!combo) {
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

    // Replace all existing components
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
