import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PUT /api/orders/[orderId]/confirm
 * Confirm an order. Admin only.
 * Uses the confirm_order RPC function to enforce business rules.
 */
export const PUT = withStoreAdmin<{ orderId: string }>(async (_request, { storeId, userId }, { params }) => {
  try {
    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // confirm_order es SECURITY DEFINER y bypassea RLS — la RLS puente de
    // #16 no lo frena, así que la verificación de que la orden pertenece a
    // esta Store tiene que hacerse acá, antes de invocar el RPC.
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const { data, error } = await supabase.rpc('confirm_order', {
      p_order_id: orderId,
      p_confirmed_by: userId,
    });

    if (error) {
      console.error('Error confirming order:', error);
      // Check for known business rule errors
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        );
      }
      if (error.message.includes('not pending')) {
        return NextResponse.json(
          { error: 'Solo se pueden confirmar ordenes pendientes' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/orders/[orderId]/confirm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
