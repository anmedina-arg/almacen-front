import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { addOrderItemSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * POST /api/orders/[orderId]/items
 * Add a new item to an existing order. Admin only.
 */
export async function POST(
  request: NextRequest,
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

    const body = await request.json();

    // Validate with Zod schema
    const validation = addOrderItemSchema.safeParse(body);
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

    // First verify the order exists and is editable (pending)
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

    // Insert the new item
    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: validation.data.product_id,
        product_name: validation.data.product_name,
        quantity: validation.data.quantity,
        unit_price: validation.data.unit_price,
        is_by_weight: validation.data.is_by_weight,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding order item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/orders/[orderId]/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
