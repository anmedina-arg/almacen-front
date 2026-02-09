import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateOrderItemSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * DELETE /api/orders/[orderId]/items/[itemId]
 * Remove an item from an order. Admin only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { orderId: orderIdParam, itemId: itemIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    const itemId = parseInt(itemIdParam);
    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: 'ID invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify order is pending
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Solo se pueden editar ordenes pendientes' },
        { status: 400 }
      );
    }

    // Delete the item
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
      .eq('order_id', orderId);

    if (error) {
      console.error('Error deleting order item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[orderId]/items/[itemId]
 * Update an order item (quantity, unit_price). Admin only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { orderId: orderIdParam, itemId: itemIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    const itemId = parseInt(itemIdParam);
    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: 'ID invalido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = updateOrderItemSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Datos invalidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify order is pending
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Solo se pueden editar ordenes pendientes' },
        { status: 400 }
      );
    }

    // Update the item
    const { data, error } = await supabase
      .from('order_items')
      .update(validation.data)
      .eq('id', itemId)
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/orders/[orderId]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
