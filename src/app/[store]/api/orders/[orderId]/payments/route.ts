import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { setPaymentsSchema } from '@/features/admin/schemas/paymentSchemas';

function parseOrderId(param: string) {
  const id = parseInt(param);
  return isNaN(id) ? null : id;
}

/**
 * PUT /api/orders/[orderId]/payments
 * Replace all payment records for an order. Admin only.
 * Body: { payments: [{ method, amount? }], order_total: number }
 */
export const PUT = withStoreAdmin<{ orderId: string }>(async (request, { storeId }, { params }) => {
  try {
    const { orderId: orderIdParam } = await params;
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
});
