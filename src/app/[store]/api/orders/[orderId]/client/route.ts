import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assignClientSchema } from '@/features/admin/schemas/clientSchemas';

type RouteParams = { params: Promise<{ orderId: string }> };

function parseOrderId(param: string) {
  const id = parseInt(param);
  return isNaN(id) ? null : id;
}

/**
 * PATCH /api/orders/[orderId]/client
 * Find-or-create a client by barrio+manzana_lote, then assign to the order.
 * Admin only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { orderId: orderIdParam } = await params;
    const orderId = parseOrderId(orderIdParam);
    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    const body = await request.json();
    const validation = assignClientSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { barrio, manzana_lote } = validation.data;
    const supabase = await createSupabaseServerClient();

    // Find-or-create: partial unique indexes can't be used with upsert onConflict,
    // so we do an explicit select-then-insert.
    let findQuery = supabase.from('clients').select('id, barrio, manzana_lote, display_code').eq('barrio', barrio);
    if (barrio === 'otros') {
      findQuery = manzana_lote
        ? findQuery.eq('manzana_lote', manzana_lote)
        : findQuery.is('manzana_lote', null);
    } else {
      findQuery = findQuery.eq('manzana_lote', manzana_lote!);
    }
    const findQuerySingle = findQuery.single();

    const { data: existing, error: findError } = await findQuerySingle;

    let client;

    if (existing) {
      client = existing;
    } else if (findError?.code === 'PGRST116') {
      // Not found — insert new client
      const { data: created, error: insertError } = await supabase
        .from('clients')
        .insert({ barrio, manzana_lote: manzana_lote ?? null })
        .select('id, barrio, manzana_lote, display_code')
        .single();

      if (insertError) {
        console.error('Error creating client:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      client = created;
    } else {
      console.error('Error finding client:', findError);
      return NextResponse.json({ error: findError?.message ?? 'Error buscando cliente' }, { status: 500 });
    }

    // Assign client to order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ client_id: client.id })
      .eq('id', orderId)
      .select('id, client_id')
      .single();

    if (updateError) {
      console.error('Error assigning client to order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ...updatedOrder, client });
  } catch (error) {
    console.error('Error in PATCH /api/orders/[orderId]/client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/[orderId]/client
 * Remove client assignment from an order. Admin only.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { orderId: orderIdParam } = await params;
    const orderId = parseOrderId(orderIdParam);
    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('orders')
      .update({ client_id: null })
      .eq('id', orderId);

    if (error) {
      console.error('Error removing client from order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]/client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
