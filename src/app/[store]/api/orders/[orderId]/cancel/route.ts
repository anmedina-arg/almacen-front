import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PUT /api/orders/[orderId]/cancel
 * Cancel an order and return its stock. Admin only.
 * Uses the cancel_order RPC to atomically return stock and update status.
 */
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('cancel_order', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error cancelling order:', error);
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        );
      }
      if (error.message.includes('already cancelled')) {
        return NextResponse.json(
          { error: 'La orden ya está cancelada' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/orders/[orderId]/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
