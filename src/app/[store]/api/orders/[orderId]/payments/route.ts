import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { setPaymentsSchema } from '@/features/admin/schemas/paymentSchemas';

type RouteParams = { params: Promise<{ store: string; orderId: string }> };

function parseOrderId(param: string) {
  const id = parseInt(param);
  return isNaN(id) ? null : id;
}

/**
 * PUT /api/orders/[orderId]/payments
 * Replace all payment records for an order. Admin only.
 * Body: { payments: [{ method, amount? }], order_total: number }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { store, orderId: orderIdParam } = await params;
    const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
    if (!isStoreAdmin || storeId == null) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const orderId = parseOrderId(orderIdParam);
    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    const body = await request.json();
    const validation = setPaymentsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { payments } = validation.data;
    const supabase = await createSupabaseServerClient();

    // Verify order belongs to this Store
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Replace: delete existing then insert new (in a single transaction via RPC isn't needed;
    // delete + insert is safe here since this is an admin-only operation)
    const { error: deleteError } = await supabase
      .from('order_payments')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      console.error('Error deleting existing payments:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { data, error: insertError } = await supabase
      .from('order_payments')
      .insert(
        payments.map((p) => ({
          order_id: orderId,
          method: p.method,
          amount: p.amount ?? null,
          store_id: storeId,
        }))
      )
      .select('id, order_id, method, amount, created_at');

    if (insertError) {
      console.error('Error inserting payments:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/orders/[orderId]/payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
