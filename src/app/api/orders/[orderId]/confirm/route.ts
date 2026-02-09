import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PUT /api/orders/[orderId]/confirm
 * Confirm an order. Admin only.
 * Uses the confirm_order RPC function to enforce business rules.
 */
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { isAdmin, userId, error: authError } = await verifyAdminAuth();
    if (!isAdmin || !userId) {
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
}
