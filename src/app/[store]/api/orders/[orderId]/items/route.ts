import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { addOrderItemSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * POST /api/orders/[orderId]/items
 * Add a new item to an existing order. Admin only.
 */
export const POST = withStoreAdmin<{ orderId: string }>(async (request, { storeId }, { params }) => {
  try {
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

    // First verify the order exists, belongs to this Store, and is editable (pending)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('store_id', storeId)
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

    // Fetch product cost to calculate unit_cost (same formula as order creation)
    // #103: el producto tiene que pertenecer a esta Store — antes, si no
    // pertenecía, seguía igual con unit_cost=0 en vez de cortar, dejando
    // insertar un ítem de otra tienda. El trigger validate_order_item_store
    // ya lo bloquearía a nivel de base, pero acá cortamos antes con un
    // mensaje claro en vez de dejar que reviente como error 500 genérico.
    const { data: product } = await supabase
      .from('products')
      .select('price, cost')
      .eq('id', validation.data.product_id)
      .eq('store_id', storeId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado en esta Store' },
        { status: 400 }
      );
    }

    const unit_cost =
      Number(product.price) > 0
        ? validation.data.unit_price * (Number(product.cost ?? 0) / Number(product.price))
        : 0;

    // Insert the new item
    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: validation.data.product_id,
        product_name: validation.data.product_name,
        quantity: validation.data.quantity,
        unit_price: validation.data.unit_price,
        unit_cost,
        is_by_weight: validation.data.is_by_weight,
        store_id: storeId,
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
});
