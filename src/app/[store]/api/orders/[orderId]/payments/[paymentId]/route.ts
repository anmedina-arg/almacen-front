import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * DELETE /api/orders/[orderId]/payments/[paymentId]
 * Remove one payment from an order. Admin only.
 * If the remaining payment has an amount, it is cleared (single method = full order total).
 */
export const DELETE = withStoreAdmin<{ orderId: string; paymentId: string }>(async (_request, { storeId }, { params }) => {
  try {
    const { orderId: orderIdParam, paymentId: paymentIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    const paymentId = parseInt(paymentIdParam);

    if (isNaN(orderId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

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

    // Delete the specified payment
    const { error: deleteError } = await supabase
      .from('order_payments')
      .delete()
      .eq('id', paymentId)
      .eq('order_id', orderId); // safety: ensure it belongs to this order

    if (deleteError) {
      console.error('Error deleting payment:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // If a payment remains, clear its amount (now it covers the full order total)
    const { error: clearError } = await supabase
      .from('order_payments')
      .update({ amount: null })
      .eq('order_id', orderId);

    if (clearError) {
      console.error('Error clearing remaining payment amount:', clearError);
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]/payments/[paymentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
